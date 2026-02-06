import { styleText } from '../../utils/helpers.js';

export default {
    commands: ['ping', 'p'],
    tags: ['tools'],
    help: ['ping - Verifica la latencia del bot'],
    async execute(ctx) {
        const start = Date.now();

        const msg = await ctx.reply(styleText('✿ Calculando ping...'));

        const latency = Date.now() - start;

        await ctx.bot.sendMessage(ctx.chatId, {
            text: styleText(
                `✿ *Pong!*\n\n` +
                `> ⚬ Latencia: *${latency}ms*\n` +
                `> ⚬ Tiempo de respuesta: *${latency}ms*\n` +
                `> ⚬ Estado: ${latency < 100 ? 'Excelente' : latency < 300 ? 'Bueno' : 'Lento'}`
            ),
            edit: msg.key
        });
    }
};
