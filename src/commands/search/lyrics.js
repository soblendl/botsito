import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['lyrics', 'letra'],
    tags: ['search'],
    help: ['lyrics <canción>'],
    async execute(ctx) {
        const { chatId, args, bot, prefix, command, text } = ctx;
        const conn = bot?.sock;

        if (!text || !text.trim()) {
            return await ctx.reply(styleText(
                `《✧》 *Uso incorrecto del comando*\n\n` +
                `Ejemplo:\n` +
                `✿ ${prefix}${command} takedown twice\n` +
                `✿ ${prefix}${command} despacito`
            ));
        }

        try {
            await ctx.reply(styleText('ꕥ Buscando letra...'));
            const response = await axios.post("https://api-sky.ultraplus.click/tools/lyrics",
                { text: text.trim() },
                { headers: { apikey: "sk_d5a5dec0-ae72-4c87-901c-cccce885f6e6" } }
            );

            const result = response.data?.result;

            if (!result || !result.lyrics) {
                return await ctx.reply(styleText(
                    '《✧》 No encontré la letra de esa canción. 😿\n\n' +
                    '💡 *Tip:* Intenta con el nombre del artista también.'
                ));
            }

            const title = result.title || text;
            const artist = result.artist || 'Desconocido';
            const image = result.image || result.thumbnail || '';
            const lyrics = result.lyrics;

            const caption = `ꕥ *Lyrics Found!*\n\n` +
                `> *Título* » ${title}\n` +
                `> *Artista* » ${artist}\n\n` +
                `──────────────────\n\n` +
                `${lyrics}\n\n` +
                `──────────────────\n` +
                `> _*Powered By DeltaByte*_`;

            if (image) {
                await conn.sendMessage(chatId, {
                    image: { url: image },
                    caption: styleText(caption)
                });
            } else {
                await ctx.reply(styleText(caption));
            }
        } catch (error) {
            logger.error('[Lyrics] Error:', error);
            await ctx.reply(styleText('ꕥ Ocurrió un error al buscar la letra. Verifica que el servicio esté disponible.'));
        }
    }
};
