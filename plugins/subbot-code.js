import { jadibotManager } from '../lib/jadibot.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['code', 'jadibot', 'serbot', 'subbot'],

    async execute(ctx) {
        const { args, chatId } = ctx;
        const phone = ctx.senderPhone;
        if (ctx.command === 'code') {
            if (!phone || phone.length < 10) {
                return await ctx.reply(
                    styleText('❌ *No se pudo detectar tu número*\n\n' +
                        'WhatsApp no envió tu número de teléfono.\n' +
                        'Intenta desde un chat privado con el bot.')
                );
            }
            await ctx.reply(styleText(`⏳ Generando código para: ${phone}...`));
            const result = await jadibotManager.startSubbot(null, chatId, ctx.bot.sock, phone);
            if (!result.success) await ctx.reply(styleText(result.message));
            return;
        }
        const displayPhone = phone || 'tu número';
        const userId = ctx.sender.includes('@') ? ctx.sender : `${ctx.sender}@s.whatsapp.net`;
        const code = jadibotManager.createCode(userId);
        await ctx.reply(styleText(
            `ꕥ *Jadibot - Sub-Bot*\n\n` +
            `Elige un método para vincular:\n\n` +
            `> *Opción 1: Código de 8 Dígitos*\n` +
            `> Usa \`#code\` para recibir el código\n` +
            `> _Tu número: ${displayPhone}_\n\n` +
            `> *Opción 2: Código QR*\n` +
            `> Usa \`#qr ${code}\` para ver el QR\n` +
            `_Expira en 5 minutos_`
        ));
    }
};
