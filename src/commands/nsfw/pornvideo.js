import { loadLinks, getRandomLink, downloadMedia } from '../../utils/nsfw.js';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['pornvideo', 'pv'],
    async execute(ctx) {
        const { chatId, isGroup, bot } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('ꕢ Error: Conexión no disponible.'));
        }

        if (isGroup) {
            const group = await ctx.dbService.getGroup(chatId);
            if (!group?.settings?.nsfw) {
                return await ctx.reply(styleText('ꕢ Los comandos NSFW están desactivados en este grupo.'));
            }
        }

        try {
            await ctx.reply(styleText('ꕢ Cargando video, esto puede tardar...'));
            const links = await loadLinks('porno');
            if (links.length === 0) {
                return await ctx.reply(styleText('ꕢ Error al cargar la base de datos de videos.'));
            }

            const randomUrl = getRandomLink(links);
            const buffer = await downloadMedia(randomUrl);

            if (!buffer) {
                return await ctx.reply(styleText('ꕢ Error al descargar el video.'));
            }

            await conn.sendMessage(chatId, {
                video: buffer,
                mimetype: 'video/mp4',
                caption: styleText('ꕣ Video aleatorio.'),
                gifPlayback: false
            });
        } catch (error) {
            logger.error('[PornVideo] Error:', error);
            await ctx.reply(styleText('ꕢ Ocurrió un error al procesar la solicitud.'));
        }
    }
};
