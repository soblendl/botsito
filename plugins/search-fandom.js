import wiki from 'wikijs';
import { styleText } from '../lib/utils.js';

const FANDOM_API = 'https://community.fandom.com/api.php';
const MAX_SUMMARY_LENGTH = 1500;

export default {
    commands: ['fandom', 'wikif'],
    tags: ['search'],
    help: ['fandom <término>'],

    async execute(ctx) {
        const { chatId, text, prefix, command, bot } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('❌ Error: Conexión no disponible.'));
        }

        try {
            if (!text || !text.trim()) {
                return await ctx.reply(styleText(
                    `《✧》 *Uso incorrecto del comando*\n\n` +
                    `*Ejemplos:*\n` +
                    `✿ ${prefix}${command} Naruto\n` +
                    `✿ ${prefix}wikif Minecraft\n` +
                    `✿ ${prefix}fandom League of Legends`
                ));
            }

            const query = text.trim();
            const fandomWiki = wiki({ apiUrl: FANDOM_API });
            const page = await fandomWiki.page(query);
            if (!page) {
                return await ctx.reply(styleText(
                    `《✧》 No se encontró información para: "${query}"\n\n` +
                    `💡 *Tip:* Intenta con términos en inglés o verifica la ortografía.`
                ));
            }

            const [summary, images] = await Promise.all([
                page.summary().catch(() => 'Sin resumen disponible'),
                page.images().catch(() => [])
            ]);

            const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const image = images.find(img =>
                validImageExtensions.some(ext => img.toLowerCase().endsWith(ext))
            );

            const extract = summary && summary.length > MAX_SUMMARY_LENGTH
                ? summary.slice(0, MAX_SUMMARY_LENGTH) + '...'
                : summary || 'Sin resumen disponible';
            const title = page.raw?.title || query;
            const caption = `《✧》 *Fandom Wiki*\n\n` +
                `📚 *Título:* ${title}\n\n` +
                `${extract}\n\n` +
                `─────────────────\n` +
                `_Información de Fandom_`
            if (image) {
                await conn.sendMessage(chatId, {
                    image: { url: image },
                    caption: styleText(caption)
                });
            } else {
                await ctx.reply(styleText(caption));
            }

        } catch (error) {
            console.error('[Fandom] Error en comando:', error);
            let errorMsg = `《✧》 No se encontró información para: "${text}"\n\n`;
            if (error.message && error.message.includes('page')) {
                errorMsg += `💡 *Tip:* La página no existe. Intenta con términos en inglés o verifica la ortografía.`;
            } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
                errorMsg += `🌐 *Error de conexión.* Verifica tu internet e intenta de nuevo.`;
            } else {
                errorMsg += `💡 *Tip:* Intenta con términos más específicos o en inglés.`;
            }

            await ctx.reply(styleText(errorMsg));
        }
    }
}