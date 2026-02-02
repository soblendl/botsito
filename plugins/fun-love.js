import { styleText } from '../lib/utils.js';

export default {
    commands: ['love', 'amor', 'ship'],
    tags: ['fun'],
    help: ['love @user'],

    async execute(ctx) {
        const { msg, bot, text, sender, chatId, isGroup, from } = ctx
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid

        let target = ''
        if (mentionedJid && mentionedJid.length > 0) {
            target = mentionedJid[0]
        } else if (text) {
            // Check if text is a mention or just text. If manual text, we can't easily calculate "love" properly without IDs usually, 
            // but we can allow it visually. However, original code returned error.
            return await ctx.reply(styleText('ꕤ Etiqueta a alguien para calcular el amor.'))
        } else {
            return await ctx.reply(styleText('ꕤ Etiqueta a alguien para calcular el amor.'))
        }

        // Resolve names
        const senderName = from?.name || sender.split('@')[0];
        let targetName = target.split('@')[0];

        if (isGroup) {
            try {
                const groupMetadata = await bot.sock.groupMetadata(chatId);
                const targetId = target.split('@')[0].split(':')[0];
                const participant = groupMetadata.participants.find(p => {
                    const pId = p.id.split('@')[0].split(':')[0];
                    const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                    return pId === targetId || pLid === targetId;
                });
                if (participant) {
                    targetName = participant.notify || participant.name || targetId;
                }
            } catch (e) {}
        }


        const percentage = Math.floor(Math.random() * 101)
        let message = ''

        if (percentage < 25) {
            message = '💔 No hay futuro aquí...'
        } else if (percentage < 50) {
            message = '😐 Podría funcionar con esfuerzo.'
        } else if (percentage < 75) {
            message = '❤️ Hay buena química.'
        } else {
            message = '💖 ¡Son almas gemelas!'
        }

        const response = `*Calculadora de Amor* 💘\n\n` +
            `🔻 *${senderName}* + *${targetName}*\n` +
            `📊 *Porcentaje:* ${percentage}%\n` +
            `📝 *Resultado:* ${message}`

        await ctx.reply(styleText(response), { mentions: [sender, target] })
    }
}
