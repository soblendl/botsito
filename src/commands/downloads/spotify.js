import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { styleText } from '../../utils/helpers.js';
async function searchSong(query) {
    const res = await fetch(`https://spotdown.org/api/song-details?url=${encodeURIComponent(query)}`, { headers: { "Accept": "application/json, text/plain, **", "Content-Type": "application/json" }, body: JSON.stringify({ url: query }) });
    if (!res.ok || !res.body) throw new Error("Error en la descarga");
    const fileName = `spotify_${Date.now()}.mp3`;
    const outputPath = path.resolve('./tmp', fileName);
    const fileStream = fs.createWriteStream(outputPath);
    await new Promise((resolve, reject) => { res.body.pipe(fileStream); res.body.on("error", reject); fileStream.on("finish", resolve); });
    return { url: outputPath, title: 'Unknown', artist: 'Unknown', duration: 'N/A' };
}
export default {
    commands: ['sp', 'spotifydl', 'spot'],
    tags: ['download'],
    help: ['sp <url|canción>'],
    async execute(ctx) {
        const { bot, chatId, args, reply } = ctx;
        const query = args.join(' ');
        if (!query) return await reply(styleText('ꕢ Ingresa el link o nombre de la canción.'));
        try {
            const song = await searchSong(query);
            const caption = styleText(`*SPOTIFY DOWNLOAD* \n\n> ᰔᩚ Título » ${song.title}\n> ❀ Artista » ${song.artist}\n> ⚝ Duración » ${song.duration || 'N/A'}\n\n> ⤷ ゛Powered By DeltaByteˎˊ˗`);
            await bot.sock.sendMessage(chatId, { audio: { url: song.url }, mimetype: 'audio/mpeg', fileName: `${song.title}.mp3`, caption: caption }, { quoted: ctx.msg });
            fs.unlinkSync(song.url);
        } catch (error) {
            console.error('[Spotify] Error:', error);
            await reply(styleText(`ꕢ Error: ${error.message}`));
        }
    }
};
