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
        const icons = {
            DEBUG: '🔍',
            INFO: '📌',
            WARN: '⚠️',
            ERROR: '❌'
        };
        const colors = {
            DEBUG: '\x1b[36m',
            INFO: '\x1b[32m',
            WARN: '\x1b[33m',
            ERROR: '\x1b[31m'
        };
        const reset = '\x1b[0m';
        const icon = icons[level] || '•';
        const color = colors[level] || '';
        const timestamp = this.getTimestamp();
        let output = `${color}${icon} [${timestamp}] [${this.context}] ${message}${reset}`;
        if (data) {
            if (data instanceof Error) {
                output += `\n   ${data.stack || data.message}`;
            } else if (typeof data === 'object') {
                output += `\n   ${JSON.stringify(data, null, 2)}`;
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