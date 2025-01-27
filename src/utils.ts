// utils.ts

import * as vscode from 'vscode';
import * as mysql from 'mysql2';
import * as path from 'path';
import { promises as fs, PathLike } from 'fs';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Establishes a connection to the MySQL database with retry logic.
 * @param dbConfig Database configuration object.
 * @returns A promise that resolves to the MySQL connection.
 */
export async function getConnexion(dbConfig: any): Promise<mysql.Connection> {
    let retries = 0;
    let connection: mysql.Connection | null = null;

    while (retries < MAX_RETRIES && connection === null) {
        try {
            connection = mysql.createConnection({
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database,
                user: dbConfig.user,
                password: dbConfig.password
            });
            await new Promise<void>((resolve, reject) => {
                connection!.connect((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            retries += 1;
            console.error(`Connection attempt ${retries} failed. Retrying in ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    if (!connection) {
        throw new Error('Failed to establish a database connection after several retries.');
    }
    return connection;
}

/**
 * Retrieves the path of the currently opened workspace.
 * @returns The workspace path as a string.
 */
export function getWorkspacePath(): string {
    if (vscode.workspace.workspaceFolders) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage("No workspace opened!");
    return '';
}

/**
 * Reads and parses the configuration file (`mbbb.json`).
 * @returns A promise that resolves to the configuration object.
 */
export async function getConfig(): Promise<any> {
    const configFilePath = path.join(getWorkspacePath(), '.vscode', 'mbbb.json');
    try {
        const configFile = await fs.readFile(configFilePath);
        const config = JSON.parse(configFile.toString());

        // Ensure required fields are present
        if (!config.database) {
            throw new Error("Database configuration is missing in config file.");
        }

        // Set default for logFilePath if not present
        if (!config.logFilePath) {
            config.logFilePath = path.join(getWorkspacePath(), 'mybbbridge_extension.log');
        }

        return config;
    } catch (err) {
        vscode.window.showErrorMessage('Config file not found or invalid. Try using "Create config file" command.');
        throw err;
    }
}

/**
 * Creates a directory at the specified path if it doesn't already exist.
 * @param dirPath The directory path to create.
 */
export async function makePath(dirPath: PathLike): Promise<void> {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
}

/**
 * Generates a Unix timestamp.
 * @returns The current Unix timestamp as a number.
 */
export function timestamp(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * Joins multiple URL parts into a single URL string.
 * @param urlParts An array of URL segments.
 * @returns The joined URL string.
 */
export function urlJoin(urlParts: string[]): string {
    return urlParts
        .map(part => (part.endsWith('/') ? part.slice(0, -1) : part))
        .join('/');
}