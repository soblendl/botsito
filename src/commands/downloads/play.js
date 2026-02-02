import yts from 'yt-search';
import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
const tempStorage = {};
const searchCache = new Map();
const downloadCache = new Map();
const tokenCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; 
const DOWNLOAD_CACHE_DURATION = 30 * 60 * 1000;
export default {
    commands: ['play', 'play2', 'playaudio', 'playvideo'],
    async before(ctx) {
        const { body, sender, bot, chatId } = ctx;
        if (!body) return;
        const text = body.toLowerCase().trim();
        const validOptions = ['🎶', 'audio', '📽', 'video'];
        if (!validOptions.includes(text)) return;
        const userData = tempStorage[sender];
        if (!userData || !userData.url) return;
        delete tempStorage[sender];
        const isAudio = text === '🎶' || text === 'audio';
        const memCheck = global.memoryManager?.canProcessDownload(isAudio ? 10 * 1024 * 1024 : 20 * 1024 * 1024);
        if (memCheck && !memCheck.allowed) {
            return await ctx.reply(styleText(memCheck.message));
        }
        try {
            if (isAudio) {
                const info = await ytMp3(userData.url);
                if (info && info.media && info.media.audio) {
                    await bot.sock.sendMessage(chatId, {
                        audio: { url: info.media.audio },
                        mimetype: 'audio/mp4'
                    }, { quoted: ctx.msg });
                    await ctx.reply(styleText(`ꕤ Audio enviado.`));
                } else {
                    await ctx.reply(styleText('ꕤ No se pudo obtener el enlace de descarga del audio.'));
                }
            } else {
                const info = await ytMp4(userData.url);
                if (info && info.url) {
                    await bot.sock.sendMessage(chatId, {
                        video: { url: info.url },
                        caption: styleText(`⟡ *${userData.title}*\n> ✦ Calidad: ${info.quality || '720p'}`),
                        fileName: `${cleanFileName(userData.title)}.mp4`,
                        mimetype: 'video/mp4'
                    }, { quoted: ctx.msg });
                    await ctx.reply(styleText(`ꕤ Video enviado.`));
                } else {
                    await ctx.reply(styleText('ꕤ No se pudo obtener el enlace de descarga del video.'));
                }
            }
        } catch (error) {
            console.error('Error downloading media:', error);
            if (error.code === 'ENOSPC' || error.message?.includes('ENOSPC')) {
                global.memoryManager?.forceCleanup();
                return await ctx.reply(styleText('ꕤ Error de espacio/memoria. Intenta en unos segundos.'));
            }
            await ctx.reply(styleText(`ꕤ Error: ${error.message || 'Error desconocido'}`));
        }
    },
    async execute(ctx) {
        const { args, sender, bot, chatId, command } = ctx;
        if (args.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes ingresar el nombre de la canción.\n> Ejemplo: *#play Billie Eilish*'));
        }
        const query = args.join(' ');
        const isDirectAudio = command === 'playaudio';
        const isDirectVideo = command === 'playvideo';
        try {
            const searchResults = await getCachedSearch(query);
            const video = searchResults.videos[0];
            if (!video) {
                return await ctx.reply(styleText('ꕤ No se encontraron resultados.'));
            }
            if (video.seconds > 600) {
                return await ctx.reply(styleText('ꕤ El video supera los 10 minutos de duración. Usa un enlace más corto.'));
            }
            const text = `╭──── *YOUTUBE* ────╮
> ✎ *Título* » ${video.title}
> ❁ *Duración* » ${video.timestamp}
> 👁 *Vistas* » ${formatViews(video.views)}
> 友 *Autor* » ${video.author.name}
> • *Link* » ${video.url}
╰────────────────╯`;
            await bot.sock.sendMessage(chatId, {
                text: styleText(text),
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: `${video.author.name} • ${video.timestamp}`,
                        thumbnailUrl: video.thumbnail,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: ctx.msg });
            if (isDirectAudio) {
                const memCheck = global.memoryManager?.canProcessDownload(10 * 1024 * 1024);
                if (memCheck && !memCheck.allowed) {
                    return await ctx.reply(styleText(memCheck.message));
                }
                try {
                    const info = await ytMp3(video.url);
                    if (info && info.media && info.media.audio) {
                        await bot.sock.sendMessage(chatId, {
                            audio: { url: info.media.audio },
                            mimetype: 'audio/mp4'
                        }, { quoted: ctx.msg });
                    } else {
                        await ctx.reply(styleText('ꕤ No se pudo obtener el enlace de descarga del audio.'));
                    }
                } catch (error) {
                    console.error('Error downloading audio:', error);
                    await ctx.reply(styleText(`ꕤ Error: ${error.message || 'Error desconocido'}`));
                }
                return;
            }
            if (isDirectVideo) {
                const memCheck = global.memoryManager?.canProcessDownload(20 * 1024 * 1024);
                if (memCheck && !memCheck.allowed) {
                    return await ctx.reply(styleText(memCheck.message));
                }
                try {
                    const info = await ytMp4(video.url);
                    if (info && info.url) {
                        await bot.sock.sendMessage(chatId, {
                            video: { url: info.url },
                            caption: styleText(`⟡ *${video.title}*\n> ✦ Calidad: ${info.quality || '720p'}\n> ✿ Autor: ${video.author.name}`),
                            fileName: `${cleanFileName(video.title)}.mp4`,
                            mimetype: 'video/mp4'
                        }, { quoted: ctx.msg });
                    } else {
                        await ctx.reply(styleText('ꕤ No se pudo obtener el enlace de descarga del video.'));
                    }
                } catch (error) {
                    console.error('Error downloading video:', error);
                    await ctx.reply(styleText(`ꕤ Error: ${error.message || 'Error desconocido'}`));
                }
                return;
            }
            tempStorage[sender] = {
                url: video.url,
                title: video.title,
                timestamp: video.timestamp,
                views: video.views,
                author: video.author.name,
                thumbnail: video.thumbnail
            };
            const textNormal = `╭──── *YOUTUBE* ────╮
> ✎ *Título* » ${video.title}
> ❁ *Duración* » ${video.timestamp}
> 👁 *Vistas* » ${formatViews(video.views)}
> 友 *Autor* » ${video.author.name}
> • *Link* » ${video.url}
╰────────────────╯
Responde con:
🎶 o *audio* para audio
📽 o *video* para video`;
            const sendMessagePromise = bot.sock.sendMessage(chatId, {
                text: styleText(textNormal),
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: `${video.author.name} • ${video.timestamp}`,
                        thumbnailUrl: video.thumbnail,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: video.url
                    }
                }
            }, { quoted: ctx.msg }); 
            const preCachePromise = preCacheDownloadToken(video.url);
            await Promise.all([sendMessagePromise, preCachePromise]);
        } catch (error) {
            console.error('Error in play command:', error);
            await ctx.reply(styleText(`ꕤ Error al buscar: ${error.message}`));
        }
    }
};
async function getCachedSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const cached = searchCache.get(normalizedQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    const results = await yts(normalizedQuery);
    searchCache.set(normalizedQuery, {
        data: results,
        timestamp: Date.now()
    });
    if (searchCache.size > 100) {
        const oldestKey = [...searchCache.keys()][0];
        searchCache.delete(oldestKey);
    }
    return results;
}
async function preCacheDownloadToken(videoUrl) {
    try {
        const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
        const cfPayload = {
            url: 'https://ezconv.cc',
            siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
        };
        const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);
        if (cfResponse.success && cfResponse.result) {
            tokenCache.set(videoUrl, {
                token: cfResponse.result,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Error pre-caching token:', error);
    }
}
async function ytMp3(videoUrl) {
    try {
        const cached = downloadCache.get(`mp3_${videoUrl}`);
        if (cached && Date.now() - cached.timestamp < DOWNLOAD_CACHE_DURATION) {
            return cached.data;
        }
        let captchaToken;
        const tokenCached = tokenCache.get(videoUrl);
        if (tokenCached && Date.now() - tokenCached.timestamp < 60000) { 
            captchaToken = tokenCached.token;
            tokenCache.delete(videoUrl); 
        } else {
            const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
            const cfPayload = {
                url: 'https://ezconv.cc',
                siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
            };
            const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);
            if (!cfResponse.success || !cfResponse.result) {
                throw new Error('No se pudo obtener el token de captcha');
            }
            captchaToken = cfResponse.result;
        }
        const convertApiUrl = 'https://ds1.ezsrv.net/api/convert';
        const convertPayload = {
            url: videoUrl,
            quality: '320', 
            trim: false,
            startT: 0,
            endT: 0,
            captchaToken: captchaToken
        };
        const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (convertResponse.status !== 'done') {
            throw new Error(`La conversión falló. Estado: ${convertResponse.status}`);
        }
        const result = {
            media: { audio: convertResponse.url },
            title: convertResponse.title,
            cover: null
        };
        downloadCache.set(`mp3_${videoUrl}`, {
            data: result,
            timestamp: Date.now()
        });
        if (downloadCache.size > 50) {
            const oldestKey = [...downloadCache.keys()][0];
            downloadCache.delete(oldestKey);
        }
        return result;
    } catch (error) {
        throw new Error(error.response?.data ? JSON.stringify(error.response.data) : error.message);
    }
}
const snKey = "dfcb6d76f2f6a9894gjkege8a4ab232222";
const snAgent = "Mozilla/5.0 (Android 13; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0";
const snReferer = "https://y2down.cc/enSB/";
const videoFormats = ['144', '240', '360', '720', '1080', '1440', '4k'];
const audioFormats = ['mp3', 'm4a', 'webm', 'aacc', 'flac', 'apus', 'ogg', 'wav'];
async function ytMp4(url, format = '720') {
    if (!videoFormats.includes(format) && !audioFormats.includes(format)) {
        throw new Error("Invalid format");
    }
    try {
        const cached = downloadCache.get(`mp4_${url}_${format}`);
        if (cached && Date.now() - cached.timestamp < DOWNLOAD_CACHE_DURATION) {
            return cached.data;
        }
        const initUrl = `https://p.savenow.to/ajax/download.php?copyright=0&format=${format}&url=${url}&api=${snKey}`;
        const init = await fetch(initUrl, {
            headers: {
                "User-Agent": snAgent,
                "Referer": snReferer
            }
        });
        const data = await init.json();
        if (!data.success) {
            throw new Error("Failed to start download");
        }
        const id = data.id;
        const progressUrl = `https://p.savenow.to/api/progress?id=${id}`;
        let attempts = 0;
        const maxAttempts = 20; 
        const delayMs = 1500; 
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempts++;
            const response = await fetch(progressUrl, {
                headers: {
                    "User-Agent": snAgent,
                    "Referer": snReferer
                }
            });
            const status = await response.json();
            if (status.progress === 1000) {
                const result = {
                    url: status.download_url,
                    quality: format,
                    title: data.title || data.info?.title
                };
                downloadCache.set(`mp4_${url}_${format}`, {
                    data: result,
                    timestamp: Date.now()
                });
                if (downloadCache.size > 50) {
                    const oldestKey = [...downloadCache.keys()][0];
                    downloadCache.delete(oldestKey);
                }
                return result;
            }
        }
        throw new Error("Timeout waiting for download");
    } catch (error) {
        console.error('Error in ytMp4:', error);
        throw new Error(error.message || "Error al descargar el video");
    }
}
function cleanFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, "").substring(0, 50);
}
function formatViews(views) {
    if (!views) return "No disponible";
    if (views >= 1e9) return (views / 1e9).toFixed(1) + "B";
    if (views >= 1e6) return (views / 1e6).toFixed(1) + "M";
    if (views >= 1e3) return (views / 1e3).toFixed(1) + "K";
    return views.toString();
}
