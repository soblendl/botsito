import axios from 'axios';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['xnxx', 'xnxxdl'],
    tags: ['nsfw', 'download'],
    help: ['xnxx <url>'],

    async execute(ctx) {
        const { chatId, args, prefix, command, isGroup, dbService, reply, replyWithVideo } = ctx;

        // Verificar si es grupo y si NSFW está activo
        if (isGroup) {
            const groupData = dbService.getGroup(chatId);
            if (!groupData.settings?.nsfw) {
                return await reply(styleText('ꕤ Los comandos NSFW están desactivados en este grupo.\n> Un admin debe activarlos con */nsfw on*'));
            }
        }

        if (!args[0]) {
            return await reply(styleText(
                `ꕤ *Uso incorrecto del comando*\n\n` +
                `Ejemplo:\n` +
                `> ${prefix}${command} https://www.xnxx.com/video-example`
            ));
        }

        const url = args[0];
        if (!url.match(/xnxx/i)) {
            return await reply(styleText('ꕤ Por favor ingresa un enlace válido de XNXX.'));
        }

        try {
            await reply(styleText('ꕥ Procesando video... '));

            const response = await axios.get(`https://api.delirius.store/download/xnxxdl?url=${encodeURIComponent(url)}`);

            if (!response.data?.status || !response.data?.data) {
                return await reply(styleText('ꕤ No se pudo descargar el video. Verifica el enlace o intenta de nuevo más tarde.'));
            }

            const { title, duration, quality, views, download } = response.data.data;

            // Usar la calidad high, si no existe usar low
            const videoUrl = download.high || download.low;

            if (!videoUrl) {
                return await reply(styleText('ꕤ No se encontró un enlace de descarga válido.'));
            }

            const caption = `ꕥ *XNXX Downloader*\n\n` +
                `> *Título* » ${title}\n` +
                `> *Duración* » ${duration || 'N/A'}\n` +
                `> *Calidad* » ${quality || 'N/A'}\n` +
                `> *Vistas* » ${views || 'N/A'}\n` +
                `> *Link* » ${url}`;

            await replyWithVideo(videoUrl, {
                caption: styleText(caption),
                fileName: `xnxx_${Date.now()}.mp4`
            });

        } catch (error) {
            console.error('[XNXX DL] Error:', error);
            await reply(styleText('ꕤ Error al descargar el video. Inténtalo más tarde.'));
        }
    }
};