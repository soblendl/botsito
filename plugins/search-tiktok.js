import axios from 'axios';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['tiktoksearch', 'ttss'],
    tags: ['search'],
    help: ['tiktoksearch <texto>'],

    async execute(ctx) {
        const { bot, chatId, args, text, reply } = ctx;
        const conn = bot?.sock;
        if (!text) {
            return await reply(styleText('ꕤ Por favor escribe qué videos quieres buscar.\nEjemplo: #ttss gatos graciosos'));
        }
        try {
            const apiUrl = `https://api.stellarwa.xyz/search/tiktok?query=${encodeURIComponent(text)}&key=stellar-20J4F8hk`;
            const response = await axios.get(apiUrl);
            const data = response.data;
            if (!data || !data.status || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
                return await reply(styleText('ꕤ No encontré videos para tu búsqueda.'));
            }
            const videos = data.data.slice(0, 5);
            for (const video of videos) {
                const caption = `ꕥ *TikTok Video* \n\n` +
                    `> *Título* » ${video.title}\n` +
                    `> *Autor* » ${video.author.nickname} (@${video.author.unique_id})\n` +
                    `> *Duración* » ${video.duration}\n` +
                    `> *Vistas* » ${video.stats.views}\n` +
                    `> *Likes* » ${video.stats.likes}\n` +
                    `──────────────────\n` +
                    `> _*Powered By DeltaByte*_`;
                await conn.sendMessage(chatId, {
                    video: { url: video.dl },
                    caption: styleText(caption)
                })
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('[TikTokSearch] Error:', error);
            await reply(styleText('ꕤ Ocurrió un error al buscar videos.'));
        }
    }
};
