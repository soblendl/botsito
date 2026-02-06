import { isAdmin, isBotAdmin, extractMentions, styleText } from '../../utils/helpers.js';
export default {
    commands: ['promote'],
    async execute(ctx) {
        console.log(`[AdminPromote] ========== INICIANDO COMANDO PROMOTE ==========`);
        console.log(`[AdminPromote] Sender: ${ctx.sender}`);
        console.log(`[AdminPromote] SenderLid: ${ctx.senderLid}`);
        console.log(`[AdminPromote] ChatId: ${ctx.chatId}`);
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕢ Este comando solo funciona en grupos.'));
        }
        const userIdForAdmin = ctx.senderLid || ctx.sender;
        console.log(`[AdminPromote] Verificando permisos de admin con: ${userIdForAdmin}`);
        const admin = await isAdmin(ctx.bot, ctx.chatId, userIdForAdmin);
        console.log(`[AdminPromote] ¿Usuario es admin?: ${admin}`);
        if (!admin) {
            return await ctx.reply(styleText('ꕢ Solo los administradores pueden usar este comando.'));
        }
        console.log(`[AdminPromote] Verificando si el bot es admin...`);
        const botAdmin = await isBotAdmin(ctx.bot, ctx.chatId);
        console.log(`[AdminPromote] ¿Bot es admin?: ${botAdmin}`);
        if (!botAdmin) {
            return await ctx.reply(styleText('ꕢ Necesito ser administrador para promover usuarios.'));
        }
        const mentions = extractMentions(ctx);
        console.log(`[AdminPromote] Menciones:`, mentions);
        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕢ Debes mencionar al usuario a promover.\n\n> _Uso: #promote @usuario_'));
        }
        try {
            const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
            const participantIds = [];
            for (const mentionedUser of mentions) {
                const phoneNumber = mentionedUser.split('@')[0].split(':')[0];
                console.log(`[AdminPromote] Buscando usuario: ${phoneNumber}`);
                const participant = groupMetadata.participants.find(p => {
                    const participantNumber = p.id.split('@')[0].split(':')[0];
                    return participantNumber === phoneNumber;
                });
                if (participant) {
                    console.log(`[AdminPromote] Usuario encontrado: ${participant.id}`);
                    if (participant.admin === 'admin' || participant.admin === 'superadmin') {
                        await ctx.reply(styleText(`ꕢ @${phoneNumber} ya es administrador.`), {
                            mentions: [participant.id]
                        });
                        continue;
                    }
                    participantIds.push(participant.id);
                }
            }
            if (participantIds.length === 0) {
                return await ctx.reply(styleText('ꕢ No se encontró al usuario mencionado en el grupo.'));
            }
            await ctx.bot.groupParticipantsUpdate(ctx.chatId, participantIds, 'promote');
            console.log(`[AdminPromote] Usuario promovido exitosamente`);
            await ctx.reply(styleText(`ꕣ @${participantIds[0].split('@')[0].split(':')[0]} ahora es administrador.`), {
                mentions: participantIds
            });
        } catch (error) {
            console.error('[AdminPromote] Error:', error);
            await ctx.reply(styleText('ꕢ Error al promover al usuario: ' + error.message));
        }
        console.log(`[AdminPromote] ========== FIN COMANDO PROMOTE ==========`);
    }
};
