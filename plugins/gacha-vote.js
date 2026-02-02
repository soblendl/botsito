import { styleText } from '../lib/utils.js';

export default {
    commands: ['vote', 'votar'],

    async execute(ctx) {
        const { bot, msg, chatId, sender, args } = ctx;
        const sock = bot.sock || bot;
        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ Debes especificar el nombre del personaje.\nUso: #vote <personaje>')
            });
        }

        const charNameQuery = args.join(' ').toLowerCase();
        const characters = global.gachaService.characters;
        console.log(`[VOTE] Searching for: ${charNameQuery}`);
        let character = characters.find(c => c.name.toLowerCase() === charNameQuery);
        if (!character) {
            character = characters.find(c => c.name.toLowerCase().includes(charNameQuery));
        }

        console.log(`[VOTE] Found: ${character?.name || 'None'}`);

        if (!character) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ Personaje no encontrado.')
            });
        }

        const result = global.gachaService.vote(sender, character.id);

        if (!result.success) {
            return await sock.sendMessage(chatId, {
                text: styleText(`ꕤ ${result.message}`)
            });
        }

        await sock.sendMessage(chatId, {
            text: styleText(`ꕥ Has votado por ${character.name}\n` +
                `> ⚘ votos totales: ${result.character.voteCount || 0}`)
        });
    }
};
