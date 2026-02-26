import { styleText } from '../../utils/helpers.js';

export default {
    commands: ['textpro'],
    tags: ['fun'],
    help: ['textpro <efecto> <texto>'],

    async execute(ctx) {
        const { bot, msg, args, chatId } = ctx;

        if (!args || args.length < 2) {
            return await ctx.reply(styleText('ꕤ Uso: #textpro <efecto> <texto>\n\nEfectos disponibles:\nneon, magma, glitch, thunder, blackpink'));
        }

        const effect = args[0].toLowerCase();
        const content = args.slice(1).join(' ');

        const effects = {
            'neon': 'neon',
            'magma': 'magma',
            'glitch': 'glitch',
            'thunder': 'thunder',
            'blackpink': 'blackpink'
        };

        if (!Object.keys(effects).includes(effect)) {
            return await ctx.reply(styleText('ꕤ Efecto no válido. Disponibles: ' + Object.keys(effects).join(', ')));
        }

        try {
            await ctx.reply(styleText('ꕤ Generando imagen...'));
            const apiUrl = `https://api.stellarwa.xyz/textpro/${effect}?text=${encodeURIComponent(content)}&key=stellar-20J4F8hk`;

            await bot.sock.sendMessage(chatId, {
                image: { url: apiUrl },
                caption: styleText(`🎨 *Efecto:* ${effect}`)
            }, { quoted: msg });

        } catch (error) {
            console.error('Error en textpro:', error);
            await ctx.reply(styleText('ꕤ Error al generar la imagen.'));
        }
    }
};
