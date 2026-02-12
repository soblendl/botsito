import { isAdmin, isBotAdmin, styleText, isOwner } from '../lib/utils.js';

import { findParticipant } from '../src/utils/permissions.js';

const botAdminCache = new Map();

export default {
    commands: ['antilink'],
    async before(ctx) {
        const { isGroup, body, sender, chatId, dbService, bot, msg } = ctx;
        if (!isGroup || !body) return;
        const groupData = await dbService.getGroup(chatId);
        const groupSettings = groupData?.settings;
        if (!groupSettings?.antilink) return;

        // Solo enlaces de grupos de WhatsApp y canales
        const linkRegex = /(chat\.whatsapp\.com\/[a-zA-Z0-9]+)|(whatsapp\.com\/channel\/[a-zA-Z0-9]+)/i;
        if (!linkRegex.test(body)) return;

        // Si es admin o owner, ignorar
        const isUserAdmin = await isAdmin(bot, chatId, sender);
        const isUserOwner = isOwner(sender);
        if (isUserAdmin || isUserOwner) return;

        // Check bot admin status (con cache)
        let botIsAdmin = botAdminCache.get(chatId);
        if (botIsAdmin === undefined) {
            botIsAdmin = await isBotAdmin(bot, chatId);
            botAdminCache.set(chatId, botIsAdmin);
            setTimeout(() => botAdminCache.delete(chatId), 5 * 60 * 1000);
        }

        if (!botIsAdmin) return;

        // 1. Intentar borrar el mensaje
        try {
            await bot.sock.sendMessage(chatId, { delete: msg.key });
        } catch (e) {
            console.error('[Antilink] Error al eliminar mensaje:', e);
        }

        // 2. Intentar eliminar al usuario (independiente del mensaje)
        try {
            // Convert LID to Phone JID if necessary
            const participant = await findParticipant(bot, chatId, sender);

            if (participant && participant.id) {
                await bot.sock.groupParticipantsUpdate(chatId, [participant.id], 'remove');

                const userNumber = sender.split('@')[0].split(':')[0];
                const mentionJid = `${userNumber}@s.whatsapp.net`;

                await bot.sock.sendMessage(chatId, {
                    text: styleText(`@${userNumber} eliminado por enviar enlaces prohibidos (¬_¬")`),
                    mentions: [mentionJid]
                });
            } else {
                console.warn('[Antilink] No se pudo encontrar al participante para eliminar:', sender);
            }
        } catch (e) {
            console.error('[Antilink] Error al eliminar usuario:', e);
        }
    },

    async execute(ctx) {
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const admin = await isAdmin(ctx.bot, ctx.chatId, ctx.senderLid || ctx.sender);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        if (!ctx.args[0] || !['on', 'off'].includes(ctx.args[0].toLowerCase())) {
            return await ctx.reply(styleText('ꕤ Uso: */antilink* `<on/off>`'));
        }

        try {
            const enable = ctx.args[0].toLowerCase() === 'on';
            await ctx.dbService.updateGroup(ctx.chatId, { 'settings.antilink': enable });

            botAdminCache.delete(ctx.chatId);

            await ctx.reply(styleText(`ꕥ Antilink ${enable ? 'activado ✅' : 'desactivado ❌'}.`));
        } catch (error) {
            await ctx.reply(styleText('ꕤ Error al cambiar la configuración.'));
        }
    }
};
