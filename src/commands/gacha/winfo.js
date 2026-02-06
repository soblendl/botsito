import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['winfo', 'waifuinfo'],
    tags: ['gacha'],
    help: ['winfo <nombre>'],
    async execute(ctx) {
        const { args, gachaService } = ctx;
        if (args.length === 0) {
            return await ctx.reply(styleText('ꕢ Debes especificar el nombre del personaje.\nUso: #winfo <personaje>'));
        }
        const query = args.join(' ').toLowerCase();
        const character = gachaService.characters.find(c =>
            c.name.toLowerCase().includes(query) ||
            (c.alias && c.alias.toLowerCase().includes(query))
        );
        if (!character) {
            return await ctx.reply(styleText('ꕢ Personaje no encontrado en la base de datos.'));
        }
        const rarity = Math.floor(parseInt(character.value || 0) / 400);
        const stars = '⭐'.repeat(Math.min(rarity, 5)) || '⭐';
        let ownerInfo = 'Nadie';
        if (character.owner) {
            ownerInfo = `@${character.owner.split('@')[0]}`;
        }
        let message = `ꕣ *Información del Personaje*\n\n`;
        message += `ꕢ *Nombre:* ${character.name}\n`;
        message += `ꕢ *Serie:* ${character.source || 'Desconocido'}\n`;
        message += `ꕢ *Rareza:* ${stars} (${character.value})\n`;
        message += `ꕢ *ID:* ${character.id}\n`;
        message += `ꕢ *Dueño:* ${ownerInfo}\n`;
        if (character.gender) {
            message += `ꕢ *Género:* ${character.gender}\n`;
        }
        const imageUrl = character.img && character.img.length > 0 ? character.img[0] : null;
        if (imageUrl) {
            await ctx.replyWithImage(imageUrl, {
                caption: styleText(message),
                mentions: character.owner ? [character.owner] : []
            });
        } else {
            await ctx.reply(styleText(message), {
                mentions: character.owner ? [character.owner] : []
            });
        }
    }
};
