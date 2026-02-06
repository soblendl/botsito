import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['mediafire', 'mf', 'mfdl'],
    async execute(ctx) {

        const { cacheManager } = ctx;
        try {
            if (ctx.args.length === 0) {
                return await ctx.reply(styleText(
                    `《✧》 *Uso incorrecto del comando*\n\n` +
                    `Ejemplo:\n` +
                    `✿ #mediafire https://www.mediafire.com/file/xxxxx`
                ));
            }

            const url = ctx.args[0];
            if (!url.includes('mediafire.com')) {
                return await ctx.reply(styleText('《✧》 Por favor ingresa un link válido de MediaFire.'));
            }

            
            await ctx.reply(styleText('Procesando descarga...'));

            const apiUrl = `https://dark-core-api.vercel.app/api/download/mediafire?key=api&url=${encodeURIComponent(url)}`;
            let data = cacheManager.get(apiUrl);

            if (!data) {
                console.log('[DEBUG] Mediafire: Fetching from API...', apiUrl);
                try {
                    const response = await axios.get(apiUrl, { timeout: 30000 });
                    data = response.data;
                    console.log('[DEBUG] Mediafire API Response:', JSON.stringify(data, null, 2));
                    cacheManager.set(apiUrl, data, 60 * 60);
                } catch (apiError) {
                    console.error('[DEBUG] Mediafire API Error:', apiError.message);
                    return await ctx.reply(styleText('ꕢ Error al conectar con la API de descarga.'));
                }
            } else {
                console.log('[DEBUG] Mediafire: Using cached data');
            }

            
            if (!data) {
                return await ctx.reply(styleText('ꕢ No se recibieron datos de la API.'));
            }

            
            const downloadUrl = data.url || data.link;

            if (!downloadUrl) {
                console.log('[DEBUG] Mediafire: Missing URL in data:', Object.keys(data));
                return await ctx.reply(styleText('ꕢ No se pudo obtener el enlace de descarga.'));
            }

            const caption = styleText(`╔═══《 MEDIAFIRE 》═══╗\n` +
                `║\n` +
                `║ ✦ *Nombre:* ${data.title || data.filename || 'Desconocido'}\n` +
                `║ ✦ *Peso:* ${data.size || 'N/A'}\n` +
                `║\n` +
                `╚═════════════════╝`);

            
            console.log('[DEBUG] Mediafire: Downloading stream from:', downloadUrl);
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream',
                timeout: 60000
            });

            const fileName = data.filename || data.title || 'archivo';
            const mimetype = response.headers['content-type'] || 'application/octet-stream';
            const messageOptions = {
                caption: caption,
                fileName: fileName,
                mimetype: mimetype
            };

            const stream = response.data;

            if (mimetype.includes('image')) {
                await ctx.bot.sendMessage(ctx.chatId, { image: { stream }, ...messageOptions }, { quoted: ctx.msg });
            } else if (mimetype.includes('video')) {
                await ctx.bot.sendMessage(ctx.chatId, { video: { stream }, ...messageOptions }, { quoted: ctx.msg });
            } else if (mimetype.includes('audio')) {
                await ctx.bot.sendMessage(ctx.chatId, { audio: { stream }, ...messageOptions }, { quoted: ctx.msg });
            } else {
                await ctx.bot.sendMessage(ctx.chatId, { document: { stream }, ...messageOptions }, { quoted: ctx.msg });
            }

        } catch (error) {
            console.error('Error en comando mediafire:', error);
            await ctx.reply(styleText(
                `ꕢ Error al procesar el enlace de MediaFire.\n\n> *Tip:* Asegúrate de que el enlace de MediaFire sea válido y público.`
            ));
        }
    }
};
