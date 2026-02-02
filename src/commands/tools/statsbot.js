import { styleText, formatNumber } from '../../utils/helpers.js';
import os from 'os';
import v8 from 'v8';
import { performance } from 'perf_hooks';

export default {
    commands: ['statsbot', 'status', 'infobot'],
    tags: ['tools'],
    help: ['statsbot'],

    async execute(ctx) {
        const { bot, dbService } = ctx;

        // Medir tiempo de respuesta (Ping estimativo)
        const start = performance.now();
        const end = performance.now();
        const latency = (end - start).toFixed(2);

        // Información del Sistema
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const nodeMem = process.memoryUsage().rss;

        // Uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Estadísticas de DB y Bot (Esperar promesas en paralelo para velocidad)
        const [dbStats, groups] = await Promise.all([
            dbService.getStats(),
            bot.sock.groupFetchAllParticipating().catch(() => ({}))
        ]);

        const totalGroups = Object.keys(groups).length;
        const totalUsers = dbStats.users || 0;

        // Formatear bytes a MB/GB
        const formatBytes = (bytes) => {
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) return '0 Byte';
            const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
        };

        const text = `
📊 *ESTADO DEL SISTEMA* 📊

⚡ *Rendimiento*
> 🟢 RAM (Node): ${formatBytes(nodeMem)}
> 🖥️ RAM (Total): ${formatBytes(usedMem)} / ${formatBytes(totalMem)}
> ⏱️ Uptime: ${uptimeStr}
> 🚀 Ping: ${latency}ms

📈 *Estadísticas*
> 👥 Usuarios: ${formatNumber(totalUsers)}
> 🛡️ Grupos: ${formatNumber(totalGroups)}
> 🤖 Plataforma: ${os.platform()} (${os.arch()})
> 📦 Node.js: ${process.version}

💾 *Base de Datos*
> 📁 Caché Usuarios: ${dbService.getCacheStats?.().users?.size || 'N/A'}
> 📁 Caché Grupos: ${dbService.getCacheStats?.().groups?.size || 'N/A'}
`.trim();

        await ctx.reply(styleText(text));
    }
};
