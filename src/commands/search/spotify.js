import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

const SPOTIFY_CLIENT_ID = '139a09c14feb4c87bbc683db40807a90';
const SPOTIFY_CLIENT_SECRET = '917f496c8ea448539178e3f42c4519cc';
const DOWNLOAD_API = 'https://api.deline.web.id/downloader/spotify';

let spotifyToken = null;
let tokenExpiry = null;

async function getSpotifyToken() {
    if (spotifyToken && tokenExpiry && Date.now() < tokenExpiry) {
        return spotifyToken;
    }
    try {
        const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
        const { data } = await axios.post(
            'https://accounts.spotify.com/api/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        spotifyToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
        return spotifyToken;
    } catch (err) {
        logger.error('Error getting Spotify token:', err.message);
        throw new Error('No se pudo obtener el token de Spotify.');
    }
}

async function songSearch(query) {
    if (!query) throw new Error('Ingresa el nombre de la canción.');
    try {
        const token = await getSpotifyToken();
        const { data } = await axios.get('https://api.spotify.com/v1/search', {
            params: {
                q: query,
                type: 'track',
                limit: 10
            },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
            throw new Error('❌ No se encontraron canciones.');
        }
        const songs = data.tracks.items.map(track => ({
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            duration: formatDuration(track.duration_ms),
            url: track.external_urls.spotify,
            thumbnail: track.album.images[0]?.url || '',
            preview: track.preview_url,
            album: track.album.name
        }));
        return songs;
    } catch (err) {
        logger.error('Error search:', err.message);
        throw err;
    }
}

function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function getDownload(url) {
    try {
        const { data } = await axios.get(DOWNLOAD_API, {
            params: { url }
        });
        if (!data.status || !data.download) return null;
        return data;
    } catch (err) {
        logger.error('Error download:', err.message);
        return null;
    }
}

const handler = {
    commands: ['song', 'spotify', 'songsearch'],
    tags: ['music', 'search'],
    help: ['song', 'spotify'],
    async execute(ctx) {
        try {
            if (!global.songSearch) global.songSearch = {};
            if (!ctx.args[0]) {
                return await ctx.reply(styleText(
                    `📀 Uso: *${ctx.prefix}spotify [título/artista]*\n\nEjemplo: *${ctx.prefix}spotify shape of you*`
                ));
            }
            await ctx.reply(styleText('🔎 Buscando en Spotify, espera un momento...'));
            const query = ctx.args.join(' ');
            const songs = await songSearch(query);
            const list = songs
                .map(
                    (v, i) =>
                        `*${i + 1}.* 🎵 *${v.title}*\n👤 Artista: ${v.artist}\n💿 Álbum: ${v.album}\n⏱ Duración: ${v.duration}\n🔗 [Spotify](${v.url})`
                )
                .join('\n\n');
            await ctx.replyWithImage(songs[0].thumbnail, {
                caption: styleText(`🎧 *Resultados para:* _${query}_\n\n${list}\n\n🪄 Responde con el número *1 - ${songs.length}* para descargar.`)
            });
            global.songSearch[ctx.sender] = songs;
            setTimeout(() => {
                if (global.songSearch[ctx.sender]) {
                    delete global.songSearch[ctx.sender];
                }
            }, 5 * 60 * 1000);
        } catch (err) {
            logger.error('Error main handler:', err);
            await ctx.reply(styleText('❌ Ocurrió un error al buscar la canción. Verifica tu consulta e intenta nuevamente.'));
        }
    },
    async before(ctx) {
        try {
            if (!ctx.body || isNaN(ctx.body)) return;
            if (!global.songSearch || !global.songSearch[ctx.sender]) return;
            const index = parseInt(ctx.body) - 1;
            const list = global.songSearch[ctx.sender];
            if (index < 0 || index >= list.length) return;
            const song = list[index];
            await ctx.reply(styleText(`🎶 Descargando *${song.title}* - ${song.artist} ...`));
            const result = await getDownload(song.url);
            if (!result || !result.download) {
                return await ctx.reply(styleText('❌ Error al obtener el link de descarga. Inténtalo con otra canción.'));
            }
            const caption = `🎵 *${result.title || song.title}*\n👤 Artista: ${result.artist || song.artist}\n💿 Álbum: ${song.album}\n⏱ Duración: ${result.duration || song.duration}\n🔗 Spotify: ${song.url}`.trim();
            await ctx.replyWithImage(result.thumbnail || song.thumbnail, { caption: styleText(caption) });
            await ctx.replyWithAudio(result.download, {
                fileName: `${(result.title || song.title).replace(/[^\w\s-]/g, '')}.mp3`,
                mimetype: 'audio/mpeg'
            });
            delete global.songSearch[ctx.sender];
        } catch (err) {
            logger.error('Error download handler:', err);
            await ctx.reply(styleText('❌ Ocurrió un error al descargar la canción.'));
        }
    }
};

export default handler;
