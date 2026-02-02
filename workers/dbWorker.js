import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { globalLogger as logger } from '../src/utils/logger.js';

parentPort.on('message', async (task) => {
    const { type, data, id } = task;
    try {
        if (type === 'save') {
            const { dbPath, collections } = data;
            if (!fs.existsSync(dbPath)) {
                fs.mkdirSync(dbPath, { recursive: true });
            }
            for (const [name, items] of Object.entries(collections)) {
                const filePath = path.join(dbPath, `${name}.json`);
                const getCircularReplacer = () => {
                    const seen = new WeakSet();
                    return (key, value) => {
                        if (typeof value === "object" && value !== null) {
                            if (seen.has(value)) {
                                return;
                            }
                            seen.add(value);
                        }
                        return value;
                    };
                };
                fs.writeFileSync(filePath, JSON.stringify(items, getCircularReplacer(), 2));
            }
            parentPort.postMessage({ id, success: true });
        }
    } catch (error) {
        logger.error('DB Worker Error:', error);
        parentPort.postMessage({ id, success: false, error: error.message });
    }
});