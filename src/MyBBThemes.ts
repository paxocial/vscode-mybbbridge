// MyBBThemes.ts

import * as vscode from 'vscode';
import * as mysql from 'mysql2';
import * as request from 'request-promise-native';
import * as fs from 'fs';
import * as path from 'path';

import { timestamp, urlJoin, getConfig, getConnexion, getWorkspacePath } from './utils';
import { TemplateGroupManager, TemplateGroup, Template } from './TemplateGroupManager';

/**
 * Logs error messages to the configured log file.
 * @param error The error to log.
 */
export async function logErrorToFile(error: Error) {  // Export the function
    console.log("logErrorToFile called");  // Debugging log
    const config = await getConfig();
    const logFilePath = config.logFilePath || path.join(getWorkspacePath(), 'mybbbridge_extension.log');
    const timestampStr = new Date().toISOString();
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFilePath, `[${timestampStr}] ERROR: ${error.message}\n`, 'utf8');
}

/**
 * Logs informational messages to the configured log file.
 * @param message The message to log.
 */
export async function logToFile(message: string) {
    console.log("logToFile called");  // Debugging log
    const config = await getConfig();
    const logFilePath = config.logFilePath || path.join(getWorkspacePath(), 'mybbbridge_extension.log');
    const timestampStr = new Date().toISOString();
    try {
        const logDir = path.dirname(logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(logFilePath, `[${timestampStr}] ${message}\n`, 'utf8');
    } catch (error) {
        if (error instanceof Error) {
            logErrorToFile(error);
        } else {
            console.error(`Failed to write to log file: ${String(error)}`);
        }
    }
}

/**
 * Sends log messages to a PHP endpoint (`log.php`) on the MyBB server.
 * Optionally includes a token for authentication.
 * @param message The message to send.
 */
export async function logToPHP(message: string) {
    console.log("logToPHP called"); // Console log for VS Code output
    const config = await getConfig();
    if (config.mybbUrl) {
        const logUrl = urlJoin([config.mybbUrl, 'log.php']);
        const token = config.token;  // Optional token
        try {
            const form: any = { message };
            if (token) {
                form.token = token;
            }
            const response = await request.post({
                uri: logUrl,
                form: form
            });
            await logToFile(`Logged to PHP: ${message}`);
        } catch (error) {
            if (error instanceof Error) {
                logErrorToFile(error);
            } else {
                console.error(`Failed to log to PHP: ${String(error)}`);
            }
        }
    }
}

/**
 * Abstract class representing a generic MyBB set (template set or style).
 */
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

    /**
     * Retrieves the full table name with prefix.
     * @param name The base table name.
     * @returns The prefixed table name.
     */
    public getTable(name: string): string {
        return this.prefix + name;
    }

    /**
     * Checks if the current database connection is closed.
     * @returns A promise that resolves to `true` if closed, `false` otherwise.
     */
    private async isConnectionClosed(): Promise<boolean> {
        return new Promise((resolve) => {
            this.con.ping((err) => {
                resolve(!!err);
            });
        });
    }

    /**
     * Executes a database query with retry logic and logging.
     * @param req The SQL query string.
     * @param params The parameters for the SQL query.
     * @param callback Optional callback function.
     * @returns A promise that resolves with the query result.
     */
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

    /**
     * Saves a template element. To be implemented by subclasses.
     * @param fileName The name of the template file.
     * @param content The content of the template.
     * @param version The version of the template.
     */
    public abstract saveElement(fileName: string, content: string, version: string): Promise<void>;
}

/**
 * Class representing a MyBB Template Set.
 */
export class MyBBTemplateSet extends MyBBSet {
    /**
     * Retrieves all templates within the set, categorized by groups.
     * @returns A promise that resolves to an array of templates.
     */
    public async getElements(): Promise<Template[]> {
        return await TemplateGroupManager.getTemplatesWithGroups(this.con, this.prefix, this.name);
    }

    /**
     * Saves a template, handling inherited templates by updating their `sid`.
     * @param fileName The name of the template file.
     * @param content The content of the template.
     * @param version The version of the template.
     */
    public async saveElement(fileName: string, content: string, version: string): Promise<void> {
        const table = this.getTable('templates');

        try {
            // Get the template set's sid
            const sidQuery = `SELECT sid FROM ${this.getTable('templatesets')} WHERE title = ?`;
            const sidResult = await this.query(sidQuery, [this.name]);

            if (!sidResult || sidResult.length === 0) {
                throw new Error(`Template set "${this.name}" not found`);
            }

            const sid = sidResult[0].sid;

            // First, check if there's a master template
            const masterQuery = `SELECT tid, template FROM ${table} WHERE title = ? AND sid = -2`;
            const masterTemplate = await this.query(masterQuery, [fileName]);

            // Then check if we already have a custom version
            const customQuery = `SELECT tid, template FROM ${table} WHERE title = ? AND sid = ?`;
            const customTemplate = await this.query(customQuery, [fileName, sid]);

            if (masterTemplate && masterTemplate.length > 0) {
                // We have a master template
                if (customTemplate && customTemplate.length > 0) {
                    // Update existing custom template
                    const updateQuery = `UPDATE ${table} SET template = ?, version = ?, dateline = ? WHERE tid = ?`;
                    await this.query(updateQuery, [content, version, timestamp(), customTemplate[0].tid]);
                    vscode.window.showInformationMessage(`Updated modified template "${fileName}"`);
                } else {
                    // Create new custom version of master template
                    const insertQuery = `INSERT INTO ${table} (title, template, sid, version, dateline) VALUES (?, ?, ?, ?, ?)`;
                    await this.query(insertQuery, [fileName, content, sid, version, timestamp()]);
                    vscode.window.showInformationMessage(`Created custom version of template "${fileName}"`);
                }
            } else {
                // No master template exists
                if (customTemplate && customTemplate.length > 0) {
                    // Update existing custom template
                    const updateQuery = `UPDATE ${table} SET template = ?, version = ?, dateline = ? WHERE tid = ?`;
                    await this.query(updateQuery, [content, version, timestamp(), customTemplate[0].tid]);
                    vscode.window.showInformationMessage(`Updated custom template "${fileName}"`);
                } else {
                    // Create new custom template
                    const insertQuery = `INSERT INTO ${table} (title, template, sid, version, dateline) VALUES (?, ?, ?, ?, ?)`;
                    await this.query(insertQuery, [fileName, content, sid, version, timestamp()]);
                    vscode.window.showInformationMessage(`Created new template "${fileName}"`);
                }
            }

            await logToPHP(`Template "${fileName}" saved in set "${this.name}"`);

        } catch (err) {
            const errorMessage = `Failed to save template "${fileName}": ${err instanceof Error ? err.message : String(err)}`;
            vscode.window.showErrorMessage(errorMessage);
            await logToPHP(errorMessage);
            throw err;
        }
    }
}

/**
 * Class representing a MyBB Style.
 */
export class MyBBStyle extends MyBBSet {
    public constructor(name: string, con: mysql.Connection, prefix: string = 'mybb_') {
        super(name, con, prefix);
    }

    /**
     * Retrieves all stylesheets within the style.
     * @returns A promise that resolves to an array of stylesheets.
     */
    public async getElements(): Promise<any[]> {
        const req = `SELECT name, stylesheet FROM ${this.getTable('themestylesheets')} WHERE tid = (SELECT tid FROM ${this.getTable('themes')} WHERE name = ?)`;
        await logToPHP(`Loading styles for set: ${this.name}`);
        const styles = await this.query(req, [this.name]);
        vscode.window.showInformationMessage(`${styles.length} stylesheets loaded successfully.`);
        await logToPHP(`${styles.length} stylesheets loaded successfully.`);
        return styles;
    }

    /**
     * Saves a stylesheet, handling creation and updates.
     * @param fileName The name of the stylesheet file.
     * @param content The content of the stylesheet.
     * @param themeName The name of the theme.
     */
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
                await logToPHP(successMessage);
            } else {
                // Update existing stylesheet for this specific theme
                const updateQuery = `UPDATE ${table} 
                    SET stylesheet = ?, lastmodified = ? 
                    WHERE tid = ? AND name = ?`;

                await this.query(updateQuery, [content, timestamp(), tid, fileName]);

                const successMessage = `Updated stylesheet "${fileName}" for theme "${themeName}"`;
                vscode.window.showInformationMessage(successMessage);
                await logToPHP(successMessage);
            }

            // Always refresh the cache after update
            await this.requestCacheRefresh(fileName, themeName);

        } catch (err) {
            const errorMessage = `Failed to save stylesheet "${fileName}": ${err instanceof Error ? err.message : String(err)}`;
            vscode.window.showErrorMessage(errorMessage);
            await logToPHP(errorMessage);
            throw err;
        }
    }

    /**
     * Requests a cache refresh for the specified stylesheet.
     * Optionally includes a token for authentication.
     * @param name The name of the stylesheet.
     * @param themeName The name of the theme.
     */
    public async requestCacheRefresh(name: string, themeName: string): Promise<void> {
        const config = await getConfig();

        if (!config.mybbUrl) {
            throw new Error("MyBB URL not configured");
        }

        const scriptUrl = urlJoin([config.mybbUrl, 'cachecss.php']);
        await logToPHP(`Requesting cache refresh for ${name} in theme ${themeName}`);

        try {
            const form: any = {
                theme_name: themeName,
                stylesheet: name
            };
            const token = config.token;  // Optional token
            if (token) {
                form.token = token;
            }

            const response = await request.post({
                uri: scriptUrl,
                form: form,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            let jsonResponse;
            try {
                jsonResponse = JSON.parse(response);
                await logToFile(`Cache refresh response: ${JSON.stringify(jsonResponse)}`);
            } catch (parseError) {
                await logToFile(`Raw response: ${response}`);
                throw new Error(`Invalid JSON response: ${response}`);
            }

            if (!jsonResponse.success) {
                throw new Error(jsonResponse.message || 'Unknown cache refresh error');
            }

            vscode.window.showInformationMessage(jsonResponse.message);
            await logToPHP(`Cache refresh successful: ${jsonResponse.message}`);

        } catch (err) {
            const errorMessage = `Cache refresh failed: ${err instanceof Error ? err.message : String(err)}`;
            vscode.window.showErrorMessage(errorMessage);
            await logToPHP(errorMessage);
            throw err;
        }
    }
}