import fetch from "node-fetch";
import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['gemini'],
    tags: ['ai'],
    help: ['gemini <texto>'],
    async execute(ctx) {
        const { text, prefix, command, bot, chatId } = ctx;
        if (!text || text.trim().length === 0) return await ctx.reply(styleText(`💬 Ejemplo:\n${prefix + command} ¿qué es un agujero negro?`));
        if (ctx.react) await ctx.react("⏳");
        try {
            const res = await fetch(`https://api.zenzxz.my.id/api/ai/gemini?text=${encodeURIComponent(text)}&id=id`);
            if (!res.ok) throw new Error(`API respondió con estado ${res.status}`);
            const json = await res.json();
            const reply = json?.data?.response;
            if (!reply) throw new Error("Gemini devolvió un resultado vacío");
            await bot.sock.sendMessage(chatId, { text: styleText(reply) }, { quoted: ctx.msg });
        } catch (error) {
            console.error("❌ Error en /gemini:", error.message);
            await ctx.reply(styleText("❌ Hubo un problema al consultar Gemini AI."));
        }
        if (ctx.react) await ctx.react("✅");
    }
};
