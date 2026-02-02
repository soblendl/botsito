import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['sell', 'vender'],
    async execute(ctx) {
        if (ctx.isGroup && !ctx.dbService.getGroup(ctx.chatId).settings.economy) {
            return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
        }
        if (ctx.args.length < 1) {
            return await ctx.reply(styleText('ꕤ Uso: #sell <id_personaje>'));
        }
        const characterId = ctx.args[0];
        const gachaService = ctx.gachaService;
        const character = gachaService.getById(characterId);
        if (!character) {
            return await ctx.reply(styleText(`ꕤ No se encontró ningún personaje con el ID: *${characterId}*`));
        }
        if (character.owner !== ctx.sender) {
            return await ctx.reply(styleText('ꕤ Este personaje no te pertenece.'));
        }
        const sellPrice = parseInt(character.value) || 1000;
        const userData = ctx.userData;
        try {
            await gachaService.release(ctx.sender, characterId);
            const userChars = userData.gacha.characters || [];
            const newChars = userChars.filter(c => c.id !== characterId);
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': (userData.economy.coins || 0) + sellPrice,
                'gacha.characters': newChars
            });
            await ctx.reply(styleText(
                `ꕤ *Venta Exitosa*\n\n` +
                `Vendiste a *${character.name}* por *${sellPrice.toLocaleString()}* coins\n` +
                `Balance: ${userData.economy.coins.toLocaleString()} coins`
            ));
        } catch (error) {
            await ctx.reply(styleText(`ꕤ Error: ${error.message}`));
        }
    }
};
