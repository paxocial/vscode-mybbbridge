import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig, getConnexion, getWorkspacePath } from './utils';
import { MyBBTemplateSet, MyBBStyle, logErrorToFile, logToPHP } from './MyBBThemes';

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
            
            // Handle templates in template_sets/{templateset}/{prefix}/
            if (pathParts[0] === 'template_sets' && ext === '.html') {
                const templateSetName = pathParts[1]; // Get template set name from path
                const fileName = path.basename(docPath, ext);
                
                if (templateSetName) {
                    const templateSet = new MyBBTemplateSet(templateSetName, con, config.database.prefix);
                    await templateSet.saveElement(fileName, document.getText(), config.mybbVersion);
                    await logToPHP(`Updated template "${fileName}" in set "${templateSetName}"`);
                }
            }
            // Handle styles (unchanged)
            else if (pathParts[0] === 'styles' && ext === '.css') {
                const themeName = pathParts[1];
                const fileName = path.basename(docPath);
                
                if (themeName) {
                    const style = new MyBBStyle(themeName, con, config.database.prefix);
                    await style.saveElement(fileName, document.getText(), themeName);
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                logErrorToFile(error);
                vscode.window.showErrorMessage(`Failed to handle save event: ${error.message}`);
            } else {
                const unknownError = new Error("Unknown error occurred while handling save event.");
                logErrorToFile(unknownError);
                vscode.window.showErrorMessage(unknownError.message);
            }
        }
    }
}