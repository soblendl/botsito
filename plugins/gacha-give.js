import { extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['regalar', 'give'],

    async execute(ctx) {
        const mentions = extractMentions(ctx);
        const args = ctx.args;

        if (mentions.length === 0 || args.length < 1) {
            return await ctx.reply(styleText('ꕤ Uso: #give <id_personaje> @usuario\no\n#give @usuario <id_personaje>'));
        }

        const target = mentions[0];
        const characterId = args.find(arg => !arg.includes('@'));

        if (!characterId) {
            return await ctx.reply(styleText('ꕤ Debes proporcionar el ID del personaje.'));
        }

        const gachaService = ctx.gachaService;
        const character = gachaService.getById(characterId);

        if (!character) {
            return await ctx.reply(styleText(`ꕤ No se encontró ningún personaje con el ID: *${characterId}*`));
        }

        if (character.user !== ctx.sender) {
            return await ctx.reply(styleText('ꕤ Este personaje no te pertenece.'));
        }

        const targetUser = ctx.dbService.getUser(target);

        try {
            const { character: transferredChar, previousOwner } = gachaService.transferCharacter(characterId, target);

            if (!targetUser.gacha.characters) {
                targetUser.gacha.characters = [];
            }
            targetUser.gacha.characters.push({
                id: transferredChar.id,
                name: transferredChar.name,
                claimedAt: Date.now()
            });

            const userData = ctx.userData;
            const charIndex = userData.gacha.characters.findIndex(c => c.id === characterId);
            if (charIndex !== -1) {
                userData.gacha.characters.splice(charIndex, 1);
            }

            ctx.dbService.markDirty();
            await ctx.dbService.save();
            await ctx.gachaService.save(); // 🔥 Guardado global

            await ctx.reply(styleText(
                `ꕥ *Regalo Enviado*\n\n` +
                `Has regalado a *${transferredChar.name}* (ID: ${transferredChar.id}) a @${target.split('@')[0]}`),
                { mentions: [target] }
            );
        } catch (error) {
            await ctx.reply(styleText(`ꕤ Error: ${error.message}`));
        }
    }
};
