import { isAdmin, isBotAdmin, extractMentions, styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['kick', 'expulsar'],
    async execute(ctx) {
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const userIdForAdmin = ctx.senderLid || ctx.sender;
        const admin = await isAdmin(ctx.bot, ctx.chatId, userIdForAdmin);

        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        const botAdmin = await isBotAdmin(ctx.bot, ctx.chatId);

        if (!botAdmin) {
            return await ctx.reply(styleText('ꕤ Necesito ser administrador para expulsar usuarios.'));
        }

        let targetUser = null;
        const msg = ctx.msg;
        const contextInfo =
            msg?.message?.extendedTextMessage?.contextInfo ||
            msg?.message?.imageMessage?.contextInfo ||
            msg?.message?.videoMessage?.contextInfo ||
            msg?.message?.documentMessage?.contextInfo;

        const quoted = contextInfo?.participant;
        const mentioned = extractMentions(ctx);

        if (mentioned.length > 0) {
            targetUser = mentioned[0];
        } else if (quoted) {
            targetUser = quoted;
        }

        if (!targetUser) {
            return await ctx.reply(styleText('ꕤ Por favor etiqueta o responde al usuario a expulsar.\n\n> _Uso: #kick @usuario_'));
        }

        try {
            const targetIsAdmin = await isAdmin(ctx.bot, ctx.chatId, targetUser);

            if (targetIsAdmin) {
                return await ctx.reply(styleText(`ꕤ No puedo expulsar a @${targetUser.split('@')[0]} porque es administrador.`), {
                    mentions: [targetUser]
                });
            }

            const botId = ctx.bot.sock?.user?.id?.split(':')[0] || ctx.bot.user?.id?.split(':')[0];

            if (targetUser.includes(botId)) {
                return await ctx.reply(styleText('ꕤ No puedo expulsarme a mí mismo.'));
            }

            logger.info(`[AdminKick] Ejecutando expulsión de ${targetUser} en grupo ${ctx.chatId}`);

            await ctx.bot.groupParticipantsUpdate(ctx.chatId, [targetUser], 'remove');

            await ctx.reply(styleText(
                `ꕥ *Usuario Expulsado* \n\n` +
                `> ⚬ Usuario » @${targetUser.split('@')[0]}\n` +
                `> ⚬ Acción » Expulsión inmediata`
            ), {
                mentions: [targetUser]
            });

        } catch (error) {
            logger.error('[AdminKick] Error:', error);
            await ctx.reply(styleText('ꕤ Error al expulsar al usuario: ' + error.message));
        }
    }
};
