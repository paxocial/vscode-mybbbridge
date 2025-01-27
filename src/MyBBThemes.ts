import * as vscode from 'vscode';
import * as mysql from 'mysql2';
import * as request from 'request-promise-native';
import * as fs from 'fs';
import * as path from 'path';

import { timestamp, urlJoin, getConfig, getConnexion } from './utils';
import { TemplateGroupManager, TemplateGroup, Template } from './TemplateGroupManager';

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

                    // Only check affectedRows for UPDATE/INSERT/DELETE queries
                    if (req.trim().toLowerCase().startsWith('update') || 
                        req.trim().toLowerCase().startsWith('insert') || 
                        req.trim().toLowerCase().startsWith('delete')) {
                        if (result.affectedRows === 0) {
                            const noRowsMsg = "No rows affected by the query - update may have failed.";
                            vscode.window.showErrorMessage(noRowsMsg);
                            logToPHP(noRowsMsg);
                            return reject(new Error(noRowsMsg));
                        }
                    }

                    logToPHP(`Query executed successfully with result: ${JSON.stringify(result)}`);
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
        // First try to update in the specific template set
        const query = `UPDATE ${table} SET template = ?, version = ? WHERE title = ? AND sid = (SELECT sid FROM ${this.getTable('templatesets')} WHERE title = ?)`;
        
        try {
            logToPHP(`Attempting to save template: ${fileName} with version ${version} in set ${this.name}`);
            await this.query(query, [content, version, fileName, this.name]);
            vscode.window.showInformationMessage(`Template "${fileName}" saved successfully in set ${this.name}.`);
            logToPHP(`Template "${fileName}" saved successfully in set ${this.name}.`);
        } catch (err) {
            // If the first attempt fails, try updating the global template
            logToPHP(`Failed to save in specific set, trying global template (sid = -2)`);
            const globalQuery = `UPDATE ${table} SET template = ?, version = ? WHERE title = ? AND sid = -2`;
            
            try {
                await this.query(globalQuery, [content, version, fileName]);
                vscode.window.showInformationMessage(`Template "${fileName}" saved successfully as global template.`);
                logToPHP(`Template "${fileName}" saved successfully as global template.`);
            } catch (globalErr) {
                const errorMessage = `Failed to save template "${fileName}" in both set and global: ${globalErr instanceof Error ? globalErr.message : String(globalErr)}`;
                vscode.window.showErrorMessage(errorMessage);
                logToPHP(errorMessage);
                throw globalErr;
            }
        }
    }
}

export class MyBBTemplateSet extends MyBBSet {
    private templateGroups: Map<string, TemplateGroup> = new Map();

    public constructor(name: string, con: mysql.Connection, prefix: string = 'mybb_') {
        super(name, con, prefix);
    }

    public async getElements(): Promise<Template[]> {
        // First, load template groups
        this.templateGroups = await TemplateGroupManager.getTemplateGroups(this.con, this.prefix);

        // Get templates with their group information
        const req = `
            SELECT t.title, t.template, tg.prefix as group_prefix, tg.title as group_title
            FROM ${this.getTable('templates')} t
            LEFT JOIN ${this.getTable('templategroups')} tg ON t.title LIKE CONCAT(tg.prefix, '_%')
            WHERE t.sid = (SELECT sid FROM ${this.getTable('templatesets')} WHERE title = ?)
            OR t.sid = -2
            ORDER BY t.title`;

        const templates = await this.query(req, [this.name]);
        return templates.map((template: Template) => ({
            ...template,
            group_name: this.getGroupName(template)
        }));
    }

    private getGroupName(template: Template): string {
        if (!template.group_prefix) {
            return 'Ungrouped';
        }
        return TemplateGroupManager.getGroupTitle(template.group_title || '');
    }
}

export class MyBBStyle extends MyBBSet {
    public constructor(name: string, con: mysql.Connection, prefix: string = 'mybb_') {
        super(name, con, prefix);
    }

    public async getElements(): Promise<any[]> {
        const req = `SELECT name, stylesheet FROM ${this.getTable('themestylesheets')} WHERE tid = (SELECT tid FROM ${this.getTable('themes')} WHERE name = ?)`;
        logToPHP(`Loading styles for set: ${this.name}`);
        const styles = await this.query(req, [this.name]);
        vscode.window.showInformationMessage(`${styles.length} stylesheets loaded successfully.`);
        logToPHP(`${styles.length} stylesheets loaded successfully.`);
        return styles;
    }

    public async saveElement(fileName: string, content: string, themeName: string): Promise<void> {
        try {
            // First, verify the theme exists and get its ID
            const themeQuery = `SELECT tid FROM ${this.getTable('themes')} WHERE name = ?`;
            const themeResult = await this.query(themeQuery, [themeName]);
            
            if (!themeResult || themeResult.length === 0) {
                throw new Error(`Theme "${themeName}" not found in database`);
            }
            
            const tid = themeResult[0].tid;
            const table = this.getTable('themestylesheets');
            
            // Check if the stylesheet exists for this specific theme
            const checkQuery = `SELECT sid FROM ${table} WHERE tid = ? AND name = ?`;
            const checkResult = await this.query(checkQuery, [tid, fileName]);

            if (checkResult.length === 0) {
                // Stylesheet doesn't exist for this theme - create it
                const insertQuery = `INSERT INTO ${table} 
                    (tid, name, stylesheet, cachefile, lastmodified) 
                    VALUES (?, ?, ?, ?, ?)`;
                await this.query(insertQuery, [
                    tid,
                    fileName,
                    content,
                    fileName,
                    timestamp()
                ]);
                
                const successMessage = `Created new stylesheet "${fileName}" for theme "${themeName}"`;
                vscode.window.showInformationMessage(successMessage);
                logToPHP(successMessage);
            } else {
                // Update existing stylesheet for this specific theme
                const updateQuery = `UPDATE ${table} 
                    SET stylesheet = ?, lastmodified = ? 
                    WHERE tid = ? AND name = ?`;
                
                await this.query(updateQuery, [content, timestamp(), tid, fileName]);
                
                const successMessage = `Updated stylesheet "${fileName}" for theme "${themeName}"`;
                vscode.window.showInformationMessage(successMessage);
                logToPHP(successMessage);
            }

            // Always refresh the cache after update
            await this.requestCacheRefresh(fileName, themeName);

        } catch (err) {
            const errorMessage = `Failed to save stylesheet "${fileName}": ${err instanceof Error ? err.message : String(err)}`;
            vscode.window.showErrorMessage(errorMessage);
            logToPHP(errorMessage);
            throw err;
        }
    }

    public async requestCacheRefresh(name: string, themeName: string): Promise<void> {
        const config = await getConfig();

        if (!config.mybbUrl) {
            throw new Error("MyBB URL not configured");
        }

        const scriptUrl = urlJoin([config.mybbUrl, 'cachecss.php']);
        logToPHP(`Requesting cache refresh for ${name} in theme ${themeName}`);

        try {
            const response = await request.post({
                uri: scriptUrl,
                form: {
                    theme_name: themeName,
                    stylesheet: name
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            let jsonResponse;
            try {
                jsonResponse = JSON.parse(response);
                logToPHP(`Cache refresh response: ${JSON.stringify(jsonResponse)}`);
            } catch (parseError) {
                logToPHP(`Raw response: ${response}`);
                throw new Error(`Invalid JSON response: ${response}`);
            }

            if (!jsonResponse.success) {
                throw new Error(jsonResponse.message || 'Unknown cache refresh error');
            }

            vscode.window.showInformationMessage(jsonResponse.message);

        } catch (err) {
            const errorMessage = `Cache refresh failed: ${err instanceof Error ? err.message : String(err)}`;
            vscode.window.showErrorMessage(errorMessage);
            logToPHP(errorMessage);
            throw err;
        }
    }
}