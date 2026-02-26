import { extractMentions, styleText, getName } from '../../utils/helpers.js';

export default {
    commands: ['kiss', 'skiss', 'kis', 'besos', 'beso', 'besar', 'besando'],

    async execute(ctx) {
        const { msg, sender, from, chatId } = ctx;

        let who;
        const mentioned = extractMentions(ctx);
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned.length > 0) {
            who = mentioned[0];
        } else if (quoted) {
            who = quoted;
        } else {
            who = sender;
        }

        const senderName = from.name || sender.split('@')[0];
        let targetName;

        if (who === sender) {
            targetName = 'alguien';
        } else {
            targetName = await getName(ctx.bot, chatId, who);
        }

        try {
            const res = await fetch('https://nekos.life/api/kiss');
            const json = await res.json();
            const { url } = json;

            const str = styleText(`\`${senderName}\` está besando a \`${targetName}\``);

            await ctx.bot.sendMessage(chatId, {
                image: { url: url },
                caption: str,
                mentions: [who]
            }, { quoted: msg });

        } catch (e) {
            console.error('[Kiss] Error:', e);
            await ctx.reply(styleText('ꕤ Error al obtener el beso.'));
        }
    }
};
