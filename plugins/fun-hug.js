import { extractMentions, styleText } from '../lib/utils.js';

const lidCache = new Map();

const resolveLidToJid = async (identifier, bot, chatId) => {
    if (typeof identifier !== 'string' || !identifier.endsWith('@lid')) {
        return { jid: identifier, resolved: true };
    }

    if (!chatId?.endsWith('@g.us')) {
        return { jid: null, resolved: false };
    }

    if (lidCache.has(identifier)) {
        return lidCache.get(identifier);
    }

    try {
        const metadata = await bot.groupMetadata(chatId);
        const lidNumber = identifier.split('@')[0];

        for (const p of metadata.participants) {
            try {
                const [wa] = await bot.onWhatsApp(p.id);
                if (wa?.lid?.split('@')[0] === lidNumber) {
                    const data = { jid: p.id, resolved: true };
                    lidCache.set(identifier, data);
                    return data;
                }
            } catch {}
        }
    } catch {}

    const unresolved = { jid: null, resolved: false };
    lidCache.set(identifier, unresolved);
    return unresolved;
};

const getDisplayName = async (identifier, bot, chatId) => {
    try {
        if (!chatId.endsWith('@g.us')) {
            return identifier?.split('@')[0] ?? 'Usuario';
        }

        const metadata = await bot.groupMetadata(chatId);

        let p = metadata.participants.find(u => u.id === identifier);
        if (p) return p.notify || p.name || identifier.split('@')[0];

        if (identifier?.endsWith('@lid')) {
            const lidNum = identifier.split('@')[0];
            for (const u of metadata.participants) {
                try {
                    const [wa] = await bot.onWhatsApp(u.id);
                    if (wa?.lid?.split('@')[0] === lidNum) {
                        return u.notify || u.name || lidNum;
                    }
                } catch {}
            }
        }

        return identifier.split('@')[0];
    } catch {
        return identifier?.split('@')[0] ?? 'Usuario';
    }
};

export default {
    commands: ['hug', 'abrazar'],

    async execute(ctx) {
        const { msg, sender, chatId, bot } = ctx;

        let target;
        const mentioned = extractMentions(ctx);
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned.length) target = mentioned[0];
        else if (quoted) target = quoted;
        else target = sender;

        const { jid, resolved } = await resolveLidToJid(target, bot, chatId);

        const senderName = await getDisplayName(sender, bot, chatId);
        const targetName = await getDisplayName(jid ?? target, bot, chatId);

        try {
            await bot.sendMessage(chatId, {
                react: { text: '🫂', key: msg.key }
            });
        } catch {}

        let text;
        if (jid && jid !== sender) {
            text = styleText(`\`${senderName}\` le dio un fuerte abrazo a \`${targetName}\`.`);
        } else {
            text = styleText(`\`${senderName}\` se abrazó a sí mismo.`);
        }

        const videos = [
            'https://telegra.ph/file/6a3aa01fabb95e3558eec.mp4',
            'https://telegra.ph/file/0e5b24907be34da0cbe84.mp4',
            'https://telegra.ph/file/6bc3cd10684f036e541ed.mp4',
            'https://telegra.ph/file/3e443a3363a90906220d8.mp4',
            'https://telegra.ph/file/56d886660696365f9696b.mp4',
            'https://telegra.ph/file/3eeadd9d69653803b33c6.mp4',
            'https://telegra.ph/file/436624e53c5f041bfd597.mp4',
            'https://telegra.ph/file/5866f0929bf0c8fe6a909.mp4'
        ];

        const video = videos[Math.floor(Math.random() * videos.length)];

        await bot.sendMessage(chatId, {
            video: { url: video },
            gifPlayback: true,
            caption: text,
            mentions: resolved && jid ? [jid] : []
        }, { quoted: msg });
    }
};