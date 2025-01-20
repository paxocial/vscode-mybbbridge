export interface MyBBConfig {
    mybbUrl: string;
    database: {
        host: string;
        user: string;
        password: string;
        database: string;
    };
    securityToken: string; // A long random string shared between extension and server
    logFilePath: string;
}

export const DEFAULT_CONFIG: MyBBConfig = {
    mybbUrl: '',
    database: {
        host: 'localhost',
        user: '',
        password: '',
        database: 'mybb'
    },
    securityToken: '', // Will be generated on first run
    logFilePath: 'C:/wamp64/www/mybb/mybbbridge/mybbbridge_extension.log'
};
