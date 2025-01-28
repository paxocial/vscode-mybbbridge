// TemplateGroupManager.ts

import * as mysql from 'mysql2';
import { logToPHP } from './MyBBThemes';  // Ensure logging is accessible

export interface TemplateGroup {
    gid: number;
    prefix: string;
    title: string;
    isdefault: number;
}

export interface Template {
    tid: number;
    title: string;
    template: string;
    sid: number;
    version: string;
    status: string;
    dateline: number;
    group_name?: string;
    group_prefix?: string;
}

export class TemplateGroupManager {
    private static templateGroups: Map<string, TemplateGroup> = new Map();
    private static initialized: boolean = false;

    /**
     * Categorizes a template based on its prefix.
     * Only templates with 'global_' prefix are placed in 'Global Templates' folder.
     * All other templates are sorted based on their respective prefixes.
     * @param template The template to categorize.
     * @returns The group name as a string.
     */
    public static async categorizeTemplate(template: Template): Promise<string> {
        // Handle global templates first (sid = -2 and prefix 'global_')
        if (template.sid === -2 && template.title.startsWith('global_')) {
            return 'Global Templates';
        }

        // Get base prefix (everything before first underscore or whole name if no underscore)
        const basePrefix = this.getTemplatePrefix(template.title);
        
        // Check if this is a known group prefix
        const group = this.templateGroups.get(basePrefix);
        if (group) {
            return this.getGroupTitle(group.title);
        }

        // If not found in groups, try common prefixes
        return this.getStandardGroupName(template.title);
    }

    /**
     * Extracts the prefix from a template title.
     * @param title The title of the template.
     * @returns The prefix as a string.
     */
    private static getTemplatePrefix(title: string): string {
        return title.split('_')[0].toLowerCase(); // Extract prefix and normalize
    }

    /**
     * Determines the group name for global templates based on their prefix.
     * @param title The title of the global template.
     * @returns The group name as a string.
     */
    private static getGroupNameForGlobal(title: string): string {
        // Special handling for global templates
        const commonGlobals: { [key: string]: string } = {
            'global_header': 'Global Header Templates',
            'global_footer': 'Global Footer Templates',
            'global_error': 'Global Error Templates',
            'global_modal': 'Global Modal Templates',
            'global_nav': 'Global Navigation Templates'
            // Add more as needed
        };

        return commonGlobals[title] || 'Global Templates';
    }

    /**
     * Determines the standard group name based on common template patterns.
     * @param title The title of the template.
     * @returns The group name as a string.
     */
    private static getStandardGroupName(title: string): string {
        // Check for common template patterns
        const patterns = [
            { match: /^header_/, group: 'Header Templates' },
            { match: /^footer_/, group: 'Footer Templates' },
            { match: /^usercp_/, group: 'User CP Templates' },
            { match: /^modcp_/, group: 'Moderator CP Templates' },
            { match: /^admin_/, group: 'Admin Templates' },
            { match: /^forum_/, group: 'Forum Templates' },
            { match: /^member_/, group: 'Member Templates' },
            { match: /^post_/, group: 'Posting Templates' },
            { match: /^poll_/, group: 'Poll Templates' },
            { match: /^rating_/, group: 'Rating Templates' },
            { match: /^misc_/, group: 'Misc Templates' }
        ];

        for (const pattern of patterns) {
            if (pattern.match.test(title)) {
                return pattern.group;
            }
        }

        // If no match found, group by first prefix
        const prefix = this.getTemplatePrefix(title);
        return prefix ? `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Templates` : 'Misc Templates';
    }

    /**
     * Resolves a language string to its human-readable form
     * @param langKey The language key to resolve
     * @returns The resolved string or undefined if not found
     */
    public static resolveLangString(langKey: string): string | undefined {
        return this.langMap[langKey];
    }

    /**
     * Determines the group title from raw group name.
     * @param rawTitle The raw title of the group.
     * @returns The formatted group title.
     */
    private static getGroupTitle(rawTitle: string): string {
        if (rawTitle.startsWith('<lang:') && rawTitle.endsWith('>')) {
            const langKey = rawTitle.slice(6, -1);
            return this.resolveLangString(langKey) || 'Misc Templates';
        }
        return `${rawTitle} Templates`;
    }

    /**
     * Initializes the template groups by fetching them from the database.
     * @param connection The MySQL connection.
     * @param prefix The table prefix.
     */
    public static async initialize(connection: mysql.Connection, prefix: string): Promise<void> {
        if (this.initialized) return;
        
        // Load template groups in a single query
        const query = `SELECT * FROM ${prefix}templategroups ORDER BY gid ASC`;
        
        try {
            const [results] = await connection.promise().query<mysql.RowDataPacket[]>(query);
            results.forEach(row => {
                this.templateGroups.set(row.prefix, {
                    gid: row.gid,
                    prefix: row.prefix,
                    title: row.title,
                    isdefault: row.isdefault
                });
            });
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize template groups:', error);
            throw error;
        }
    }

    /**
     * Retrieves all templates within a set, categorized by groups.
     * @param connection The MySQL connection.
     * @param prefix The table prefix.
     * @param templateSet The name of the template set.
     * @returns A promise that resolves to an array of templates.
     */
    public static async getTemplatesWithGroups(connection: mysql.Connection, prefix: string, templateSet: string): Promise<Template[]> {
        await this.initialize(connection, prefix);
    
        // Modified query to get both theme-specific and all global templates
        const query = `
            SELECT t.*, ts.title as set_name
            FROM ${prefix}templates t
            LEFT JOIN ${prefix}templatesets ts ON t.sid = ts.sid
            WHERE t.sid = -2 OR ts.title = ?
            ORDER BY t.title ASC`;
    
        try {
            const [results] = await connection.promise().query<mysql.RowDataPacket[]>(query, [templateSet]);
    
            const templates: Template[] = [];
    
            for (const row of results) {
                const template: Template = {
                    tid: Number(row.tid),
                    title: String(row.title),
                    template: String(row.template),
                    sid: Number(row.sid),
                    version: String(row.version || ''),
                    status: String(row.status || ''),
                    dateline: Number(row.dateline || 0)
                };
    
                // Categorize template based on prefix
                template.group_name = await this.categorizeTemplate(template);
    
                templates.push(template);
            }
    
            return templates;
        } catch (error) {
            console.error('Failed to fetch templates:', error);
            throw error;
        }
    }

    /**
     * Mapping of language keys to human-readable group names.
     */
    private static langMap: { [key: string]: string } = {
        'group_calendar': "Calendar",
        'group_forumdisplay': "Forum Display",
        'group_index': "Index Page",
        'group_error': "Error Message",
        'group_memberlist': "Member List",
        'group_multipage': "Multipage Pagination",
        'group_private': "Private Messaging",
        'group_portal': "Portal",
        'group_postbit': "Post Bit",
        'group_posticons': "Post Icon",
        'group_showthread': "Show Thread",
        'group_usercp': "User Control Panel",
        'group_online': "Who's Online",
        'group_forumbit': "Forum Bit",
        'group_editpost': "Edit Post",
        'group_forumjump': "Forum Jump",
        'group_moderation': "Moderation",
        'group_nav': "Navigation",
        'group_search': "Search",
        'group_showteam': "Show Forum Team",
        'group_reputation': "Reputation",
        'group_newthread': "New Thread",
        'group_newreply': "New Reply",
        'group_member': "Member",
        'group_warning': "Warning System",
        'group_global': "Global",
        'group_header': "Header",
        'group_managegroup': "Manage Group",
        'group_misc': "Miscellaneous",
        'group_modcp': "Moderator Control Panel",
        'group_announcement': "Announcement",
        'group_polls': "Poll",
        'group_post': "Post",
        'group_printthread': "Print Thread",
        'group_report': "Report",
        'group_smilieinsert': "Smilie Inserter",
        'group_stats': "Statistics",
        'group_xmlhttp': "XMLHTTP",
        'group_footer': "Footer",
        'group_video': "Video MyCode",
        'group_sendthread': "Send Thread",
        'group_mycode': "MyCode"
    };
}
