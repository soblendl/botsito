import chalk from 'chalk';

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    constructor(context = 'Bot', minLevel = 'INFO') {
        this.context = context;
        this.minLevel = LOG_LEVELS[minLevel] ?? LOG_LEVELS.INFO;
        this.startTime = Date.now();
    }

    getTimestamp() {
        return new Date().toISOString().slice(11, 23);
    }

    getUptime() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        return `${hours}h${minutes}m${seconds}s`;
    }

    log(level, message, data = null) {
        if (LOG_LEVELS[level] < this.minLevel) return;

        const timestamp = this.getTimestamp();
        let prefix = '';

        switch (level) {
            case 'DEBUG':
                prefix = chalk.cyan('🔎︎ [DEBUG]');
                break;
            case 'INFO':
                prefix = chalk.green('✠ [INFO]');
                break;
            case 'WARN':
                prefix = chalk.yellow('⚠︎ [WARN]');
                break;
            case 'ERROR':
                prefix = chalk.red('✘ [ERROR]');
                break;
            default:
                prefix = chalk.grey('• [LOG]');
        }

        let output = `${prefix} ${chalk.gray(`[${timestamp}]`)} ${chalk.bold(`[${this.context}]`)} ${message}`;

        if (data) {
            if (data instanceof Error) {
                output += `\n   ${chalk.red(data.stack || data.message)}`;
            } else if (typeof data === 'object') {
                output += `\n   ${chalk.gray(JSON.stringify(data, null, 2))}`;
            } else {
                output += ` | ${data}`;
            }
        }

        console.log(output);
    }

    debug(message, data) { this.log('DEBUG', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }

    child(subContext) {
        const child = new Logger(`${this.context}:${subContext}`, Object.keys(LOG_LEVELS)[this.minLevel]);
        child.startTime = this.startTime;
        return child;
    }

    perf(operation, startTime) {
        const duration = Date.now() - startTime;
        this.debug(`${operation} completed`, { duration: `${duration}ms` });
    }
}

const globalLogger = new Logger('Kaoruko', process.env.LOG_LEVEL || 'INFO');
export { Logger, globalLogger };
export default Logger;
