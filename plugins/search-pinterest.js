import axios from 'axios';
import { styleText } from '../lib/utils.js';

const API_URL = 'https://pinscrapper.vercel.app/api/pinterest/search';
const REQUEST_TIMEOUT = 20000;
const IMAGE_DELAY = 1000;
const DEFAULT_LIMIT = 7;

export default {
    commands: ['pinterest', 'pin', 'pinsearch'],
    tags: ['search'],
    help: ['pinterest <texto de búsqueda>'],

    async execute(ctx) {
        const { chatId, args, bot, prefix, command, text } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('❌ Error: Conexión no disponible.'));
        }

        try {
            if (!text || !text.trim()) {
                return await ctx.reply(styleText(
                    `ꕤ *Uso incorrecto del comando*\n\n` +
                    `Ejemplo:\n` +
                    `> ${prefix}${command} gatos\n` +
                    `> ${prefix}pin aesthetic wallpaper\n` +
                    `>s ${prefix}pin naturaleza`
                ));
            }

            const searchQuery = text.trim();
            const apiUrl = `${API_URL}?q=${encodeURIComponent(searchQuery)}&limit=${DEFAULT_LIMIT}`;
            const response = await axios.get(apiUrl, {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;
            if (!data || !data.success || !data.images || !Array.isArray(data.images) || data.images.length === 0) {
                return await ctx.reply(styleText(
                    'ꕤ No se encontraron imágenes para tu búsqueda.\n\n' +
                    '> *Tip* » Intenta con otras palabras clave.'
                ));
            }

            const images = data.images;
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                if (!image || !image.imageUrl) {
                    console.error(`[Pinterest] Imagen ${i + 1} sin URL válida`);
                    continue;
                }

                try {
                    const caption = `《✧》 *Pinterest* 📌\n` +
                        `> *Título:* ${image.title || 'Sin título'}\n` +
                        `_Imagen ${i + 1} de ${images.length}_`
                    await conn.sendMessage(chatId, {
                        image: { url: image.imageUrl },
                        caption: styleText(caption)
                    })

                    if (i < images.length - 1) { await new Promise(resolve => setTimeout(resolve, IMAGE_DELAY)) }
                } catch (sendError) {
                    console.error(`[Pinterest] Error enviando imagen ${i + 1}:`, sendError.message);
                }
            }

        } catch (error) {
            console.error('[Pinterest] Error en comando:', error);
            let errorMsg = '《✧》 Error al buscar imágenes en Pinterest.'
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                errorMsg += '\n\n⏱️ La solicitud tardó demasiado. Intenta de nuevo.';
            } else if (error.response) {
                errorMsg += `\n\n❌ Error del servidor: ${error.response.status}`;
            } else if (error.request) {
                errorMsg += '\n\n🌐 Sin respuesta del servidor. Verifica tu conexión.';
            } else {
                errorMsg += `\n\n💡 *Tip:* Intenta con términos más específicos.`;
            }

            await ctx.reply(styleText(errorMsg))
        }
    }
}