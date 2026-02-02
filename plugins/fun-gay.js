import { styleText } from '../lib/utils.js';

export default {
    commands: ['gay', 'howgay'],
    tags: ['fun'],

    async execute(ctx) {
        const { msg, sender, text, chatId, isGroup, bot, from } = ctx;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        let target = sender;
        if (mentioned && mentioned.length > 0) {
            target = mentioned[0];
        }

        let displayName = target.split('@')[0]; // Default to ID
        
        // Try to resolve name
        if (text && (!mentioned || mentioned.length === 0)) {
             displayName = text; // User typed a name manually e.g. /gay Juan
        } else if (isGroup) {
            try {
                const groupMetadata = await bot.sock.groupMetadata(chatId);
                const targetId = target.split('@')[0].split(':')[0];
                const participant = groupMetadata.participants.find(p => {
                    const pId = p.id.split('@')[0].split(':')[0];
                    const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                    return pId === targetId || pLid === targetId;
                });
                if (participant) {
                    displayName = participant.notify || participant.name || targetId;
                }
            } catch (e) {}
        }
        
        const percentage = Math.floor(Math.random() * 101);
        let description = '';
        if (percentage < 25) description = 'Heteropatriarcal 🗿';
        else if (percentage < 50) description = 'Curioso... 🤨';
        else if (percentage < 75) description = 'Bastante gei 🏳️‍🌈';
        else description = 'REINA DEL DRAMA 💅✨';

        const response = `❐ *Calculadora Gay* \n\n` +
            `➯ *Usuario:* ${displayName}\n` +
            `◷ *Porcentaje:* ${percentage}%\n` +
            `✐ *Diagnóstico:* ${description}`;

        await ctx.reply(styleText(response), { mentions: [target] });
    }
};
