import { styleText } from '../lib/utils.js';

export default {
    commands: ['wtop', 'topwaifus'],

    async execute(ctx) {
        const { bot, msg, chatId } = ctx;
        const sock = bot.sock || bot;
        const waifus = global.gachaService.characters
            .filter(c => c.voteCount && c.voteCount > 0)
            .sort((a, b) => b.voteCount - a.voteCount)
            .slice(0, 10);

        if (waifus.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ No hay votos registrados aún.')
            });
        }

        let message = 'ꕥ Ranking de Popularidad\n\n';
        message += '➭ Top 10 Personajes más Votados\n\n';

        waifus.forEach((waifu, i) => {
            const medal = i === 0 ? '❶' : i === 1 ? '❷' : i === 2 ? '❸' : `${i + 1}.`;
            message += `${medal} Nombre » ${waifu.name}\n`;
            message += `> ⚘ Votos » ${waifu.voteCount}\n\n`;
        });

        await sock.sendMessage(chatId, { text: styleText(message) });
    }
};
