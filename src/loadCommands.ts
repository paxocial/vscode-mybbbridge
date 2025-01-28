// loadCommands.ts

import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import path = require('path');
import * as mysql from 'mysql2';  

import { MyBBTemplateSet, MyBBStyle, logErrorToFile } from "./MyBBThemes";  // Import logErrorToFile
import { Template } from './TemplateGroupManager';
import { getWorkspacePath, makePath, getConfig, getConnexion } from './utils';
import { TemplateGroupManager } from './TemplateGroupManager';


interface TemplateSetRow extends mysql.RowDataPacket {
    sid: number;
    title: string;
}
interface TemplateContext {
    group: string;
    templates: string[];
}
interface TemplateGroupResult extends mysql.RowDataPacket {
    title: string;
    sid: number;
    group_name: string;
    template: string;
    master_template: string;
    tid: number;
}


// Add function to resolve group names using langMap
function resolveGroupName(name: string): string {
    // If it's a language string (e.g., <lang:group_calendar>)
    if (name.startsWith('<lang:') && name.endsWith('>')) {
        const langKey = name.slice(6, -1); // Remove '<lang:' and '>'
        const resolvedName = TemplateGroupManager.resolveLangString(langKey);
        return resolvedName ? `${resolvedName} Templates` : 'Ungrouped Templates';
    }
    return name;
}

/**
 * Command to load a template set from the MyBB database into the workspace.
 */
export async function loadTemplateSetCommand() {
    const config = await getConfig();
    const con = await getConnexion(config.database);

    let templateGroupMap = new Map<string, string>();
    
    try {
        // Try to load template context, but don't fail if it's not available
        try {
            const templateContextPath = path.join(__dirname, '../resources/templatecontext.json');
            const templateContext: TemplateContext[] = JSON.parse(
                await fs.readFile(templateContextPath, 'utf8')
            );
            
            // Create template group mapping
            templateContext.forEach(group => {
                group.templates.forEach(template => {
                    templateGroupMap.set(template, group.group);
                });
            });
        } catch (error) {
            console.log('Template context not found, falling back to database grouping');
        }

        const templateSetName = await vscode.window.showInputBox({ 
            placeHolder: 'Template set name (e.g. "Default Templates")',
            validateInput: (value) => {
                if (!value) {
                    return 'Template set name cannot be empty';
                }
                return null;
            }
        });
        if (templateSetName === undefined) {
            return;
        }

        const templateSet = new MyBBTemplateSet(templateSetName, con, config.database.prefix);
        const templateSetPath = path.join(getWorkspacePath(), 'template_sets', templateSet.name);
        await makePath(templateSetPath);

        // Get template set's sid
        const sidQuery = `SELECT sid FROM ${config.database.prefix}templatesets WHERE title = ?`;
        const [sidResult] = await con.promise().query<TemplateSetRow[]>(sidQuery, [templateSetName]);
        
        if (!sidResult || sidResult.length === 0) {
            throw new Error(`Template set "${templateSetName}" not found`);
        }

        const sid = sidResult[0].sid;

            // Query to get template groups from the database
            const groupQuery = `
            SELECT DISTINCT t.*, t.template as template,
                   m.template as master_template,
                   CASE 
                       WHEN t.title LIKE 'global_%' THEN 'Global Templates'
                       WHEN t.title LIKE 'header_%' THEN 'Header Templates'
                       WHEN t.title LIKE 'footer_%' THEN 'Footer Templates'
                       WHEN t.title LIKE 'usercp_%' THEN 'User CP Templates'
                       WHEN t.title LIKE 'pm_%' THEN 'Private Message Templates'
                       WHEN t.title LIKE 'modcp_%' THEN 'Moderator CP Templates'
                       WHEN t.title LIKE 'admin_%' THEN 'Admin Templates'
                       ELSE tg.title
                   END as group_name
            FROM ${config.database.prefix}templates t
            LEFT JOIN ${config.database.prefix}templategroups tg ON 
                t.title LIKE CONCAT(tg.prefix, '%')
            LEFT JOIN ${config.database.prefix}templates m ON 
                (m.title = t.title AND m.sid = -2)
            WHERE t.sid IN (-2, ?)
            ORDER BY t.title`;

const [groupResults] = await con.promise().query<TemplateGroupResult[]>(groupQuery, [sid]);

// Update the group mapping section
groupResults.forEach((result: TemplateGroupResult) => {
    if (!templateGroupMap.has(result.title)) {
        const groupName = result.group_name || 'Ungrouped Templates';
        const resolvedGroupName = resolveGroupName(groupName);
        // Check if template is modified from master
        if (result.master_template && result.template !== result.master_template) {
            // This template is modified from master - should appear green
            templateGroupMap.set(result.title, resolvedGroupName);
        } else if (!result.master_template && result.sid !== -2) {
            // This is a custom template with no master - should appear normal
            templateGroupMap.set(result.title, resolvedGroupName);
        } else {
            // This is either a master template or unmodified template
            templateGroupMap.set(result.title, resolvedGroupName);
        }
    }
});

        const templates = await templateSet.getElements();
        const groupedTemplates = new Map<string, Template[]>();

        // Group templates using combined mapping
        for (const template of templates) {
            let groupName = templateGroupMap.get(template.title) || 'Ungrouped Templates';
            
            if (!groupedTemplates.has(groupName)) {
                groupedTemplates.set(groupName, []);
            }
            const group = groupedTemplates.get(groupName);
            if (group) {
                group.push(template);
            }
        }

        // Create organized directory structure
        for (const [groupName, groupTemplates] of groupedTemplates) {
            const groupPath = path.join(templateSetPath, sanitizeGroupName(groupName));
            await makePath(groupPath);

            for (const template of groupTemplates) {
                if (template.title && template.template) {
                    const templatePath = path.join(groupPath, `${template.title}.html`);
                    await fs.writeFile(templatePath, template.template, 'utf8');
                }
            }
        }

        vscode.window.showInformationMessage(
            `${templates.length} templates were loaded and organized according to MyBB's structure.`
        );
    } catch (error) {
        if (error instanceof Error) {
            await logErrorToFile(error);
            vscode.window.showErrorMessage(`Failed to load templates: ${error.message}`);
        } else {
            const unknownError = new Error("Unknown error occurred while loading templates.");
            await logErrorToFile(unknownError);
            vscode.window.showErrorMessage(unknownError.message);
        }
    }
}

// Helper function to sanitize group names for file system
// Update the sanitizeGroupName function
function sanitizeGroupName(name: string): string {
    // First resolve any language strings
    const resolvedName = resolveGroupName(name);
    
    return resolvedName
        .replace(/[<>:"/\\|?*]/g, ' ') // Replace invalid chars with spaces
        .replace(/\s+/g, ' ')          // Convert multiple spaces to single space
        .trim();                       // Remove leading/trailing spaces
}

/**
 * Command to load a style from the MyBB database into the workspace.
 */
export async function loadStyleCommand() {
    const config = await getConfig();
    const con = await getConnexion(config.database);

    const styleName = await vscode.window.showInputBox({ 
        placeHolder: 'Style name (e.g. "My Custom Style")',
        validateInput: (value) => {
            if (!value) {
                return 'Style name cannot be empty';
            }
            // Allow any non-empty string, including spaces
            return null;
        }
    });
    if (styleName === undefined) {
        return;
    }
    const style = new MyBBStyle(styleName, con, config.database.prefix);

    const stylePath = path.join(getWorkspacePath(), 'styles', style.name);
    await makePath(stylePath);

    try {
        const stylesheets = await style.getElements();
        const stylePromises = stylesheets.map(async (stylesheet: any) => {
            let stylesheetPath = path.join(stylePath, stylesheet.name);
            await fs.writeFile(stylesheetPath, stylesheet.stylesheet, 'utf8');
        });
        await Promise.all(stylePromises);
        vscode.window.showInformationMessage(`${stylesheets.length} stylesheets were loaded.`);
    } catch (error) {
        if (error instanceof Error) {
            await logErrorToFile(error);
            vscode.window.showErrorMessage(`Failed to load stylesheets: ${error.message}`);
        } else {
            const unknownError = new Error("Unknown error occurred while loading stylesheets.");
            await logErrorToFile(unknownError);
            vscode.window.showErrorMessage(unknownError.message);
        }
    }
}