import { extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['dar'],

    async execute(ctx) {
        const mentions = extractMentions(ctx);
        const args = ctx.args;

        if (mentions.length === 0 || args.length < 1) {
            return await ctx.reply(styleText('✘ Debes mencionar a un usuario.\n\nEjemplo:\n*#dar @usuario id123*'));
        }

        let target = mentions[0];
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
            const { character: transferredChar } = gachaService.transferCharacter(characterId, target);

            const targetUser = ctx.dbService.getUser(target);
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
            await ctx.gachaService.save(); // 🔥 Guardado global

            let confirmMessage = `✧ *${character.name}* (ID: ${character.id}) ha sido entregado a @${target.split('@')[0]} exitosamente.`;
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
