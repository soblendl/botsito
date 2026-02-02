import { isAdmin, isBotAdmin, extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['demote'],

    async execute(ctx) {
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const admin = await isAdmin(ctx.bot, ctx.chatId, ctx.senderLid || ctx.sender);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        const botAdmin = await isBotAdmin(ctx.bot, ctx.chatId);
        if (!botAdmin) {
            return await ctx.reply(styleText('ꕤ Necesito ser administrador para degradar usuarios.'));
        }

        const mentions = extractMentions(ctx);
        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes mencionar al usuario a degradar.'));
        }

        try {
            const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
            const participantIds = [];

            for (const mentionedUser of mentions) {
                const phoneNumber = mentionedUser.split('@')[0].split(':')[0];
                const participant = groupMetadata.participants.find(p => {
                    const participantNumber = p.id.split('@')[0].split(':')[0];
                    return participantNumber === phoneNumber;
                });

                if (participant) {
                    participantIds.push(participant.id);
                }
            }

            if (participantIds.length === 0) {
                return await ctx.reply(styleText('ꕤ No se encontró al usuario mencionado en el grupo.'));
            }

            await ctx.bot.groupParticipantsUpdate(ctx.chatId, participantIds, 'demote');

            await ctx.reply(styleText(`ꕥ @${participantIds[0].split('@')[0]} ya no es administrador.`), {
                mentions: participantIds
            });
        } catch (error) {
            console.error('[AdminDemote] Error:', error);
            await ctx.reply(styleText('ꕤ Error al degradar al usuario: ' + error.message));
        }
    }
};
