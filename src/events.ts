// events.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig, getConnexion, getWorkspacePath } from './utils';
import { MyBBTemplateSet, MyBBStyle, logErrorToFile, logToPHP } from './MyBBThemes';

/**
 * Event handler for saving text documents. Automatically uploads templates and styles if configured.
 * @param document The text document that was saved.
 */
export async function onSaveEvent(document: vscode.TextDocument) {
    const config = await getConfig();

    if (config.autoUpload) {
        const docPath = document.uri.fsPath;
        const workspacePath = getWorkspacePath();
        const relativePath = path.relative(workspacePath, docPath);
        const pathParts = relativePath.split(path.sep);

        try {
            const con = await getConnexion(config.database);
            const ext = path.extname(docPath);
            
            // Handle templates in template_sets/{templateset}/{group}/{template}.html
            if (pathParts[0] === 'template_sets' && ext === '.html') {
                if (pathParts.length < 4) {
                    vscode.window.showErrorMessage("Template path is incomplete. Expected format: template_sets/{templateset}/{group}/{template}.html");
                    return;
                }

                const templateSetName = pathParts[1]; // Get template set name from path
                const groupName = pathParts[2]; // Get group name based on folder structure
                const fileName = path.basename(docPath, ext);
                
                if (templateSetName && groupName) {
                    const templateSet = new MyBBTemplateSet(templateSetName, con, config.database.prefix);
                    await templateSet.saveElement(fileName, document.getText(), config.mybbVersion);
                    await logToPHP(`Updated template "${fileName}" in set "${templateSetName}" within group "${groupName}"`);
                }
            }
            // Handle styles in styles/{theme}/{stylesheet}.css
            else if (pathParts[0] === 'styles' && ext === '.css') {
                if (pathParts.length < 3) {
                    vscode.window.showErrorMessage("Style path is incomplete. Expected format: styles/{theme}/{stylesheet}.css");
                    return;
                }

                const themeName = pathParts[1];
                const fileName = path.basename(docPath);
                
                if (themeName) {
                    const style = new MyBBStyle(themeName, con, config.database.prefix);
                    await style.saveElement(fileName, document.getText(), themeName);
                    await logToPHP(`Updated stylesheet "${fileName}" for theme "${themeName}"`);
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                await logErrorToFile(error);
                vscode.window.showErrorMessage(`Failed to handle save event: ${error.message}`);
            } else {
                const unknownError = new Error("Unknown error occurred while handling save event.");
                await logErrorToFile(unknownError);
                vscode.window.showErrorMessage(unknownError.message);
            }
        }
    }
}