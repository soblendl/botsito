import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
const ULTRA_API_KEY = "sk_d5a5dec0-ae72-4c87-901c-cccce885f6e6";
async function ytMp4(url) {
    const { data } = await axios.post("https://api-sky.ultraplus.click/youtube-mp4/resolve",
        { url: url, type: "video", quality: "720" },
        { headers: { apikey: ULTRA_API_KEY }, timeout: 60000 }
    );
    if (data.result?.media?.video) return { ...data.result, url: data.result.media.video };
    if (data.url) return { url: data.url };
    if (data.result?.url) return { ...data.result, url: data.result.url };
    return data.result;
}
export default {
    commands: ['ytmp4', 'ytv', 'video'],
    tags: ['download'],
    help: ['ytmp4 <url>'],
    async execute(ctx) {
        if (!ctx.args[0]) {
            return await ctx.reply(styleText(`ꕤ Por favor proporciona un enlace de YouTube.\n\n*Ejemplo:*\n${ctx.prefix}ytmp4 https://www.youtube.com/watch?v=example`));
        }
        const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
        if (!youtubeRegex.test(ctx.args[0])) {
            return await ctx.reply(styleText(`ꕤ La URL proporcionada no es válida.`));
        }
        const memCheck = global.memoryManager?.canProcessDownload(20 * 1024 * 1024); 
        if (memCheck && !memCheck.allowed) {
            return await ctx.reply(styleText(memCheck.message));
        }
        await ctx.reply(styleText('ꕥ Procesando tu video, por favor espera...'));
        try {
            const info = await ytMp4(ctx.args[0]);
            const videoUrl = info?.url || info?.media?.video;
            if (info?.duration) {
                const durationParts = info.duration.split(':').map(Number);
                const totalSeconds = durationParts.length === 3 
                    ? durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2]
                    : durationParts[0] * 60 + (durationParts[1] || 0);
                if (totalSeconds > 600) { 
                    return await ctx.reply(styleText('ꕤ El video es muy largo (máx. 10 minutos para descargar).'));
                }
            }
            if (videoUrl) {
                const caption = styleText(
                    `⋆.˚*YOUTUBE VIDEO*\n\n` +
                    `> Título » ${info.title || 'Desconocido'}\n` +
                    `> Canal » ${info.author?.name || 'YouTube'}\n` +
                    `> Duración » ${info.duration || 'N/A'}`
                );
                await ctx.bot.sendMessage(ctx.chatId, {
                    video: { url: videoUrl },
                    caption: caption,
                    mimetype: 'video/mp4',
                    fileName: `${(info.title || 'video').replace(/[\/\\:*?"<>|]/g, '_').substring(0, 50)}.mp4`,
                    contextInfo: {
                        externalAdReply: {
                            title: info.title || 'Video',
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
            console.error('YTMP4 Plugin Error:', error);
            if (error.code === 'ENOSPC' || error.message?.includes('ENOSPC')) {
                global.memoryManager?.forceCleanup();
                return await ctx.reply(styleText('ꕤ Error de espacio/memoria. Intenta en unos segundos.'));
            }
            await ctx.reply(styleText('ꕤ Error al descargar el video. Intenta de nuevo más tarde.'));
        }
    }
};
