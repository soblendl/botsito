import { globalLogger as logger } from './logger.js';
export class GroupMetadataCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000;
        this.pendingRequests = new Map();
    }
    async get(bot, groupId, retries = 2) {
        const cached = this.cache.get(groupId);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < this.ttl) {
            logger.info(`[GroupMetadataCache] Using cached metadata for ${groupId}`);
            return cached.data;
        }
        if (this.pendingRequests.has(groupId)) {
            logger.info(`[GroupMetadataCache] Waiting for pending request for ${groupId}`);
            return await this.pendingRequests.get(groupId);
        }
        const sock = bot.sock || bot;
        const requestPromise = this.fetchWithRetry(sock, groupId, retries);
        this.pendingRequests.set(groupId, requestPromise);
        try {
            const metadata = await requestPromise;
            this.cache.set(groupId, {
                data: metadata,
                timestamp: now
            });
            return metadata;
        } finally {
            this.pendingRequests.delete(groupId);
        }
    }
    async fetchWithRetry(sock, groupId, retries) {
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                logger.info(`[GroupMetadataCache] Fetching metadata for ${groupId} (attempt ${attempt + 1}/${retries + 1})`);
                const metadata = await sock.groupMetadata(groupId);
                logger.info(`[GroupMetadataCache] Successfully fetched metadata for ${groupId}`);
                return metadata;
            } catch (error) {
                lastError = error;
                logger.error(`[GroupMetadataCache] Attempt ${attempt + 1} failed for ${groupId}:`, error.message);
                if (attempt < retries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    logger.info(`[GroupMetadataCache] Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        logger.error(`[GroupMetadataCache] All attempts failed for ${groupId}`);
        throw lastError;
    }
    invalidate(groupId) {
        this.cache.delete(groupId);
    }
    clear() {
        this.cache.clear();
    }
}
export const groupMetadataCache = new GroupMetadataCache();
