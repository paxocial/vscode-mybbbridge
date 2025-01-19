import * as vscode from 'vscode';
import * as mysql from 'mysql2';
import * as request from 'request-promise-native';
import * as fs from 'fs';
import * as path from 'path';

import { timestamp, urlJoin, getConfig, getConnexion } from './utils';
const logFilePath = 'C:/wamp64/www/mybb/mybbbridge/mybbbridge_extension.log';

export function logErrorToFile(error: Error) {  // Export the function
    console.log("logErrorToFile called");  // Debugging log
    const timestamp = new Date().toISOString();
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFilePath, `[${timestamp}] ERROR: ${error.message}\n`, 'utf8');
}

export async function logToFile(message: string) {
    console.log("logToFile called");  // Debugging log
    const timestamp = new Date().toISOString();
    try {
        const logDir = path.dirname(logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`, 'utf8');
    } catch (error) {
        if (error instanceof Error) {
            logErrorToFile(error);
        } else {
            console.error(`Failed to write to log file: ${String(error)}`);
        }
    }
}

export async function logToPHP(message: string) {
    console.log("logToPHP called"); // Console log for VS Code output
    const config = await getConfig();
    if (config.mybbUrl) {
        const logUrl = urlJoin([config.mybbUrl, 'log.php']);
        try {
            const response = await request.post({
                uri: logUrl,
                form: { message }
            });
            logToFile(`Logged to PHP: ${message}`);
        } catch (error) {
            if (error instanceof Error) {
                logErrorToFile(error);
            } else {
                console.error(`Failed to log to PHP: ${String(error)}`);
            }
        }
    }
}

abstract class MyBBSet {
    name: string;
    con: mysql.Connection;
    prefix: string;

    public constructor(name: string, con: mysql.Connection, prefix: string = 'mybb_') {
        this.name = name;
        this.con = con;
        this.prefix = prefix;
        console.log(`Initialized MyBBSet for ${name} with prefix ${prefix}`);
        logToPHP(`Initialized MyBBSet for ${name} with prefix ${prefix}`);
    }

    public getTable(name: string): string {
        return this.prefix + name;
    }

    private async isConnectionClosed(): Promise<boolean> {
        return new Promise((resolve) => {
            this.con.ping((err) => {
                resolve(!!err);
            });
        });
    }

    public async query(req: string, params: any[], callback: any = () => { }): Promise<any> {
        logToPHP(`Query method called with request: ${req} and params: ${JSON.stringify(params)}`);
        return new Promise(async (resolve, reject) => {
            const config = await getConfig();

            if (await this.isConnectionClosed()) {
                logToPHP("Reconnecting to database...");
                this.con = await getConnexion(config.database);
                vscode.window.showInformationMessage("Database connection re-established.");
            }

            try {
                this.con.query(req, params, (err: any, result: any) => {
                    if (err) {
                        vscode.window.showErrorMessage("Database error: " + err.message);
                        logToPHP(`Database error occurred: ${err.message}`);
                        return reject(err);
                    }

                    if (result.affectedRows === 0) {
                        const noRowsMsg = "No rows affected by the query - update may have failed.";
                        vscode.window.showErrorMessage(noRowsMsg);
                        logToPHP(noRowsMsg);
                        return reject(new Error(noRowsMsg));
                    }

                    logToPHP(`Query executed successfully with affectedRows: ${result.affectedRows}`);
                    callback(err, result);
                    resolve(result);
                });
            } catch (error) {
                logToPHP(`Query execution caught an error: ${error instanceof Error ? error.message : String(error)}`);
                reject(error);
            }
        });
    }

    public async saveElement(fileName: string, content: string, version: string): Promise<void> {
        const table = this.getTable('templates');
        const query = `UPDATE ${table} SET template = ?, version = ? WHERE title = ? AND sid = (SELECT sid FROM ${this.getTable('templatesets')} WHERE title = ?)`;
        try {
            logToPHP(`Attempting to save template: ${fileName} with version ${version}`);
            await this.query(query, [content, version, fileName, this.name]);
            vscode.window.showInformationMessage(`Template "${fileName}" saved successfully.`);
            logToPHP(`Template "${fileName}" saved successfully.`);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to save template "${fileName}": ${err instanceof Error ? err.message : String(err)}`);
            logToPHP(`Failed to save template "${fileName}": ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}

export class MyBBTemplateSet extends MyBBSet {
    public constructor(name: string, con: mysql.Connection, prefix: string = 'mybb_') {
        super(name, con, prefix);
    }

    public async getElements(): Promise<any[]> {
        const req = `SELECT title, template FROM ${this.getTable('templates')} WHERE sid = (SELECT sid FROM ${this.getTable('templatesets')} WHERE title=?)`;
        logToPHP(`Loading templates for set: ${this.name}`);
        const templates = await this.query(req, [this.name]);
        vscode.window.showInformationMessage(`${templates.length} templates loaded successfully.`);
        logToPHP(`${templates.length} templates loaded successfully.`);
        return templates;
    }
}

export class MyBBStyle extends MyBBSet {
    public constructor(name: string, con: mysql.Connection, prefix: string = 'mybb_') {
        super(name, con, prefix);
    }

    public async getElements(): Promise<any[]> {
        const req = `SELECT name, stylesheet FROM ${this.getTable('themestylesheets')} WHERE tid = (SELECT tid FROM ${this.getTable('themes')} WHERE name=?)`;
        logToPHP(`Loading styles for set: ${this.name}`);
        const styles = await this.query(req, [this.name]);
        vscode.window.showInformationMessage(`${styles.length} stylesheets loaded successfully.`);
        logToPHP(`${styles.length} stylesheets loaded successfully.`);
        return styles;
    }

    public async saveElement(fileName: string, content: string, themeName: string): Promise<void> {
        const table = this.getTable('themestylesheets');
        const query = `UPDATE ${table} SET stylesheet = ?, lastmodified = ? WHERE name = ? AND tid = (SELECT tid FROM ${this.getTable('themes')} WHERE name = ?)`;

        try {
            logToPHP(`Attempting to save stylesheet "${fileName}" with theme "${themeName}".`); // Logging to file first
            const result = await this.query(query, [content, timestamp(), fileName, themeName]);

            if (result.affectedRows === 0) {
                const noRowsMessage = `Failed to save stylesheet: No matching rows found.`;
                vscode.window.showErrorMessage(noRowsMessage);
                logToPHP(noRowsMessage);
            } else {
                const successMessage = `Stylesheet "${fileName}" for theme "${themeName}" saved successfully.`;
                vscode.window.showInformationMessage(successMessage);
                logToPHP(successMessage);

                // Call requestCacheRefresh to refresh the cache
                await this.requestCacheRefresh(fileName, themeName);
            }
        } catch (err) {
            const errorMessage = `Failed to save stylesheet "${fileName}": ${err instanceof Error ? err.message : String(err)}`;
            vscode.window.showErrorMessage(errorMessage);
            logToPHP(errorMessage);
        }
    }

    public async requestCacheRefresh(name: string, themeName: string): Promise<void> {
        const config = await getConfig();

        if (config.mybbUrl) {
            const scriptUrl = urlJoin([config.mybbUrl, 'cachecss.php']);
            logToPHP(`Preparing cache refresh request. URL: ${scriptUrl}, theme: "${themeName}", stylesheet: "${name}"`);

            try {
                const result = await this.query(
                    `SELECT tid FROM ${this.getTable('themes')} WHERE name = ?`,
                    [themeName]
                );

                if (result.length > 0) {
                    const tid = result[0].tid;
                    logToPHP(`Sending actual cache refresh request to cachecss.php with parameters - tid: ${tid}, name: ${name}`);

                    const response = await request.post({
                        uri: scriptUrl,
                        form: { tid, name, content: '' } // Assuming content is not needed for cache refresh
                    });

                    logToPHP(`Cache refresh request response from server: ${response}`);
                    vscode.window.showInformationMessage(`Cache refresh requested successfully for stylesheet "${name}".`);
                } else {
                    const errorMsg = `Theme "${themeName}" not found in the database; cannot refresh cache.`;
                    vscode.window.showErrorMessage(errorMsg);
                    logToPHP(errorMsg);
                }
            } catch (err) {
                const errorMessage = `Failed to request cache refresh for stylesheet "${name}": ${err instanceof Error ? err.message : String(err)}`;
                vscode.window.showErrorMessage(errorMessage);
                logToPHP(errorMessage);
            }
        } else {
            const configErrorMsg = "MyBB URL is not configured for cache refresh.";
            vscode.window.showErrorMessage(configErrorMsg);
            logToPHP(configErrorMsg);
        }
    }
}