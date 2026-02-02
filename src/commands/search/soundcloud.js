import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

const SEARCH_API = 'https://api.delirius.store/search/soundcloud';
const DOWNLOAD_API = 'https://api.delirius.store/download/soundcloud';
const SESSION_TIMEOUT = 5 * 60 * 1000;

async function scSearch(query) {
    try {
        const res = await axios.get(`${SEARCH_API}?q=${encodeURIComponent(query)}&limit=5`);
        return res.data?.data || [];
    } catch (err) {
        logger.error('Error searching:', err.message);
        throw new Error('No se pudo realizar la búsqueda');
    }
}

async function scDownload(url) {
    try {
        const encoded = encodeURIComponent(url);
        const res = await axios.get(`${DOWNLOAD_API}?url=${encoded}`);
        return res.data?.data || null;
    } catch (err) {
        logger.error('Error downloading:', err.message);
        throw new Error('No se pudo descargar el audio');
    }
}

async function sendSoundCloud(ctx, url) {
    const { bot, chatId, m } = ctx;
    const conn = bot?.sock;
    if (!conn) {
        throw new Error('Conexión no disponible');
    }
    try {
        const data = await scDownload(url);
        if (!data || !data.download) { return await ctx.reply(styleText('⚠️ Error al obtener el enlace de audio.')) }
        const title = data.title || 'Desconocido'
        const author = data.author || 'Artista desconocido'
        const link = data.link || url
        const caption = `🎵 *${title}*\n👤 ${author}\n🔗 ${link}`
        const thumb = data.image || data.author_avatar;

        if (thumb) {
            try {
                await conn.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: styleText(caption)
                });
            } catch (imgErr) {
                logger.error('Error enviando imagen:', imgErr);
                await ctx.reply(styleText(caption))
            }
        } else {
            await ctx.reply(styleText(caption));
        }

        await conn.sendMessage(
            chatId,
            {
                document: { url: data.download },
                mimetype: 'audio/mpeg',
                fileName: `${title.replace(/[/\\?%*:|"<>]/g, '_')}.mp3`,
                caption: ''
            },
            { quoted: m }
        );
    } catch (err) {
        logger.error('Error sending audio:', err);
        throw err;
    }
}

export default {
    commands: ['soundcloud', 'scsearch'],
    tags: ['search'],
    help: ['soundcloud <texto>'],
    async execute(ctx) {
        const { text, prefix, command, sender } = ctx
        try {
            if (!global.scsearch) {
                global.scsearch = {};
            }
            if (!text) {
                return await ctx.reply(styleText(
                    `📻 *Ejemplo:* ${prefix}${command} ncs\n\nPara buscar canciones en SoundCloud.`
                ));
            }
            const result = await scSearch(text)
            if (!result || result.length === 0) { return await ctx.reply(styleText('❌ No se encontraron resultados.')) }
            if (result.length === 1) {
                const song = result[0];
                await sendSoundCloud(ctx, song.link);
                return;
            }
            const list = result
                .map((v, i) => {
                    const title = v.title || 'Sin título';
                    const artist = v.artist || 'Artista desconocido';
                    const link = v.link || '';
                    return `*${i + 1}.* 🎵 ${title}\n👤 ${artist}\n🔗 ${link}`;
                })
                .join('\n\n');
            await ctx.reply(styleText(
                `🎧 *Resultados de SoundCloud:*\n\n${list}\n\n` +
                `Escribe el número *1 - ${result.length}* para descargar.`
            ));
            global.scsearch[sender] = result
            setTimeout(() => {
                if (global.scsearch[sender]) {
                    delete global.scsearch[sender]
                }
            }, SESSION_TIMEOUT)
        } catch (err) {
            logger.error('Error en execute:', err);
            await ctx.reply(styleText('⚠️ Ocurrió un error al buscar: ' + err.message));
        }
    },
    async before(ctx) {
        try {
            const { text, sender } = ctx
            if (!text || !global.scsearch?.[sender]) { return false }
            const results = global.scsearch[sender];
            const num = parseInt(text.trim());
            if (isNaN(num) || num < 1 || num > results.length) { return false }
            const song = results[num - 1];
            delete global.scsearch[sender];
            try {
                await sendSoundCloud(ctx, song.link);
            } catch (err) {
                logger.error('Error enviando audio:', err);
                await ctx.reply(styleText('❌ Error al enviar el archivo de audio.'));
            }
            return true
        } catch (err) {
            logger.error('Error in soundcloud before:', err);
            return false;
        }
    }
};
