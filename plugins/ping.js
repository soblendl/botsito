import { styleText } from '../lib/utils.js';

export default {
    commands: ['ping', 'p'],

    async execute(ctx) {
        const start = Date.now();
        const sent = await ctx.reply(styleText(
            `ꕥ *Velocidad del Bot*\n\n` +
            `> Latencia » Calculando...`
        ));
        const latency = Date.now() - start;
        await ctx.bot.sendMessage(ctx.chatId, {
            text: styleText(
                `ꕥ *Velocidad del Bot*\n\n` +
                `> Latencia » ${latency}ms\n` +
                `> Estado » Online`
            ),
            edit: sent.key
        });
    }
};