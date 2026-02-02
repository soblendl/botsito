import { jadibotManager } from '../lib/jadibot.js';
import { styleText } from '../lib/utils.js';

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

export default {
    commands: ['bots', 'sockets'],

    async execute(ctx) {
        const subbots = jadibotManager.getSubbots();
        const activeCount = subbots.length + 1;
        let message = `ꕥ *Estado de Bots*\n\n`;
        message += `> Bots activos: ${activeCount}\n`;
        message += `> Estado: Online\n`;
        message += `> Uptime: ${formatUptime(process.uptime())}\n\n`;
        if (subbots.length > 0) {
            message += `➭ *Sub-bots*\n`;
            subbots.forEach((bot, i) => {
                message += `> ${i + 1}. ${bot.userId.split('@')[0]}\n`;
            });
        } else {
            message += `> _No hay sub-bots conectados_`;
        }

        await ctx.reply(styleText(message));
    }
};
