import { findParticipant, normalizeUserId } from '../../utils/permissions.js';

export default {
    commands: ['dar'],
    async execute(ctx) {
        const mentions = extractMentions(ctx);
        const args = ctx.args;
        if (mentions.length === 0 || args.length < 1) {
            return await ctx.reply(styleText('✘ Debes mencionar a un usuario.\n\nEjemplo:\n*#dar @usuario id123*'));
        }

        // Resolve LID to Phone JID
        let target = mentions[0];
        if (ctx.isGroup) {
            const participant = await findParticipant(ctx.bot, ctx.chatId, target);
            if (participant) {
                target = participant.id; // Correct Phone JID
            }
        }
        target = normalizeUserId(target); // Ensure clean format
        const characterId = args.find(arg => !arg.includes('@'));
        if (!characterId) {
            return await ctx.reply(styleText('✘ Debes proporcionar el ID del personaje.\n\nEjemplo:\n*#dar @usuario id123*'));
        }
        try {
            const gachaService = ctx.gachaService;
            const character = gachaService.getById(characterId);
            if (!character) {
                return await ctx.reply(styleText(`✘ No se encontró ningún personaje con el ID: *${characterId}*`));
            }
            const previousOwner = character.user;
            const { character: transferredChar } = await gachaService.transferCharacter(characterId, target);
            const targetUser = ctx.dbService.getUser(target);
            if (!targetUser.gacha) targetUser.gacha = { characters: [] };
            if (!targetUser.gacha.characters) {
                targetUser.gacha.characters = [];
            }
            targetUser.gacha.characters.push({
                id: transferredChar.id,
                name: transferredChar.name,
                claimedAt: Date.now()
            });
            ctx.dbService.markDirty();
            await ctx.dbService.save();
            await ctx.gachaService.save();
            // Get readable names instead of raw JIDs
            const targetName = await getName(ctx.bot, ctx.chatId, target);
            let confirmMessage = `✧ *${character.name}* (ID: ${character.id}) ha sido entregado a *${targetName}* exitosamente.`;
            if (previousOwner && previousOwner !== ctx.sender) {
                confirmMessage += `\n\n⚠️ Nota: El personaje pertenecía a @${previousOwner.split('@')[0]}`;
            }
            await ctx.reply(styleText(confirmMessage), {
                mentions: [target, previousOwner].filter(Boolean)
            });
        } catch (error) {
            await ctx.reply(styleText(`✘ Error al dar el personaje: ${error.message}`));
        }
    }
};
