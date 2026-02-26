import { styleText, getName } from '../../utils/helpers.js';

export default {
    commands: ['gay', 'howgay'],
    tags: ['fun'],

    async execute(ctx) {
        const { msg, sender, text, chatId, isGroup, bot } = ctx;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        let target = sender;
        if (mentioned && mentioned.length > 0) {
            target = mentioned[0];
        }

        let displayName = await getName(bot, chatId, target);

        // Use text as name if provided and no mention
        if (text && (!mentioned || mentioned.length === 0)) {
            displayName = text;
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
