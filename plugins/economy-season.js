import { styleText } from '../lib/utils.js';

export default {
    commands: ['season', 'temporada'],
    category: 'economy',
    description: 'Ver información de la temporada actual',
    usage: '#season [top]',

    async execute(ctx) {
        const [action] = ctx.args;

        if (action === 'top' || action === 'leaderboard') {
            const leaderboard = await ctx.economySeason.getSeasonLeaderboard(10);

            if (leaderboard.length === 0) {
                return await ctx.reply(styleText('📊 Aún no hay datos en la temporada actual.'));
            }

            let message = '🏆 *TOP 10 TEMPORADA*\n\n';

            const medals = ['🥇', '🥈', '🥉'];
            leaderboard.forEach((user, index) => {
                const medal = index < 3 ? medals[index] : `${index + 1}.`;
                const userId = user.id.split('@')[0];
                message += `${medal} @${userId}\n   💰 ${user.coins.toLocaleString()} monedas\n\n`;
            });

            const userRank = await ctx.economySeason.getUserRank(ctx.sender);
            if (userRank.rank) {
                message += `\n📍 Tu posición: #${userRank.rank} (Top ${userRank.percentile}%)`;
            }

            return await ctx.reply(styleText(message));
        }

        const stats = await ctx.economySeason.getSeasonStats();

        if (!stats) {
            return await ctx.reply(styleText('⚠️ No hay temporada activa.'));
        }

        const timeRemaining = stats.timeRemaining;
        let timeMsg = '';

        if (timeRemaining.expired) {
            timeMsg = 'La temporada ha finalizado';
        } else {
            timeMsg = `${timeRemaining.days}d ${timeRemaining.hours}h restantes`;
        }

        const userRank = await ctx.economySeason.getUserRank(ctx.sender);

        let message = `📅 *${stats.name}*\n\n`;
        message += `⏰ ${timeMsg}\n`;
        message += `👥 ${stats.participants} participantes\n`;
        message += `💰 ${stats.totalCoins.toLocaleString()} monedas totales\n`;
        message += `📊 Promedio: ${stats.averageCoins.toLocaleString()}\n`;

        if (userRank.rank) {
            message += `\n🎯 Tu posición: #${userRank.rank}`;
            message += `\n📈 Top ${userRank.percentile}%`;
        }

        message += `\n\nUsa #season top para ver el ranking`;

        await ctx.reply(styleText(message));
    }
};
