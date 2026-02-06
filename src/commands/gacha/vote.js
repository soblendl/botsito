import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['vote', 'votar'],
    async execute(ctx) {
        const { bot, msg, chatId, sender, args } = ctx;
        const sock = bot.sock || bot;

        
        const COOLDOWN = 24 * 60 * 60 * 1000; 
        const lastVote = ctx.userData?.gacha?.lastVote || 0;
        const now = Date.now();

        if (now - lastVote < COOLDOWN) {
            const remaining = COOLDOWN - (now - lastVote);
            
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            return await sock.sendMessage(chatId, {
                text: styleText(`ꕢ Debes esperar *${hours}h ${minutes}m* para volver a votar.`)
            });
        }

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕢ Debes especificar el nombre del personaje.\nUso: #vote <personaje>')
            });
        }

        const charNameQuery = args.join(' ').toLowerCase();
        const characters = global.gachaService.characters;

        

        let character = characters.find(c => c.name.toLowerCase() === charNameQuery);
        if (!character) {
            character = characters.find(c => c.name.toLowerCase().includes(charNameQuery));
        }

        

        if (!character) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕢ Personaje no encontrado.')
            });
        }

        const result = global.gachaService.vote(sender, character.id);

        if (!result.success) {
            return await sock.sendMessage(chatId, {
                text: styleText(`ꕢ ${result.message}`)
            });
        }

        
        await ctx.dbService.updateUser(sender, {
            'gacha.lastVote': now
        });

        let responseText = `ꕣ Has votado por ${character.name}\n` +
            `> ⚘ votos totales: ${result.character.votes || 0}`;

        if (result.valueCapped) {
            responseText += `\n\n> ⚠️ *La waifu llegó a su valor máximo (15.670)*`;
        }

        await sock.sendMessage(chatId, {
            text: styleText(responseText)
        });
    }
};
