import { styleText } from '../lib/utils.js';

export default {
    commands: ['wimage', 'waifuimage'],
    tags: ['gacha'],
    help: ['wimage <nombre>'],

    async execute(ctx) {
        const { args, gachaService } = ctx;

        if (args.length === 0) {
            return ctx.reply(styleText('ꕤ Debes especificar el nombre del personaje.\nUso: #wimage <personaje>'));
        }

        const query = args.join(' ').toLowerCase();
        const character = gachaService.characters.find(c =>
            c.name.toLowerCase().includes(query) ||
            (c.alias && c.alias.toLowerCase().includes(query))
        );

        if (!character) {
            return ctx.reply(styleText('ꕤ Personaje no encontrado.'));
        }

        if (!character.img || character.img.length === 0) {
            return ctx.reply(styleText(`ꕤ ${character.name} no tiene imágenes registradas.`));
        }

        const randomImg = character.img[Math.floor(Math.random() * character.img.length)];

        try {
            await ctx.replyWithImage(randomImg, {
                caption: styleText(`📸 *${character.name}*\n${character.source || ''}`)
            });
        } catch (error) {
            console.error('[DEBUG] Error sending waifu image:', error);

            if (error.code === 'ENOSPC') {
                return ctx.reply(styleText(
                    `ꕤ Error temporal del servidor (sin espacio).\\n\\n` +
                    `📸 *${character.name}*\\n${character.source || ''}\\n\\n` +
                    `Link: ${randomImg}`
                ));
            }

            // For other errors, send text with link
            return ctx.reply(styleText(
                `ꕤ Error al enviar imagen.\\n\\n` +
                `📸 *${character.name}*\\n${character.source || ''}\\n\\n` +
                `Link: ${randomImg}`
            ));
        }
    }
};
