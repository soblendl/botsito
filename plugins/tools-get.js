import axios from 'axios'
import { styleText } from '../lib/utils.js';

export default {
    commands: ['get', 'httpget'],
    tags: ['tools'],
    help: ['get <url>'],

    async execute(ctx) {
        const { text } = ctx
        if (!text) {
            return await ctx.reply(styleText('ꕤ Ingresa una URL para hacer la petición.'))
        }
        let urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        let url = '';
        if (urlMatch) {
            url = urlMatch[0];
        } else {
            const parts = text.trim().split(/\s+/);
            if (parts.length > 1 && /^[#\/.]/.test(parts[0])) {
                url = parts[1];
            } else {
                url = parts[0];
            }
            if (url && !url.startsWith('http')) {
                url = `http://${url}`;
            }
        }
        try {
            const start = Date.now()
            const response = await axios.get(url, {
                validateStatus: () => true,
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            })
            const end = Date.now()
            let preview = typeof response.data === 'object'
                ? JSON.stringify(response.data, null, 2)
                : response.data.toString()
            if (preview.length > 3000) {
                preview = preview.substring(0, 3000) + '... (truncado)'
            }

            const msgText = `ꕥ *HTTP GET Request*\n\n` +
                `> *URL* » ${url}\n` +
                `> *Status* » ${response.status} ${response.statusText}\n` +
                `> *Tiempo* » ${end - start}ms\n` +
                `> *Type* » ${response.headers['content-type']}\n\n` +
                `> *Response* » \n\`\`\`\n${preview}\n\`\`\``
            await ctx.reply(styleText(msgText))
        } catch (error) {
            console.error('Error en get:', error)
            await ctx.reply(styleText(`ꕤ Error » ${error.message}`))
        }
    }
}
