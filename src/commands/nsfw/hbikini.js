import { loadLinks, getRandomLink, downloadMedia } from '../../utils/nsfw.js';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['hbikini'],
    async execute(ctx) {
        const { chatId, isGroup, bot } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('❌ Error: Conexión no disponible.'));
        }

        if (isGroup) {
            const groupData = await ctx.dbService.getGroup(chatId);
            if (!groupData?.settings?.nsfw) {
                return await ctx.reply(styleText('ꕢ Los comandos NSFW están desactivados en este grupo.'));
            }
        }

        try {
            await ctx.reply(styleText('ꕢ Cargando imagen hentai bikini...'));
            const links = await loadLinks('hentaiSemi');
            if (links.length === 0) {
                return await ctx.reply(styleText('ꕢ Error al cargar la base de datos de imágenes.'));
            }

            const randomUrl = getRandomLink(links);
            const buffer = await downloadMedia(randomUrl);

            if (!buffer) {
                return await ctx.reply(styleText('ꕢ Error al descargar la imagen.'));
            }

            await conn.sendMessage(chatId, {
                image: buffer,
                caption: styleText('ꕣ Imagen hentai bikini aleatoria')
            });
        } catch (error) {
            logger.error('[HBIKINI] Error:', error);
            await ctx.reply(styleText('ꕢ Ocurrió un error al procesar la solicitud.'));
        }
    }
};
