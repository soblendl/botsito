import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['ainfo', 'animeinfo'],
    tags: ['gacha'],
    help: ['ainfo <nombre del anime>'],
    async execute(ctx) {
        const { text, gachaService } = ctx;

        if (!text) {
            return await ctx.reply('ꕢ Debes especificar el nombre de un anime.\nEjemplo: #ainfo Naruto');
        }

        const cleanText = text.replace(/^#?\w+\s+/, '').trim();
        const searchTerm = cleanText.toLowerCase();

        const charactersFromAnime = gachaService.characters.filter(char => {
            const hasSource = char.source && char.source.toLowerCase().includes(searchTerm);
            return hasSource;
        });

        if (charactersFromAnime.length === 0) {
            return await ctx.reply(styleText(`ꕢ No se encontraron personajes del anime "${text}" en el gacha.`));
        }

        charactersFromAnime.sort((a, b) => b.value - a.value);

        let message = `🎌 *Personajes de "${text}"*\n\n`;
        message += `📊 Total: ${charactersFromAnime.length} personajes\n\n`;

        const rarityGroups = {};
        charactersFromAnime.forEach(char => {
            const rarity = char.value || 0;
            if (!rarityGroups[rarity]) {
                rarityGroups[rarity] = [];
            }
            rarityGroups[rarity].push(char);
        });

        const rarities = Object.keys(rarityGroups).sort((a, b) => b - a);

        for (const rarity of rarities) {
            const chars = rarityGroups[rarity];
            message += `✨ *Rareza ${rarity}:*\n`;
            chars.forEach(char => {
                message += `• ${char.name} (ID: ${char.id})\n`;
            });
            message += '\n';
        }

        message += `━━━━━━━━━━━━━━━\n`;
        message += `💡 Usa #winfo <nombre> para más detalles`;

        await ctx.reply(styleText(message));
    }
};
