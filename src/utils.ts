import * as vscode from 'vscode';
import * as mysql from 'mysql2';
import * as path from 'path';
import { promises as fs, PathLike } from 'fs';


const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
            connection.connect((err) => {
                if (err) throw err;  // Retry if connection fails
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

// Add placeholders or basic implementations for missing functions
export function getWorkspacePath(): string {
    if (vscode.workspace.workspaceFolders) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage("No workspace opened!");
    return '';
}

export async function getConfig(): Promise<any> {
    const configFilePath = path.join(getWorkspacePath(), '.vscode', 'mbbb.json');
    try {
        const configFile = await fs.readFile(configFilePath);
        return JSON.parse(configFile.toString());
    } catch (err) {
        vscode.window.showErrorMessage('Config file not found. Try using "Create config file" command.');
        throw err;
    }
}

export async function makePath(dirPath: PathLike): Promise<void> {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
}

export function timestamp(): number {
    return Math.floor(Date.now() / 1000);
}

export function urlJoin(urlParts: string[]): string {
    return urlParts
        .map(part => (part.endsWith('/') ? part.slice(0, -1) : part))
        .join('/');
}
