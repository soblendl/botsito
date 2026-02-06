import { styleText, formatNumberLarge, getName } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['season', 'temporada'],
    category: 'economy',
    description: 'Ver información de la temporada actual',
    usage: '#season [top]',
    async execute(ctx) {
        const { args, economySeason, reply, sender, bot, chatId, isGroup } = ctx;
        const [action] = args;

        if (action === 'top' || action === 'leaderboard') {
            const leaderboard = await economySeason.getSeasonLeaderboard(10);

            if (leaderboard.length === 0) {
                return await reply(styleText('📊 Aún no hay datos en la temporada actual.'));
            }

            let message = 'ꕣ Ranking de Temporada\n\n';
            const medals = ['❶', '❷', '❸'];

            let groupMetadata = null;
            if (isGroup && chatId) {
                try {
                    groupMetadata = await bot.groupMetadata(chatId);
                } catch (e) {
                    logger.warn('No se pudo obtener metadata del grupo para leaderboards:', e.message);
                }
            }

            const usersWithNames = await Promise.all(leaderboard.map(async (user) => {
                let displayName = user.name;
                if (!displayName || displayName === 'Usuario') {
                    try {
                        if (chatId) {
                            displayName = await getName(bot, chatId, user.id);
                        }
                        if ((!displayName || displayName === 'Usuario') && groupMetadata) {
                            const participant = groupMetadata.participants.find(p => p.id === user.id);
                            if (participant) {
                                displayName = participant.notify || participant.name || participant.verifiedName;
                            }
                        }
                        if (!displayName || displayName === 'Usuario') {
                            const contact = await bot.getContact(user.id);
                            displayName = contact.notify || contact.name || contact.verifiedName || contact.pushname;
                        }
                    } catch (e) {
                        
                    }
                }

                if (!displayName || displayName === 'Usuario') {
                    displayName = user.id.split('@')[0];
                }
                return { ...user, displayName };
            }));

            usersWithNames.forEach((user, index) => {
                const medal = index < 3 ? medals[index] : `${index + 1}.`;
                message += `${medal} \`${user.displayName}\`\n`;
                message += `> ⛃ Coins » *¥${formatNumberLarge(user.coins)}*\n\n`;
            });

            const userRank = await economySeason.getUserRank(sender);
            if (userRank.rank) {
                message += `—\n📍 Tu posición: #${userRank.rank} (Top ${userRank.percentile}%)`;
            }

            return await reply(styleText(message));
        }

        const stats = await economySeason.getSeasonStats();

        if (!stats) {
            return await reply(styleText('⚠️ No hay temporada activa.'));
        }

        const timeRemaining = stats.timeRemaining;
        let timeMsg = '';
        if (timeRemaining.expired) {
            timeMsg = 'La temporada ha finalizado';
        } else {
            timeMsg = `${timeRemaining.days}d ${timeRemaining.hours}h restantes`;
        }

        const userRank = await economySeason.getUserRank(sender);

        let message = `ꕣ Temporada Actual: *${stats.name}*\n\n`;
        message += `> ⏰ Tiempo restante » *${timeMsg}*\n`;
        message += `> 👥 Participantes » *${stats.participants}*\n`;
        message += `> 💰 Economía Total » *¥${formatNumberLarge(stats.totalCoins)}*\n`;
        message += `> 📊 Promedio » *¥${formatNumberLarge(stats.averageCoins)}*\n`;

        if (userRank.rank) {
            message += `\n🎯 Tu posición: #${userRank.rank}`;
            message += `\n📈 Top ${userRank.percentile}%`;
        }

        message += `\n\n💫 _Usa #season top para ver el ranking_`;

        await reply(styleText(message));
    }
};
