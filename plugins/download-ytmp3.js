import axios from 'axios';
import { styleText } from '../lib/utils.js';

const ULTRA_API_KEY = "sk_d5a5dec0-ae72-4c87-901c-cccce885f6e6";

async function ytMp3(url) {
    const { data } = await axios.post("https://api-sky.ultraplus.click/youtube-mp3", { url }, {
        headers: { apikey: ULTRA_API_KEY }
    });
    if (data.status) return data.result;
    throw new Error(data.message || "Error al procesar MP3");
}

export default {
    commands: ['ytmp3', 'yta', 'audio'],
    tags: ['download'],
    help: ['ytmp3 <url>'],

    async execute(ctx) {
        if (!ctx.args[0]) {
            return await ctx.reply(styleText(`ꕤ Por favor proporciona un enlace de YouTube.\n\n*Ejemplo:*\n${ctx.prefix}ytmp3 https://www.youtube.com/watch?v=example`));
        }

        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (!youtubeRegex.test(ctx.args[0])) {
            return await ctx.reply(styleText(`ꕤ La URL proporcionada no es válida.`));
        }

        await ctx.reply(styleText('ꕥ Procesando tu audio, por favor espera...'));

        try {
            const info = await ytMp3(ctx.args[0]);

            if (info && info.media && info.media.audio) {
                const caption = styleText(
                    `⋆.˚*YOUTUBE AUDIO*\n\n` +
                    `> Título » ${info.title}\n` +
                    `> Canal » ${info.author?.name || 'Desconocido'}\n` +
                    `> Duración » ${info.duration || 'N/A'}`
                );

                await ctx.bot.sendMessage(ctx.chatId, {
                    audio: { url: info.media.audio },
                    mimetype: 'audio/mpeg',
                    fileName: `${info.title.replace(/[\/\\:*?"<>|]/g, '_')}.mp3`,
                    contextInfo: {
                        externalAdReply: {
                            title: info.title,
                            body: info.author?.name || 'YouTube',
                            thumbnailUrl: info.cover || '',
                            sourceUrl: ctx.args[0],
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: ctx.msg });
            } else {
                throw new Error('No se pudo obtener el enlace de descarga.');
            }

        } catch (error) {
            console.error('YTMP3 Plugin Error:', error);
            await ctx.reply(styleText('ꕤ Error al descargar el audio. Intenta de nuevo más tarde.'));
        }
    }
};
