import { isOwner, styleText } from '../../utils/helpers.js';
import { spawn } from 'child_process';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['restart', 'reiniciar', 'reboot'],
    async execute(ctx) {
        if (!isOwner(ctx.sender, global.botOwner)) {
            return await ctx.reply(styleText('✘ Solo el owner puede usar este comando.'));
        }

        await ctx.reply(styleText('🔄 *Reiniciando bot...*\n\n> Volveré en unos segundos~'));

        setTimeout(() => {
            logger.info('🔄 Bot reiniciando por comando del owner');
            const args = process.argv.slice(1);
            const child = spawn(process.argv[0], args, {
                detached: true,
                stdio: 'inherit',
                cwd: process.cwd()
            });
            child.unref();
            process.exit(0);
        }, 1500);
    }
};
