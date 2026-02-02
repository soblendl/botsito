import { groupMetadataCache } from './GroupMetadataCache.js';
import { globalLogger as logger } from './logger.js';

const permissionCache = new Map();
const CACHE_TTL = 60000;

export function normalizeUserId(userId) {
    if (!userId) return null;
    return userId.split(':')[0].split('@')[0];
}

export function clearPermissionCache(chatId) {
    const keysToDelete = [];
    for (const [key] of permissionCache) {
        if (key.startsWith(`${chatId}:`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => permissionCache.delete(key));
}

export async function isAdmin(bot, chatId, userId) {
    try {
        const normalizedId = normalizeUserId(userId);
        if (!normalizedId) return false;

        const cacheKey = `${chatId}:${normalizedId}:admin`;
        const cached = permissionCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.value;
        }

        const sock = bot.ws || bot.sock || bot;
        let groupMetadata;

        try {
            groupMetadata = await groupMetadataCache.get(sock, chatId);
        } catch (cacheError) {
            groupMetadata = await sock.groupMetadata(chatId);
        }

        if (!groupMetadata || !groupMetadata.participants) {
            return false;
        }

        const participant = groupMetadata.participants.find(p => {
            const pId = normalizeUserId(p.id);
            const pLid = p.lid ? normalizeUserId(p.lid) : null;
            return pId === normalizedId || pLid === normalizedId;
        });

        const result = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');

        permissionCache.set(cacheKey, {
            value: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        logger.error(`[isAdmin] Error:`, error.message);
        return false;
    }
}

export async function isBotAdmin(bot, chatId) {
    try {
        const cacheKey = `${chatId}:bot:admin`;
        const cached = permissionCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.value;
        }

        const sock = bot.ws || bot.sock || bot;
        let groupMetadata;

        try {
            groupMetadata = await groupMetadataCache.get(sock, chatId);
        } catch (cacheError) {
            groupMetadata = await sock.groupMetadata(chatId);
        }

        if (!groupMetadata || !groupMetadata.participants) return false;

        const user = sock.user;
        const botId = normalizeUserId(user?.id);
        const botLid = user?.lid ? normalizeUserId(user.lid) : null;

        const participant = groupMetadata.participants.find(p => {
            const pId = normalizeUserId(p.id);
            return pId === botId || (botLid && pId === botLid);
        });

        const result = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');

        permissionCache.set(cacheKey, {
            value: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        logger.error(`[isBotAdmin] Error:`, error.message);
        return false;
    }
}

export async function getGroupPermissions(bot, chatId) {
    try {
        const sock = bot.ws || bot.sock || bot;
        let groupMetadata;

        try {
            groupMetadata = await groupMetadataCache.get(sock, chatId);
        } catch (cacheError) {
            groupMetadata = await sock.groupMetadata(chatId);
        }

        if (!groupMetadata || !groupMetadata.participants) {
            return { admins: [], superadmins: [], participants: [] };
        }

        const admins = [];
        const superadmins = [];
        const participants = [];

        for (const p of groupMetadata.participants) {
            const normalizedId = normalizeUserId(p.id);
            participants.push(normalizedId);

            if (p.admin === 'admin') {
                admins.push(normalizedId);
            } else if (p.admin === 'superadmin') {
                superadmins.push(normalizedId);
            }
        }

        return {
            admins,
            superadmins,
            participants,
            metadata: groupMetadata
        };
    } catch (error) {
        logger.error(`[getGroupPermissions] Error:`, error.message);
        return { admins: [], superadmins: [], participants: [] };
    }
}

export async function findParticipant(bot, chatId, userId) {
    try {
        const sock = bot.ws || bot.sock || bot;
        const normalizedId = normalizeUserId(userId);
        let groupMetadata;

        try {
            groupMetadata = await groupMetadataCache.get(sock, chatId);
        } catch (cacheError) {
            groupMetadata = await sock.groupMetadata(chatId);
        }

        if (!groupMetadata || !groupMetadata.participants) {
            return null;
        }

        return groupMetadata.participants.find(p => {
            const pId = normalizeUserId(p.id);
            const pLid = p.lid ? normalizeUserId(p.lid) : null;
            return pId === normalizedId || pLid === normalizedId;
        });
    } catch (error) {
        logger.error(`[findParticipant] Error:`, error.message);
        return null;
    }
}

setInterval(() => {
    const now = Date.now();
    const keysToDelete = [];
    for (const [key, value] of permissionCache) {
        if (now - value.timestamp > CACHE_TTL) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => permissionCache.delete(key));
}, 30000);
