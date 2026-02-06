import { extractMentions, styleText } from '../../utils/helpers.js';
import { normalizeUserId } from '../../utils/permissions.js';
export default {
    commands: ['regalar', 'give'],
    async execute(ctx) {
        const mentions = extractMentions(ctx);
        const args = ctx.args;
        if (mentions.length === 0 || args.length < 1) {
            return await ctx.reply(styleText('ꕢ Uso: #give <id_personaje> @usuario\no\n#give @usuario <id_personaje>'));
        }
        const target = mentions[0];
        const characterId = args.find(arg => !arg.includes('@'));
        if (!characterId) {
            return await ctx.reply(styleText('ꕢ Debes proporcionar el ID del personaje.'));
        }
        const gachaService = ctx.gachaService;
        const character = gachaService.getById(characterId);
        if (!character) {
            return await ctx.reply(styleText(`ꕢ No se encontró ningún personaje con el ID: *${characterId}*`));
        }
        // Normalize IDs for comparison
        const normalizedOwner = normalizeUserId(character.user);
        const normalizedSender = normalizeUserId(ctx.sender);

        if (normalizedOwner !== normalizedSender) {
            return await ctx.reply(styleText('ꕢ Este personaje no te pertenece.'));
        }
        const targetUser = ctx.dbService.getUser(target);
        try {
            const { character: transferredChar, previousOwner } = await gachaService.transferCharacter(characterId, target);
            // Ensure target has gacha data initialized
            if (!targetUser.gacha) targetUser.gacha = { characters: [] };
            if (!targetUser.gacha.characters) targetUser.gacha.characters = [];

            targetUser.gacha.characters.push({
                id: transferredChar.id,
                name: transferredChar.name,
                claimedAt: Date.now()
            });

            const userData = ctx.userData;
            // Ensure sender has gacha data initialized
            if (!userData.gacha) userData.gacha = { characters: [] };
            if (!userData.gacha.characters) userData.gacha.characters = [];

            const charIndex = userData.gacha.characters.findIndex(c => c.id === characterId);
            if (charIndex !== -1) {
                userData.gacha.characters.splice(charIndex, 1);
            }
            ctx.dbService.markDirty();
            await ctx.dbService.save();
            await ctx.gachaService.save();
            await ctx.reply(styleText(
                `ꕣ *Regalo Enviado*\n\n` +
                `Has regalado a *${transferredChar.name}* (ID: ${transferredChar.id}) a @${target.split('@')[0]}`),
                { mentions: [target] }
            );
        } catch (error) {
            await ctx.reply(styleText(`ꕢ Error: ${error.message}`));
        }
    }
};
