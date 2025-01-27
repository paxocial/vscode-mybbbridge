import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import path = require('path');

import { MyBBTemplateSet, MyBBStyle, logErrorToFile } from "./MyBBThemes";  // Import logErrorToFile
import { Template } from './TemplateGroupManager';
import { getWorkspacePath, makePath, getConfig, getConnexion } from './utils';

export async function loadTemplateSetCommand() {
    const config = await getConfig();
    const con = await getConnexion(config.database);

    const templateSetName = await vscode.window.showInputBox({ 
        placeHolder: 'Template set name (e.g. "Default Templates")',
        validateInput: (value) => {
            if (!value) {
                return 'Template set name cannot be empty';
            }
            // Allow any non-empty string, including spaces
            return null;
        }
    });
    if (templateSetName === undefined) {
        return;
    }
    const templateSet = new MyBBTemplateSet(templateSetName, con, config.database.prefix);

    const templateSetPath = path.join(getWorkspacePath(), 'template_sets', templateSet.name);
    await makePath(templateSetPath);

    try {
        const templates = await templateSet.getElements();
        const groupedTemplates = new Map<string, Template[]>();

        // Group templates by their group name
        templates.forEach((template: Template) => {
            const groupName = template.group_name || 'Ungrouped';
            if (!groupedTemplates.has(groupName)) {
                groupedTemplates.set(groupName, []);
            }
            const group = groupedTemplates.get(groupName);
            if (group) {
                group.push(template);
            }
        });

        // Create directories and save files
        for (const [groupName, groupTemplates] of groupedTemplates) {
            const groupPath = path.join(templateSetPath, groupName);
            await makePath(groupPath);

            for (const template of groupTemplates) {
                if (template.title && template.template) {
                    const templatePath = path.join(groupPath, `${template.title}.html`);
                    await fs.writeFile(templatePath, template.template);
                }
            }
        }

        vscode.window.showInformationMessage(`${templates.length} templates were loaded and organized.`);
    } catch (error) {
        if (error instanceof Error) {
            logErrorToFile(error);
            vscode.window.showErrorMessage(`Failed to load templates: ${error.message}`);
        } else {
            const unknownError = new Error("Unknown error occurred while loading templates.");
            logErrorToFile(unknownError);
            vscode.window.showErrorMessage(unknownError.message);
        }
    }
}

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
        stylesheets.forEach(async (stylesheet: any) => {
            let stylesheetPath = path.join(stylePath, stylesheet.name);
            await fs.writeFile(stylesheetPath, stylesheet.stylesheet);
        });
        vscode.window.showInformationMessage(`${stylesheets.length} stylesheets were loaded.`);
    } catch (error) {
        if (error instanceof Error) {
            logErrorToFile(error);
            vscode.window.showErrorMessage(`Failed to load stylesheets: ${error.message}`);
        } else {
            const unknownError = new Error("Unknown error occurred while loading stylesheets.");
            logErrorToFile(unknownError);
            vscode.window.showErrorMessage(unknownError.message);
        }
    }
}