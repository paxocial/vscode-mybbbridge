// extension.ts

import * as vscode from 'vscode';
import { loadTemplateSetCommand, loadStyleCommand } from "./loadCommands";
import { createConfigCommand } from "./utilCommands";
import { onSaveEvent } from "./events";
import { logToPHP, logErrorToFile, logToFile } from './MyBBThemes';  // Adjust path as necessary

let outputChannel: vscode.OutputChannel;

/**
 * Activates the MyBBBridge extension, registering commands and setting up logging.
 * @param context The extension context.
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log("Activating MyBBBridge extension");  // Debugging log

    // Initialize Output Channel
    outputChannel = vscode.window.createOutputChannel('MyBBBridge Logs');
    context.subscriptions.push(outputChannel);

    // Override logging functions to write to Output Channel
    const originalLogToPHP = logToPHP;
    (logToPHP as any) = async function(message: string) {
        const timestampStr = new Date().toISOString();
        outputChannel.appendLine(`[${timestampStr}] LOG: ${message}`);
        await originalLogToPHP(message);
    };

    const originalLogErrorToFile = logErrorToFile;
    (logErrorToFile as any) = async function(error: Error) {
        const timestampStr = new Date().toISOString();
        outputChannel.appendLine(`[${timestampStr}] ERROR: ${error.message}`);
        await originalLogErrorToFile(error);
    };

    const originalLogToFile = logToFile;
    (logToFile as any) = async function(message: string) {
        const timestampStr = new Date().toISOString();
        outputChannel.appendLine(`[${timestampStr}] ${message}`);
        await originalLogToFile(message);
    };

    // Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.loadTemplateSet', loadTemplateSetCommand)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.loadStyle', loadStyleCommand)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.createConfig', createConfigCommand)
    );

    // Register Save Event Handler
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(onSaveEvent)
    );

    // Register the test logging command
    context.subscriptions.push(
        vscode.commands.registerCommand('mybbbridge.logSampleMessage', () => {
            console.log("mybbbridge.logSampleMessage command executed");  // Debugging log
            // Call logToPHP with a sample message
            logToPHP("This is a test message from the VS Code extension.")
                .then(() => {
                    console.log("logToPHP succeeded");  // Debugging log
                    vscode.window.showInformationMessage("Sample log message sent to PHP!");
                })
                .catch((err: unknown) => {
                    console.log("logToPHP failed");  // Debugging log
                    if (err instanceof Error) {
                        vscode.window.showErrorMessage(`Failed to send log: ${err.message}`);
                    } else {
                        vscode.window.showErrorMessage("Failed to send log: Unknown error occurred.");
                    }
                });
        })
    );
}

/**
 * Deactivates the MyBBBridge extension, disposing of the Output Channel.
 */
export function deactivate() {
    console.log("Deactivating MyBBBridge extension");  // Debugging log
    if (outputChannel) {
        outputChannel.dispose();
    }
}
