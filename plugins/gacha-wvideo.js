import { styleText } from '../lib/utils.js';

export default {
    commands: ['wvideo', 'waifuvideo'],
    tags: ['gacha'],
    help: ['wvideo <nombre>'],

    async execute(ctx) {
        const { args, gachaService, bot, chatId } = ctx;

        if (args.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes especificar el nombre del personaje.\nUso: #wvideo <personaje>'));
        }

        const query = args.join(' ').toLowerCase();
        const character = gachaService.characters.find(c =>
            c.name.toLowerCase().includes(query) ||
            (c.alias && c.alias.toLowerCase().includes(query))
        );

        if (!character) {
            return await ctx.reply(styleText('ꕤ Personaje no encontrado.'));
        }

        if (!character.vid || character.vid.length === 0) {
            return await ctx.reply(styleText(`ꕤ ${character.name} no tiene videos registrados.`))
        }
        const randomVid = character.vid[Math.floor(Math.random() * character.vid.length)];

        await ctx.reply(styleText('ꕤ Enviando video...'));

        try {
            await bot.sock.sendMessage(chatId, {
                video: { url: randomVid },
                caption: styleText(`🎥 *${character.name}*\n${character.source || ''}`),
                gifPlayback: false
            }, { quoted: ctx.msg });
        } catch (error) {
            console.error('Error enviando video:', error);
            await ctx.reply(styleText('ꕤ Error al enviar el video. Puede que el enlace esté caído.'))
        }
    }
};
