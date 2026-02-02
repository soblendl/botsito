import { groupMetadataCache } from './GroupMetadataCache.js';
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const getBuffer = async (url) => {
    const response = await fetch(url);
    return Buffer.from(await response.arrayBuffer());
};
export const getRandom = (list) => {
    return list[Math.floor(Math.random() * list.length)];
};
export const getGroupAdmins = (participants) => {
    return participants.filter(p => p.admin).map(p => p.id);
};
export const extractMentions = (ctx) => {
    const mentioned = ctx.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned;
    const matches = (ctx.body || ctx.text || '').match(/@(\d+)/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1) + '@s.whatsapp.net');
};
export const getMentions = (text) => {
    const matches = text.match(/@(\d+)/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1) + '@s.whatsapp.net');
};
const owners = [
    '639972367773@s.whatsapp.net',
    '526631079388@s.whatsapp.net',
    '573114910796@s.whatsapp.net',
    '5359047235@s.whatsapp.net'
];
export const isOwner = (userId, specificOwner) => {
    if (specificOwner) return userId === specificOwner;
    return owners.includes(userId);
};
export const getName = async (bot, chatId, userId) => {
    try {
        const sock = bot.ws || bot.sock || bot;
        const targetId = userId.split('@')[0];
        const fullJid = targetId + '@s.whatsapp.net';
        if (sock.store && sock.store.contacts) {
            const contact = sock.store.contacts[fullJid];
            if (contact && (contact.name || contact.notify || contact.verifiedName)) {
                return contact.name || contact.notify || contact.verifiedName;
            }
        }
        if (chatId.endsWith('@g.us')) {
            let groupMetadata;
            try {
                groupMetadata = await groupMetadataCache.get(sock, chatId);
            } catch (e) {
                try {
                    groupMetadata = await sock.groupMetadata(chatId);
                } catch (e2) { }
            }
            if (groupMetadata && groupMetadata.participants) {
                const participant = groupMetadata.participants.find(p => {
                    const pId = p.id.split('@')[0].split(':')[0];
                    const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                    return pId === targetId || pLid === targetId;
                });
                if (participant) {
                    if (participant.notify || participant.name) {
                        return participant.notify || participant.name;
                    }
                }
            }
        }
        return targetId;
    } catch (e) {
        return userId.split('@')[0];
    }
};
export const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
export const styleText = (text) => {
    return text
        .replace(/a/g, 'ᥲ')
        .replace(/e/g, 'ꫀ')
        .replace(/t/g, 't')
        .replace(/u/g, 'ᥙ')
        .replace(/x/g, 'ꪎ')
        .replace(/y/g, 'ᥡ');
};
export * from './formatters.js';
export * from './permissions.js';
