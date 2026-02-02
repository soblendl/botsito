import os from 'os';
import { styleText } from '../lib/utils.js';

function formatUptime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d == 1 ? " día, " : " días, ") : "";
    const hDisplay = h > 0 ? h + (h == 1 ? " hora, " : " horas, ") : "";
    const mDisplay = m > 0 ? m + (m == 1 ? " minuto, " : " minutos, ") : "";
    const sDisplay = s > 0 ? s + (s == 1 ? " segundo" : " segundos") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

export default {
    commands: ['status', 'estado', 'infobot'],
    tags: ['tools'],
    help: ['status'],

    async execute(ctx) {
        const { bot } = ctx;

        const uptime = formatUptime(process.uptime());
        const memory = process.memoryUsage();
        const ramUsage = (memory.rss / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const nodeVersion = process.version;

        const caption = `ꕥ *Bot Status* \n\n` +
            `> *Activo* »${uptime}\n` +
            `> *RAM* » ${ramUsage} MB / ${totalRam} MB\n` +
            `> *Plataforma* » ${platform}\n` +
            `> *NodeJS* » ${nodeVersion}\n` +
            `──────────────────\n` +
            `> _*Powered By DeltaByte*_`;

        await ctx.reply(styleText(caption));
    }
};
