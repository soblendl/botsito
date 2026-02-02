import fetch from "node-fetch";
import { styleText } from '../lib/utils.js';

export default {
    commands: ['gemini'],
    tags: ['ai'],
    help: ['gemini <texto>'],

    async execute(ctx) {
        const { text, prefix, command, bot, chatId, msg } = ctx;
        const conn = bot.sock;
        if (!text || text.trim().length === 0) {
            return await ctx.reply(styleText(`💬 Ejemplo:\n${prefix + command} ¿qué es un agujero negro?`));
        }

        if (ctx.react) {
            await ctx.react("⏳");
        }

        try {
            const apiURL = `https://api.zenzxz.my.id/api/ai/gemini?text=${encodeURIComponent(text)}&id=id`;
            const res = await fetch(apiURL);
            if (!res.ok) throw new Error(`API respondió con estado ${res.status}`);
            const json = await res.json();
            const reply = json?.data?.response;
            if (!reply) throw new Error("Gemini devolvió un resultado vacío");
            await conn.sendMessage(chatId, { text: styleText(reply) }, { quoted: ctx.msg });
        } catch (error) {
            console.error("❌ Error en /gemini:", error.message);
            await ctx.reply(styleText("❌ Hubo un problema al consultar Gemini AI."));
        }

        if (ctx.react) {
            await ctx.react("✅");
        }
    }
};
