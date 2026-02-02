import { styleText } from '../lib/utils.js';
import { OWNER_JID } from '../lib/constants.js';

export default {
    commands: ['memory', 'ram', 'memstatus'],

    async execute(ctx) {
        const memoryManager = global.memoryManager;
        
        if (!memoryManager) {
            return await ctx.reply(styleText('ꕤ MemoryManager no está disponible.'));
        }

        const stats = memoryManager.getStats();
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const statusIcon = stats.isCritical ? '🔴' : (stats.isWarning ? '🟡' : '🟢');
        const heapIcon = stats.heapPercent > 75 ? '🔴' : (stats.heapPercent > 50 ? '🟡' : '🟢');

        const text = `ꕥ *Estado de Memoria*

${statusIcon} *Sistema:*
> RAM Libre » ${formatBytes(stats.freeMemory)}
> RAM Usada » ${formatBytes(stats.usedMemory)}
> RAM Total » ${formatBytes(stats.totalMemory)}
> Uso » ${stats.usedPercent}%

${heapIcon} *Node.js Heap:*
> Heap Usado » ${formatBytes(stats.heapUsed)}
> Heap Total » ${formatBytes(stats.heapTotal)}
> Uso Heap » ${stats.heapPercent}%
> RSS » ${formatBytes(stats.rss)}

📊 *Buffers Activos:*
> Cantidad » ${stats.activeBuffers}
> Tamaño » ${formatBytes(stats.activeBuffersSize)}

📈 *Estadísticas:*
> Descargas » ${stats.totalDownloads}
> Fallidas » ${stats.failedDownloads}
> Rechazadas (tamaño) » ${stats.rejectedBySize}
> Rechazadas (memoria) » ${stats.rejectedByMemory}
> Limpiezas » ${stats.memoryCleanups}`;

        // Solo el owner puede forzar limpieza
        const isOwner = ctx.sender === OWNER_JID || ctx.senderPhone === OWNER_JID.split('@')[0];
        
        if (isOwner && ctx.args[0] === 'clean') {
            memoryManager.forceCleanup();
            return await ctx.reply(styleText(text + '\n\n✅ *Limpieza forzada ejecutada.*'));
        }

        if (isOwner) {
            return await ctx.reply(styleText(text + '\n\n💡 *Tip:* Usa `#memory clean` para forzar limpieza.'));
        }

        await ctx.reply(styleText(text));
    }
};
