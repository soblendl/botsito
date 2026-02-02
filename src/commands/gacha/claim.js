import { getCooldown, formatTime, styleText } from '../../utils/helpers.js';
export default {
    commands: ['claim', 'c'],
    async execute(ctx) {
        const COOLDOWN = 30 * 60 * 1000;
        const userData = ctx.userData;
        const gachaService = ctx.gachaService;
        const cooldown = getCooldown(userData.gacha.lastClaim, COOLDOWN);
        if (cooldown > 0) {
            return await ctx.reply(styleText(
                `ꕤ Ya reclamaste un personaje recientemente.\nVuelve en: ${formatTime(cooldown)}`
            ));
        }
        const rolledId = userData.gacha.rolled;
        if (!rolledId) {
            return await ctx.reply(styleText('ꕤ Primero debes girar la ruleta con #rollwaifu (#rw) para obtener un personaje.'));
        }
        const CLAIM_WINDOW = 30 * 1000; 
        const rollTime = userData.gacha.lastRoll || 0;
        const timeSinceRoll = Date.now() - rollTime;
        if (timeSinceRoll > CLAIM_WINDOW) {
            await ctx.dbService.updateUser(ctx.sender, { 'gacha.rolled': null });
            return await ctx.reply(styleText('ꕤ ¡Demasiado tarde! El personaje escapó porque no lo reclamaste en 30 segundos.'));
        }
        const character = gachaService.getById(rolledId);
        if (!character) {
            delete userData.gacha.rolled;
            return await ctx.reply(styleText('ꕤ El personaje que giraste ya no está disponible.'));
        }
        try {
            await gachaService.claim(ctx.sender, character.id);
        } catch (error) {
            console.error('Error reclamando personaje en GachaService:', error.message);
            return await ctx.reply(styleText(`ꕤ Error: ${error.message}`));
        }
        const newChar = {
            id: character.id,
            name: character.name,
            source: character.source,
            value: character.value,
            img: character.img,
            claimedAt: Date.now()
        };
        const userChars = userData.gacha.characters || [];
        userChars.push(newChar);
        await ctx.dbService.updateUser(ctx.sender, {
            'gacha.rolled': null,
            'gacha.lastClaim': Date.now(),
            'gacha.characters': userChars
        });
        const senderNumber = ctx.sender.split('@')[0];
        await ctx.reply(
            styleText(`ꕥ *@${senderNumber}* ha reclamado a *${character.name}* de *${character.source || 'Desconocido'}*`),
            { mentions: [ctx.sender] }
        );
    }
};
