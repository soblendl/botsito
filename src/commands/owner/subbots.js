import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['close', 'open', 'set'],
    tags: ['owner'],
    async execute(ctx) {
        if (!ctx.isOwner) return await ctx.reply(styleText('ꕢ Solo el owner puede usar este comando.'));
        const { args, command } = ctx;
        if (!global.db.settings) global.db.settings = {};

        if (command === 'close' && args[0] === 'system' && args[1] === 'subbots') {
            global.db.settings.subbotsOpen = false;
            ctx.dbService?.markDirty?.();
            return await ctx.reply(styleText(
                `ꕣ *Sistema de SubBots Cerrado*\n\n` +
                `Ya no se permitirán nuevas vinculaciones de subbots.\n\n` +
                `> _Usa #open system subbots para reabrir_`
            ));
        }

        if (command === 'open' && args[0] === 'system' && args[1] === 'subbots') {
            global.db.settings.subbotsOpen = true;
            ctx.dbService?.markDirty?.();
            return await ctx.reply(styleText(
                `ꕣ *Sistema de SubBots Abierto*\n\n` +
                `Se permiten nuevas vinculaciones de subbots.\n\n` +
                `> _Usa #close system subbots para cerrar_`
            ));
        }

        if (command === 'set' && args[0] === 'limit' && args[2] === 'sessions') {
            const limit = parseInt(args[1]);
            if (isNaN(limit) || limit < 0) {
                return await ctx.reply(styleText('ꕢ Debes especificar un número válido.\n\n> Ejemplo: #set limit 5 sessions'));
            }
            if (limit === 0) {
                delete global.db.settings.subbotSessionLimit;
                ctx.dbService?.markDirty?.();
                return await ctx.reply(styleText(
                    `ꕣ *Límite de Sesiones Eliminado*\n\n` +
                    `> Ya no hay límite de sesiones para subbots.`
                ));
            }
            global.db.settings.subbotSessionLimit = limit;
            ctx.dbService?.markDirty?.();
            let currentActive = 0;
            if (global.nodeManager) {
                currentActive = global.nodeManager.getTotalSessions();
            } else {
                const { jadibotManager } = await import('../../services/external/jadibot.js');
                currentActive = jadibotManager.subbots.size;
            }
            return await ctx.reply(styleText(
                `ꕣ *Límite de Sesiones Configurado*\n\n` +
                `> *Límite* » *${limit}*\n` +
                `> *Activos* » *${currentActive}*\n` +
                `> *Disponibles* » *${Math.max(0, limit - currentActive)}*\n\n` +
                `> _Si no hay espacios, los nuevos subbots serán rechazados_`
            ));
        }

        if (command === 'set' && args[0] === 'nodes') {
            if (!global.nodeManager) {
                return await ctx.reply(styleText('ꕢ NodeManager no está activo. Solo funciona en el servidor principal.'));
            }
            await global.nodeManager.checkHealth();
            const nodes = global.nodeManager.getStatus();
            let message = 'ꕣ *Estado del Cluster*\n\n';
            let totalSessions = 0;
            nodes.forEach(n => {
                const icon = n.online ? '🟢' : '🔴';
                const mem = n.memory ? `${n.memory.used}/${n.memory.total}MB` : 'N/A';
                message += `${icon} *${n.id}*${n.local ? ' (local)' : ''}\n`;
                message += `  > Sesiones: *${n.sessions}/${n.maxSessions}*\n`;
                message += `  > RAM: *${mem}*\n\n`;
                totalSessions += n.sessions || 0;
            });
            message += `> *Total sesiones:* ${totalSessions}`;
            return await ctx.reply(styleText(message));
        }
    }
};
