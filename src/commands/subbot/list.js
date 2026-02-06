import { jadibotManager } from '../../services/external/jadibot.js';
import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['listjadibot', 'listbots'],
    async execute(ctx) {
        const subbots = jadibotManager.getSubbots();
        if (subbots.length === 0) {
            return await ctx.reply(styleText('ꕢ No hay sub-bots activos actualmente.'));
        }
        let message = `ꕢ *Sub-Bots Activos* (${subbots.length})\n\n`;
        subbots.forEach((bot, i) => {
            const phoneNumber = bot.userId.split('@')[0];
            message += `${i + 1}. @${phoneNumber}\n`;
        });
        await ctx.reply(styleText(message), {
            mentions: subbots.map(b => b.userId) 
        });
    }
};

