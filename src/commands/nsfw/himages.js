import { loadLinks, getRandomLink, downloadMedia } from '../../utils/nsfw.js';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['himages'],
    async execute(ctx) {
        const { chatId, isGroup, bot, dbService } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('❌ Error: Conexión no disponible.'));
        }

        if (isGroup) {
            const groupData = await dbService.getGroup(chatId);
            if (!groupData?.settings?.nsfw) {
                return await ctx.reply(styleText('ꕤ Los comandos NSFW están desactivados en este grupo.'));
            }
        }

        try {
            await ctx.reply(styleText('ꕤ Cargando imagen hentai...'));
            const links = await loadLinks('hentai');

            if (links.length === 0) {
                return await ctx.reply(styleText('ꕤ Error al cargar la base de datos de imágenes.'));
            }

            const randomUrl = getRandomLink(links);
            const buffer = await downloadMedia(randomUrl);

            if (!buffer) {
                return await ctx.reply(styleText('ꕤ Error al descargar la imagen.'));
            }

            await conn.sendMessage(chatId, {
                image: buffer,
                caption: styleText('ꕥ Imagen hentai aleatoria')
            });
        } catch (error) {
            logger.error('[HIMAGES] Error:', error);
            await ctx.reply(styleText('ꕤ Ocurrió un error al procesar la solicitud.'));
        }
    }
};
