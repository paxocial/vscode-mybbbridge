import * as mysql from 'mysql2';

export interface TemplateGroup {
    gid: number;
    prefix: string;
    title: string;
    isdefault: number;
}

export interface Template {
    title: string;
    template: string;
    group_prefix?: string;
    group_title?: string;
    group_name?: string;
}

export class TemplateGroupManager {
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

    public static getGroupTitle(rawTitle: string): string {
        if (rawTitle.startsWith('<lang:') && rawTitle.endsWith('>')) {
            const langKey = rawTitle.slice(6, -1); // Remove <lang: and >
            return this.langMap[langKey] || langKey;
        }
        return rawTitle;
    }

    public static async getTemplateGroups(connection: mysql.Connection, prefix: string): Promise<Map<string, TemplateGroup>> {
        const query = `SELECT * FROM ${prefix}templategroups`;
        return new Promise((resolve, reject) => {
            connection.query(query, (err: mysql.QueryError | null, results: TemplateGroup[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                const groups = new Map<string, TemplateGroup>();
                results.forEach((row: TemplateGroup) => {
                    groups.set(row.prefix, row);
                });
                resolve(groups);
            });
        });
    }
}
