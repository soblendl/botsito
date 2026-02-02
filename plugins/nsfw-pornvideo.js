import { loadLinks, getRandomLink, downloadMedia } from '../lib/nsfw.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['pornvideo', 'pv'],

    async execute(ctx) {
        const { chatId, isGroup, bot } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('ꕤ Error: Conexión no disponible.'));
        }

        if (isGroup) {
            const group = await ctx.dbService.getGroup(chatId);
            if (!group?.settings?.nsfw) {
                return await ctx.reply(styleText('ꕤ Los comandos NSFW están desactivados en este grupo.'));
            }
        }

        try {
            await ctx.reply(styleText('ꕤ Cargando video, esto puede tardar...'));

            const links = await loadLinks('porno');

            if (links.length === 0) {
                return await ctx.reply(styleText('ꕤ Error al cargar la base de datos de videos.'));
            }

            const randomUrl = getRandomLink(links);
            const buffer = await downloadMedia(randomUrl);

            if (!buffer) {
                return await ctx.reply(styleText('ꕤ Error al descargar el video.'));
            }

            // Enviar video con mimetype correcto para reproducción
            await conn.sendMessage(chatId, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: styleText('ꕥ Video aleatorio.'),
                gifPlayback: false
            });

        } catch (error) {
            console.error('[PornVideo] Error:', error);
            await ctx.reply(styleText('ꕤ Ocurrió un error al procesar la solicitud.'));
        }
    }
};
