import { globalLogger as logger } from './logger.js';
export class DataCache {
    constructor(ttl = 60000) {
        this.cache = new Map();
        this.ttl = ttl;
        this.hits = 0;
        this.misses = 0;
        setInterval(() => this.cleanup(), 300000);
    }
    set(key, data) {
        this.cache.set(key, {
            data,
            expires: Date.now() + this.ttl,
            lastAccess: Date.now()
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        entry.lastAccess = Date.now();
        this.hits++;
        return entry.data;
    }
    invalidate(key) {
        if (key) {
            this.cache.delete(key);
        }
    }
    invalidatePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
    }
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expires) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.info(`[DataCache] Limpiados ${cleaned} entradas expiradas`);
        }
    }
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate}%`
        };
    }
}
export const userCache = new DataCache(60000);
export const groupCache = new DataCache(120000);
export default { DataCache, userCache, groupCache };
