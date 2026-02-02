import { jadibotManager } from '../lib/jadibot.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['cancelarbot', 'stopbot'],

    async execute(ctx) {
        const { sender } = ctx;

        // Extract clean user ID
        const userId = sender.includes('@') ? sender : `${sender}@s.whatsapp.net`;

        const result = jadibotManager.stopSubbot(userId);
        await ctx.reply(styleText(result.message));
    }
};
