import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig, getConnexion, getWorkspacePath } from './utils';
import { MyBBTemplateSet, MyBBStyle, logErrorToFile } from './MyBBThemes';  // Import logErrorToFile

export async function onSaveEvent(document: vscode.TextDocument) {
    const config = await getConfig();

    if (config.autoUpload) {
        const docPath = document.uri.fsPath;
        const parent1Path = path.dirname(docPath);
        const parent2Path = path.dirname(parent1Path);
        const parent3Path = path.dirname(parent2Path);

        if (parent3Path === getWorkspacePath()) {
            const ext = path.extname(docPath);
            const parent1Dir = path.basename(parent1Path);
            const parent2Dir = path.basename(parent2Path);

            try {
                const con = await getConnexion(config.database);

                if (parent2Dir === 'template_sets' && ext === '.html') {
                    const templateSet = new MyBBTemplateSet(parent1Dir, con, config.database.prefix);
                    const fileName = path.basename(docPath, ext);
                    await templateSet.saveElement(fileName, document.getText(), config.mybbVersion);

                } else if (parent2Dir === 'styles' && ext === '.css') {
                    const style = new MyBBStyle(parent1Dir, con, config.database.prefix);
                    const fileName = path.basename(docPath);
                    const themeName = "default"; // Replace this with dynamic retrieval if needed
                    await style.saveElement(fileName, document.getText(), themeName);
                    await style.requestCacheRefresh(fileName, themeName);  // Ensure cache refresh is called
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
}