import yts from 'yt-search';
import axios from 'axios';
import https from 'https';
import { styleText } from '../../utils/helpers.js';

const tempStorage = {}, searchCache = new Map(), downloadCache = new Map(), tokenCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000, DOWNLOAD_CACHE_DURATION = 30 * 60 * 1000;

export default {
    commands: ['play', 'play2', 'playaudio', 'playvideo'],
    async before(ctx) {
        const { body, sender, bot, chatId } = ctx;
        if (!body) return;
        const text = body.toLowerCase().trim();
        if (!['🎶', 'audio', '📽', 'video'].includes(text)) return;

        const userData = tempStorage[sender];
        if (!userData || !userData.url) return;
        delete tempStorage[sender];

        const isAudio = text === '🎶' || text === 'audio';

        try {
            if (isAudio) {
                await ctx.reply(styleText('⏳ Descargando audio...'));
                const info = await ytMp3(userData.url);
                if (info && info.media && info.media.audio) {
                    const download = await global.SafeDownloader.safeMediaDownload(info.media.audio, {
                        maxSize: 20 * 1024 * 1024,
                        timeout: 120000
                    });
                    if (!download.success) {
                        return await ctx.reply(styleText(`ꕢ Error descarga: ${download.error || 'Desconocido'}`));
                    }
                    await bot.sock.sendMessage(chatId, {
                        audio: { url: download.filePath },
                        mimetype: 'audio/mp4'
                    }, { quoted: ctx.msg });
                    // Cleanup after sending (or let cron handle it if it fails here)
                    // download.cleanup(); // Optional: immediate cleanup, but user asked for 3 min retention so we can leave it
                    await ctx.reply(styleText(`ꕢ Audio enviado.`));
                } else await ctx.reply(styleText('ꕢ No se pudo obtener el enlace de descarga del audio.'));

            } else {
                await ctx.reply(styleText('⏳ Descargando video...'));
                const info = await ytMp4(userData.url);
                if (info && info.url) {
                    const download = await global.SafeDownloader.safeMediaDownload(info.url, {
                        maxSize: 50 * 1024 * 1024,
                        timeout: 180000
                    });
                    if (!download.success) {
                        return await ctx.reply(styleText(`ꕢ Error descarga: ${download.error || 'Desconocido'}`));
                    }
                    await bot.sock.sendMessage(chatId, {
                        video: { url: download.filePath },
                        caption: styleText(`⟡ *${userData.title}*\n> ✦ Calidad: ${info.quality || '720p'}`),
                        fileName: `${cleanFileName(userData.title)}.mp4`,
                        mimetype: 'video/mp4'
                    }, { quoted: ctx.msg });

                    await ctx.reply(styleText(`ꕢ Video enviado.`));
                } else await ctx.reply(styleText('ꕢ No se pudo obtener el enlace de descarga del video.'));
            }
        } catch (error) {
            console.error('Error downloading media:', error);
            await ctx.reply(styleText(`ꕢ Error: ${error.message || 'Error desconocido'}`));
        }
    },
    async execute(ctx) {
        const { args, sender, bot, chatId, command } = ctx;
        if (args.length === 0) return await ctx.reply(styleText('ꕢ Debes ingresar el nombre de la canción.\n> Ejemplo: *#play Billie Eilish*'));
        const query = args.join(' ');
        const isDirectAudio = command === 'playaudio';
        const isDirectVideo = command === 'playvideo';
        try {
            const searchResults = await getCachedSearch(query);
            const video = searchResults.videos[0];
            if (!video) return await ctx.reply(styleText('ꕢ No se encontraron resultados.'));
            console.log(`[DEBUG] Video found: ${video.title} | Seconds: ${video.seconds} | Timestamp: ${video.timestamp}`);
            if (video.seconds > 600) return await ctx.reply(styleText('ꕢ El video supera los 10 minutos de duración. Usa un enlace más corto.'));
            const text = `╭──── *YOUTUBE* ────╮\n> ✎ *Título* » ${video.title}\n> ❁ *Duración* » ${video.timestamp}\n> 👁 *Vistas* » ${formatViews(video.views)}\n> 友 *Autor* » ${video.author.name}\n> • *Link* » ${video.url}\n╰────────────────╯`;
            await bot.sock.sendMessage(chatId, { text: styleText(text), contextInfo: { externalAdReply: { title: video.title, body: `${video.author.name} • ${video.timestamp}`, thumbnailUrl: video.thumbnail, mediaType: 1, renderLargerThumbnail: true, sourceUrl: video.url } } }, { quoted: ctx.msg });
            if (isDirectAudio) {
                try {
                    const info = await ytMp3(video.url);
                    if (info && info.media && info.media.audio) {
                        const download = await global.SafeDownloader.safeMediaDownload(info.media.audio, {
                            maxSize: 20 * 1024 * 1024,
                            timeout: 120000
                        });
                        if (!download.success) return await ctx.reply(styleText(`ꕢ Error: ${download.error}`));

                        await bot.sock.sendMessage(chatId, { audio: { url: download.filePath }, mimetype: 'audio/mp4' }, { quoted: ctx.msg });
                    }
                    else await ctx.reply(styleText('ꕢ No se pudo obtener el enlace de descarga del audio.'));
                } catch (error) {
                    console.error('Error downloading audio:', error);
                    await ctx.reply(styleText(`ꕢ Error: ${error.message || 'Error desconocido'}`));
                }
                return;
            }
            if (isDirectVideo) {
                try {
                    const info = await ytMp4(video.url);
                    if (info && info.url) {
                        const download = await global.SafeDownloader.safeMediaDownload(info.url, {
                            maxSize: 50 * 1024 * 1024,
                            timeout: 180000
                        });
                        if (!download.success) return await ctx.reply(styleText(`ꕢ Error: ${download.error}`));

                        await bot.sock.sendMessage(chatId, {
                            video: { url: download.filePath },
                            caption: styleText(`⟡ *${video.title}*\n> ✦ Calidad: ${info.quality || '720p'}\n> ✿ Autor: ${video.author.name}`),
                            fileName: `${cleanFileName(video.title)}.mp4`,
                            mimetype: 'video/mp4'
                        }, { quoted: ctx.msg });
                    }
                    else await ctx.reply(styleText('ꕢ No se pudo obtener el enlace de descarga del video.'));
                } catch (error) {
                    console.error('Error downloading video:', error);
                    await ctx.reply(styleText(`ꕢ Error: ${error.message || 'Error desconocido'}`));
                }
                return;
            }
            tempStorage[sender] = { url: video.url, title: video.title, timestamp: video.timestamp, views: video.views, author: video.author.name, thumbnail: video.thumbnail };
            const textNormal = `╭──── *YOUTUBE* ────╮\n> ✎ *Título* » ${video.title}\n> ❁ *Duración* » ${video.timestamp}\n> 👁 *Vistas* » ${formatViews(video.views)}\n> 友 *Autor* » ${video.author.name}\n> • *Link* » ${video.url}\n╰────────────────╯\nResponde con:\n🎶 o *audio* para audio\n📽 o *video* para video`;
            const sendMessagePromise = bot.sock.sendMessage(chatId, { text: styleText(textNormal), contextInfo: { externalAdReply: { title: video.title, body: `${video.author.name} • ${video.timestamp}`, thumbnailUrl: video.thumbnail, mediaType: 1, renderLargerThumbnail: true, sourceUrl: video.url } } }, { quoted: ctx.msg });
            const preCachePromise = preCacheDownloadToken(video.url);
            await Promise.all([sendMessagePromise, preCachePromise]);
        } catch (error) {
            console.error('Error in play command:', error);
            await ctx.reply(styleText(`ꕢ Error al buscar: ${error.message}`));
        }
    }
};
async function getCachedSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const cached = searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
    const results = await yts(normalizedQuery);
    searchCache.set(normalizedQuery, { data: results, timestamp: Date.now() });
    if (searchCache.size > 100) searchCache.delete([...searchCache.keys()][0]);
    return results;
}
async function preCacheDownloadToken(videoUrl) { }
async function ytMp3(videoUrl) {
    try {
        const { data } = await axios.get(`https://api-adonix.ultraplus.click/download/ytaudio?apikey=Arlette-Xz&url=${encodeURIComponent(videoUrl)}`);
        console.log('[DEBUG] ytMp3 API Response:', JSON.stringify(data, null, 2));
        if (data && data.status && data.data && data.data.url) {
            return {
                media: { audio: data.data.url },
                title: data.data.title || 'Audio',
                cover: data.data.thumbnail || '',
                author: { name: data.creator || 'Desconocido' }
            };
        }
        throw new Error("No se encontró el enlace de descarga.");
    } catch (error) {
        console.error('Error in ytMp3:', error.message);
        throw new Error(error.message || "Error al procesar MP3");
    }
}
async function ytMp4(url, format = '720') {
    try {
        const { data } = await axios.get(`https://api-adonix.ultraplus.click/download/ytvideo?apikey=Arlette-Xz&url=${encodeURIComponent(url)}`);
        console.log('[DEBUG] ytMp4 API Response:', JSON.stringify(data, null, 2));
        if (data && data.status && data.data && data.data.url) {
            return {
                url: data.data.url,
                quality: format,
                title: data.data.title || 'Video',
                cover: data.data.thumbnail || '',
                author: { name: data.creator || 'Desconocido' }
            };
        }
        throw new Error("No se encontró el enlace de descarga.");
    } catch (error) {
        console.error('Error in ytMp4:', error.message);
        throw new Error(error.message || "Error al descargar el video");
    }
}
function cleanFileName(name) { return name.replace(/[<>:"/\\|?*]/g, "").substring(0, 50); }
function formatViews(views) {
    if (!views) return "No disponible";
    if (views >= 1e9) return (views / 1e9).toFixed(1) + "B";
    if (views >= 1e6) return (views / 1e6).toFixed(1) + "M";
    if (views >= 1e3) return (views / 1e3).toFixed(1) + "K";
    return views.toString();
}