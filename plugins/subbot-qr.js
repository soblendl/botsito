import { jadibotManager } from '../lib/jadibot.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['qr'],

    async execute(ctx) {
        if (!ctx.args[0]) {
            return await ctx.reply(styleText('ꕤ Debes proporcionar un código.\nUso: #qr <código>'));
        }

        await ctx.reply(styleText('⏳ Iniciando sub-bot con QR, por favor espera...'));

        // jadibotManager requiere el socket de Baileys directamente
        const result = await jadibotManager.startSubbot(ctx.args[0], ctx.chatId, ctx.bot.sock);

        if (!result.success) {
            await ctx.reply(styleText(result.message));
        }
    }
};
