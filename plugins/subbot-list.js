import { jadibotManager } from '../lib/jadibot.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['listjadibot', 'listbots'],

    async execute(ctx) {
        const subbots = jadibotManager.getSubbots();

        if (subbots.length === 0) {
            return await ctx.reply(styleText('ꕤ No hay sub-bots activos actualmente.'));
        }

        let message = `ꕤ *Sub-Bots Activos* (${subbots.length})\n\n`;
        subbots.forEach((bot, i) => {
            // Extract phone number for display (userId is already in format: number@s.whatsapp.net)
            const phoneNumber = bot.userId.split('@')[0];
            message += `${i + 1}. @${phoneNumber}\n`;
        });

        await ctx.reply(styleText(message), {
            mentions: subbots.map(b => b.userId) // userId already has @s.whatsapp.net format
        });
    }
};
