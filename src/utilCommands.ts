// utilCommands.ts

import * as vscode from 'vscode';
import { promises as fs, PathLike } from 'fs';
import path = require('path');

import { getWorkspacePath } from './utils';

/**
 * Command to create the configuration file (`mbbb.json`) with default settings.
 */
export async function createConfigCommand() {
    // Get current workspace path
    const workspacePath = getWorkspacePath();

    if (!workspacePath) {
        vscode.window.showErrorMessage("No workspace is opened.");
        return;
    }

    // Get or create .vscode directory
    let configDirPath = path.join(workspacePath, '.vscode');
    try {
        await fs.mkdir(configDirPath, { recursive: true });
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to create .vscode directory: ${(err as Error).message}`);
        return;
    }

    // Create config file if not already existing
    const configFilePath = path.join(configDirPath, 'mbbb.json');
    try {
        await fs.access(configFilePath);
        vscode.window.showErrorMessage(`Config file ${configFilePath} already exists!`);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            const defaultConf = JSON.stringify({
                "database": {
                    "host": "localhost",
                    "port": 3306,
                    "database": "mybb",
                    "prefix": "mybb_",
                    "user": "root",
                    "password": ""
                },
                "mybbVersion": 1860,
                "mybbUrl": "http://localhost",
                "autoUpload": true,
                "logFilePath": "C:/wamp64/www/mybbbridge/mybbbridge_extension.log",
                "token": ""
            }, null, 4);

            try {
                await fs.writeFile(configFilePath, defaultConf);
                vscode.window.showInformationMessage(`Config file ${configFilePath} created successfully.`);
            } catch (writeErr) {
                vscode.window.showErrorMessage(`Failed to write config file: ${(writeErr as Error).message}`);
            }
            return;
        }
        vscode.window.showErrorMessage(`Error accessing config file: ${(err as Error).message}`);
    }
}
