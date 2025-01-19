import * as vscode from 'vscode';
import { loadTemplateSetCommand, loadStyleCommand } from "./loadCommands";
import { createConfigCommand } from "./utilCommands";
import { onSaveEvent } from "./events";
import { logToPHP } from './MyBBThemes';  // Adjust path as necessary

export async function activate(context: vscode.ExtensionContext) {
	console.log("Activating MyBBBridge extension");  // Debugging log

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.loadTemplateSet', loadTemplateSetCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.loadStyle', loadStyleCommand)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.createConfig', createConfigCommand)
	);

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

export function deactivate() {
	console.log("Deactivating MyBBBridge extension");  // Debugging log
}