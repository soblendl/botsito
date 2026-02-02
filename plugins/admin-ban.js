import { isAdmin, isBotAdmin, extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['ban'],

    async execute(ctx) {
        console.log(`[AdminBan] ========== INICIANDO COMANDO BAN ==========`);
        console.log(`[AdminBan] Sender: ${ctx.sender}`);
        console.log(`[AdminBan] SenderLid: ${ctx.senderLid}`);
        console.log(`[AdminBan] ChatId: ${ctx.chatId}`);

        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        // Usar senderLid para verificación de admin
        const userIdForAdmin = ctx.senderLid || ctx.sender;
        console.log(`[AdminBan] Verificando permisos de admin con: ${userIdForAdmin}`);
        const admin = await isAdmin(ctx.bot, ctx.chatId, userIdForAdmin);
        console.log(`[AdminBan] ¿Usuario es admin?: ${admin}`);

        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        console.log(`[AdminBan] Verificando si el bot es admin...`);
        const botAdmin = await isBotAdmin(ctx.bot, ctx.chatId);
        console.log(`[AdminBan] ¿Bot es admin?: ${botAdmin}`);

        if (!botAdmin) {
            return await ctx.reply(styleText('ꕤ Necesito ser administrador para banear usuarios.'));
        }

        const mentions = extractMentions(ctx);
        console.log(`[AdminBan] Menciones:`, mentions);

        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes mencionar al usuario a banear.\n\n> _Uso: #ban @usuario_'));
        }

        const user = mentions[0];

        try {
            // Verificar que no sea admin
            const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
            const phoneNumber = user.split('@')[0].split(':')[0];
            const participant = groupMetadata.participants.find(p => {
                const participantNumber = p.id.split('@')[0].split(':')[0];
                return participantNumber === phoneNumber;
            });

            if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                return await ctx.reply(styleText(`ꕤ No puedo banear a @${phoneNumber} porque es administrador.`), {
                    mentions: [user]
                });
            }

            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            const banned = groupData?.banned || [];

            if (banned.includes(user)) {
                return await ctx.reply(styleText('ꕤ Ese usuario ya está baneado.'));
            }

            await ctx.dbService.updateGroup(ctx.chatId, { $push: { banned: user } });

            if (participant) {
                await ctx.bot.groupParticipantsUpdate(ctx.chatId, [participant.id], 'remove');
            }

            console.log(`[AdminBan] Usuario baneado exitosamente`);
            await ctx.reply(styleText(`ꕥ @${user.split('@')[0]} ha sido baneado del grupo.`), {
                mentions: [user]
            });
        } catch (error) {
            console.error('[AdminBan] Error:', error);
            await ctx.reply(styleText('ꕤ Error al banear al usuario: ' + error.message));
        }

        console.log(`[AdminBan] ========== FIN COMANDO BAN ==========`);
    }
};

