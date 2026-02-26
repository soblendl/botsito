import { jadibotManager } from '../../services/external/jadibot.js';
import { styleText } from '../../utils/helpers.js';

export default {
    commands: ['bots', 'sockets'],
    tags: ['tools'],
    help: ['bots', 'sockets'],

    async execute(ctx) {
        const { bot, chatId, isGroup, prembotManager, args } = ctx;

        if (args[0] === 'complete') {
            try {
                const fs = await import('fs');
                const path = await import('path');

                const subbotsDir = path.join(process.cwd(), 'subbots');
                const prembotsDir = path.join(process.cwd(), 'prembots');

                const getDirCount = (dir) => {
                    try {
                        return fs.readdirSync(dir).filter(file => fs.statSync(path.join(dir, file)).isDirectory()).length;
                    } catch {
                        return 0;
                    }
                };

                const subbotsList = jadibotManager.getSubbots();
                const prembotsList = Array.from(prembotManager.prembots.entries());
                const activeSubbots = subbotsList.length;
                const activePrembots = prembotsList.length;

                const regSubbots = getDirCount(subbotsDir);
                const regPrembots = getDirCount(prembotsDir);

                const systemOpen = global.db?.settings?.subbotsOpen !== false;
                const sessionLimit = global.db?.settings?.subbotSessionLimit;
                const systemIcon = systemOpen ? '🟢' : '🔴';

                let message = 'ꕣ *Estado Completo de Sockets*\n\n';

                message += `> ${systemIcon} *Sistema* » *${systemOpen ? 'Abierto' : 'Cerrado'}*\n`;
                if (sessionLimit) {
                    const available = Math.max(0, sessionLimit - activeSubbots);
                    message += `> *Límite* » *${sessionLimit}* (${available} disponibles)\n`;
                }
                message += '\n';

                message += `> *Activos* » *${activeSubbots + activePrembots}*\n`;
                message += `  ● *Sub-Bots* » *${activeSubbots}*\n`;
                message += `  ● *Prem-Bots* » *${activePrembots}*\n\n`;

                message += `> *Registrados* » *${regSubbots + regPrembots}*\n`;
                message += `  ● *Sub-Bots* » *${regSubbots}*\n`;
                message += `  ● *Prem-Bots* » *${regPrembots}*\n\n`;

                if (activeSubbots > 0) {
                    message += `> *Sub-Bots Conectados:*\n`;
                    subbotsList.forEach((sb, i) => {
                        const num = sb.userId.split('@')[0];
                        message += `  ${i + 1}. *${num}* » Sub-Bot\n`;
                    });
                    message += '\n';
                }

                if (activePrembots > 0) {
                    message += `> *Prem-Bots Conectados:*\n`;
                    prembotsList.forEach(([userId, data], i) => {
                        const num = userId.split('@')[0];
                        message += `  ${i + 1}. *${num}* » Prem-Bot\n`;
                    });
                    message += '\n';
                }

                if (activeSubbots === 0 && activePrembots === 0) {
                    message += `> _No hay bots conectados actualmente._\n`;
                }

                if (global.nodeManager) {
                    const nodes = global.nodeManager.getStatus();
                    message += `\n> *Cluster (${nodes.length} nodos):*\n`;
                    nodes.forEach(n => {
                        const icon = n.online ? '🟢' : '🔴';
                        const mem = n.memory ? ` | ${n.memory.used}MB RAM` : '';
                        message += `  ${icon} *${n.id}* » ${n.sessions}/${n.maxSessions}${mem}\n`;
                    });
                }

                return await ctx.reply(styleText(message));
            } catch (error) {
                console.error('Error in sockets complete:', error);
                return await ctx.reply(styleText('ꕢ Error al obtener estadísticas completas.'));
            }
        }

        if (!isGroup) {
            return await ctx.reply(styleText('ꕢ Este comando solo funciona en grupos.'));
        }

        try {
            const groupMetadata = await bot.groupMetadata(chatId);
            const participants = groupMetadata.participants.map(p => p.id);

            // Get all active bot IDs
            const subbots = jadibotManager.getSubbots();
            const prembots = Array.from(prembotManager.prembots.values());

            const groupBots = [];

            // Check for Sub-Bots in group
            subbots.forEach(sb => {
                const sbId = sb.userId; // e.g. 123456@s.whatsapp.net
                if (participants.includes(sbId)) {
                    groupBots.push({
                        id: sbId,
                        type: 'Sub-Bot',
                        name: sb.name || sbId.split('@')[0]
                    });
                }
            });

            // Check for Prem-Bots in group
            prembots.forEach(pb => {
                const pbId = pb.userId;
                if (participants.includes(pbId)) {
                    // Avoid duplicates if a bot is somehow both (unlikely)
                    if (!groupBots.find(b => b.id === pbId)) {
                        groupBots.push({
                            id: pbId,
                            type: 'Prem-Bot',
                            name: pbId.split('@')[0] // PrembotManager doesn't store name in values easily, use ID
                        });
                    }
                }
            });

            // Add ID of the bot executing the command if it's not already in list (e.g. main bot)
            const currentBotId = bot.sock?.user?.id?.split(':')[0] + '@s.whatsapp.net';
            const isMainBot = !groupBots.find(b => b.id === currentBotId);

            // We only want to list "extra" bots, or all bots? 
            // The request says "Bots en el grupo", so we should list all identified bots.
            // Main bot logic: The main bot isn't "registered" in these managers usually.
            // Let's assume the user wants to see OTHER bots or all bots including the one responding.

            // Let's verify compatibility with the requested format:
            // > *(usuario) » (Prem-Bot/Sub-Bot)

            // Filter main bot if needed, but usually main bot is considered "The Bot". 
            // If the current bot is a Prembot/Subbot it will be in the list.
            // If it's the MAIN host bot, it won't be in those lists.

            let message = 'ꕣ *Bots en el grupo*\n\n';

            if (groupBots.length === 0) {
                message += '> _No hay bots registrados (Prem/Sub) en este grupo._';
            } else {
                groupBots.forEach(bot => {
                    const number = bot.id.split('@')[0];
                    message += `> ● *${number}* » *[ ${bot.type} ]*\n`;
                });
            }

            await ctx.reply(styleText(message));

        } catch (error) {
            console.error('Error in bots command:', error);
            await ctx.reply(styleText('ꕢ Ocurrió un error al buscar bots.'));
        }
    }
};
