import { loadLinks, getRandomLink, downloadMedia } from '../lib/nsfw.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['himages'],

    async execute(ctx) {
        console.log('[DEBUG himages] Iniciando execute, ctx:', typeof ctx);
        const { chatId, isGroup, bot, dbService } = ctx;
        console.log('[DEBUG himages] chatId:', chatId, 'isGroup:', isGroup, 'bot:', typeof bot);
        const conn = bot?.sock;
        console.log('[DEBUG himages] conn:', typeof conn);
        if (!conn) {
            console.log('[DEBUG himages] ERROR: No hay conexión');
            return await ctx.reply(styleText('❌ Error: Conexión no disponible.'));
        }
        console.log('[DEBUG himages] Verificando NSFW settings...');
        
        if (isGroup) {
            const groupData = await dbService.getGroup(chatId);
            if (!groupData?.settings?.nsfw) {
                console.log('[DEBUG himages] NSFW desactivado para grupo:', chatId);
                return await ctx.reply(styleText('ꕤ Los comandos NSFW están desactivados en este grupo.'));
            }
        }
        try {
            console.log('[DEBUG himages] Enviando mensaje de carga...');
            await ctx.reply(styleText('ꕤ Cargando imagen hentai...'));
            console.log('[DEBUG himages] Cargando enlaces...');
            const links = await loadLinks('hentai');
            console.log('[DEBUG himages] Enlaces cargados:', links.length);
            if (links.length === 0) {
                console.log('[DEBUG himages] ERROR: No hay enlaces disponibles');
                return await ctx.reply(styleText('ꕤ Error al cargar la base de datos de imágenes.'));
            }
            console.log('[DEBUG himages] Obteniendo enlace aleatorio...');
            const randomUrl = getRandomLink(links);
            console.log('[DEBUG himages] URL seleccionada:', randomUrl);
            const buffer = await downloadMedia(randomUrl);
            console.log('[DEBUG himages] Buffer descargado:', typeof buffer, buffer ? buffer.length : 0);
            if (!buffer) {
                console.log('[DEBUG himages] ERROR: Buffer vacío');
                return await ctx.reply(styleText('ꕤ Error al descargar la imagen.'));
            }
            console.log('[DEBUG himages] Enviando imagen...');
            await conn.sendMessage(chatId, {
                image: buffer,
                caption: styleText('ꕥ Imagen hentai aleatoria')
            });
            console.log('[DEBUG himages] ✓ Imagen enviada correctamente');
        } catch (error) {
            console.error('[DEBUG himages] ✗ ERROR CRÍTICO:', error);
            console.error('[DEBUG himages] Error stack:', error.stack);
            await ctx.reply(styleText('ꕤ Ocurrió un error al procesar la solicitud.'));
        }
    }
};