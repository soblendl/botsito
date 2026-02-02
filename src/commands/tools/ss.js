import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['ss', 'screenshot', 'captura'],
    tags: ['tools'],
    help: ['ss <url>'],
    async execute(ctx) {
        const { bot, msg, text, chatId } = ctx
        if (!text) {
            return await ctx.reply(styleText('ꕤ Ingresa una URL para tomar la captura.'))
        }

        let url = '';
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            url = urlMatch[0];
        } else {
            const cleanText = text.replace(/^[#\/.]\w+\s*/, '').trim();
            const parts = cleanText.split(/\s+/);
            url = parts[0];
            if (url && !url.startsWith('http')) {
                url = `http://${url}`;
            }
        }

        if (!url || url === 'http://') {
            return await ctx.reply(styleText('ꕤ URL inválida.'))
        }

        try {
            await ctx.reply(styleText('ꕤ Tomando captura...'))
            const apiUrl = `https://api.stellarwa.xyz/tools/ssweb?url=${encodeURIComponent(url)}&key=stellar-20J4F8hk`;

            await bot.sock.sendMessage(chatId, {
                image: { url: apiUrl },
                caption: styleText(`> *Screenshot de* » ${url}`)
            }, { quoted: msg })
        } catch (error) {
            logger.error('Error en ss:', error)
            await ctx.reply(styleText('ꕤ Error al tomar la captura. Verifica la URL.'))
        }
    }
}
