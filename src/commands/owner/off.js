import { isOwner, styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['off', 'apagar', 'shutdown'],
    async execute(ctx) {
        if (!isOwner(ctx.sender, global.botOwner)) {
            return await ctx.reply(styleText('✘ Solo el owner puede usar este comando.'));
        }

        await ctx.reply(styleText('🔴 *Apagando bot...*\n\n> Hasta pronto~'));

        setTimeout(() => {
            logger.info('🔴 Bot apagado por comando del owner');
            process.exit(0);
        }, 1500);
    }
};
