import { jadibotManager } from '../lib/jadibot.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['stopjadibot', 'stopbot'],
    async execute(ctx) {
        const userId = ctx.sender.includes('@') ? ctx.sender : `${ctx.sender}@s.whatsapp.net`;
        const result = jadibotManager.stopSubbot(userId);
        await ctx.reply(styleText(result.message));
    }
};
