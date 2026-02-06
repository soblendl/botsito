import { igdl } from 'ruhend-scraper';
import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['instagram', 'ig', 'igdl'],
    async execute(ctx) {
        try {
            if (ctx.args.length === 0) {
                return await ctx.reply(styleText(
                    `ꕢ *Uso incorrecto del comando*\n\n` +
                    `Ejemplo:\n` +
                    `> #instagram https://www.instagram.com/p/xxxxx\n` +
                    `> #ig https://www.instagram.com/reel/xxxxx`
                ));
            }
            const memCheck = global.memoryManager?.canProcessDownload();
            if (memCheck && !memCheck.allowed) {
                return await ctx.reply(styleText(memCheck.message));
            }
            const url = ctx.args[0];
            if (!url.includes('instagram.com')) {
                return await ctx.reply(styleText('ꕢ Por favor ingresa un link válido de Instagram.'));
            }
            await ctx.reply(styleText('Descargando...'));
            const response = await igdl(url);
            const data = response.data;
            if (!data || data.length === 0) {
                return await ctx.reply(styleText(
                    'ꕢ No se encontró contenido en este enlace.\n\n' +
                    '> *Tip:* Verifica que el enlace sea correcto y público.'
                ));
            }
            const media = data.sort((a, b) => {
                const resA = parseInt(a.resolution || '0');
                const resB = parseInt(b.resolution || '0');
                return resB - resA;
            })[0];
            if (!media || !media.url) {
                throw new Error('No se encontró un medio válido.');
            }
            await ctx.replyWithVideo(media.url, {
                caption: styleText(`ꕣ *Instagram Downloader*\n\n` +
                    `> ✿ *Resolución* » ${media.resolution || 'Desconocida'}\n` +
                    `> ✿ *Link original* » ${url}`)
            });
        } catch (error) {
            console.error('Error en comando instagram:', error);
            if (error.code === 'ENOSPC' || error.message?.includes('ENOSPC')) {
                global.memoryManager?.forceCleanup();
                return await ctx.reply(styleText(
                    'ꕢ Error de espacio/memoria. Intenta en unos segundos.'
                ));
            }
            await ctx.reply(styleText(
                `ꕢ Error al descargar contenido de Instagram.`
            ));
        }
    }
};
