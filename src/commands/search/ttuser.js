import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

async function ttstalk(username) {
    try {
        if (!username) throw Error('username required');
        const html = await axios.get(
            'https://www.tiktok.com/@' + username,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
                    'Accept': 'text/html'
                }
            }
        ).then(r => r.data);

        const pick = function (re) {
            const m = html.match(re);
            return m ? m[1] : null;
        };

        return {
            username: pick(/"uniqueId":"([^"]+)"/),
            name: pick(/"nickname":"([^"]+)"/),
            bio: pick(/"signature":"([^"]*)"/),
            followers: pick(/"followerCount":(\d+)/),
            following: pick(/"followingCount":(\d+)/),
            likes: pick(/"heartCount":(\d+)/),
            videoCount: pick(/"videoCount":(\d+)/),
            avatar: pick(/"avatarLarger":"([^"]+)"/)?.replace(/\\u002F/g, '/')
        };
    } catch (e) {
        return { status: 'error', msg: e.message };
    }
}

export default {
    commands: ['ttuser', 'tiktokuser', 'ttinfo', 'ttstalk'],
    tags: ['search'],
    help: ['ttuser <username>'],
    async execute(ctx) {
        const { bot, chatId, args, reply } = ctx;
        const conn = bot?.sock;
        const username = args[0]?.replace('@', '').replace('https://www.tiktok.com/@', '').replace('https://tiktok.com/@', '');

        if (!username) {
            return await reply(styleText(
                `ꕤ *Uso del Comando*\n\n` +
                `> */ttuser* <username>\n\n` +
                `*Ejemplo:*\n` +
                `> */ttuser* khaby.lame`
            ));
        }

        try {
            await reply(styleText(`ꕤ *Buscando información de @${username}...*`));
            const user = await ttstalk(username);

            if (user.status === 'error' || !user.username) {
                return await reply(styleText(
                    `ꕤ *Error*\n\n` +
                    `> No se encontró el usuario @${username}\n` +
                    `> Verifica que el nombre de usuario sea correcto.`
                ));
            }

            const formatNumber = (num) => {
                if (!num) return '0';
                num = parseInt(num);
                if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                return num.toString();
            };

            const caption = styleText(
                `ꕤ *Perfil de TikTok*\n\n` +
                `> ┌───────────────\n` +
                `> │ ❀ *Usuario »* @${user.username}\n` +
                `> │ ❀ *Nombre »* ${user.name || 'N/A'}\n` +
                `> ├───────────────\n` +
                `> │ ❀ *Seguidores »* ${formatNumber(user.followers)}\n` +
                `> │ ❀ *Siguiendo »* ${formatNumber(user.following)}\n` +
                `> │ ❀ *Likes »* ${formatNumber(user.likes)}\n` +
                `> │ ❀ *Videos »* ${formatNumber(user.videoCount)}\n` +
                `> ├───────────────\n` +
                `> │ ❀ *Bio:*\n` +
                `> │ ${user.bio || '_Sin biografía_'}\n` +
                `> └───────────────\n\n` +
                `> ❀ tiktok.com/@${user.username}`
            );

            if (user.avatar) {
                try {
                    await conn.sendMessage(chatId, {
                        image: { url: user.avatar },
                        caption: caption
                    });
                    return;
                } catch (imgError) {
                    logger.info('[TTUser] Failed to send image, sending text only');
                }
            }

            await reply(caption);
        } catch (error) {
            logger.error('[TTUser] Error:', error);
            await reply(styleText(`ꕤ *Error*\n\n> No se pudo obtener información del usuario @${username}`));
        }
    }
};
