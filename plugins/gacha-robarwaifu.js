import { styleText } from '../lib/utils.js';

export default {
    commands: ['robarwaifu', 'robar'],

    async execute(ctx) {
        const args = ctx.args;
        const userData = ctx.userData;

        if (!args[0]) {
            return await ctx.reply(styleText('✘ Debes proporcionar el ID de la waifu que quieres robar.\n\nEjemplo:\n*#robarwaifu id123*'));
        }

        try {
            const gachaService = ctx.gachaService;
            const waifuId = args[0];
            const waifu = gachaService.getById(waifuId);
            if (!waifu) {
                return await ctx.reply(styleText(`✘ No se encontró ninguna waifu con el ID: *${waifuId}*`));
            }

            const oldOwner = waifu.user;

            if (!oldOwner || oldOwner === ctx.sender) {
                return await ctx.reply(styleText('✘ Esta waifu no tiene dueño o ya es tuya.'));
            }

            if (oldOwner === global.botOwner) {
                return await ctx.reply(styleText(`✘ No puedes robar la waifu de mi owner *${waifu.name}* (ID: ${waifu.id}).`));
            }

            const ownerData = ctx.dbService.getUser(oldOwner);

            if ((ownerData.antirobo || 0) > Date.now()) {
                return await ctx.reply(styleText(
                    `🛡 La waifu *${waifu.name}* (ID: ${waifu.id}) tiene AntiRobo activo.\n` +
                    `No puedes robarla hasta: *${new Date(ownerData.antirobo).toLocaleString()}*`
                ));
            }

            if (ctx.sender !== global.botOwner) {
                const cooldowns = ctx.db.cooldowns || {};
                const now = Date.now();
                const cooldownTime = 10 * 60 * 1000;
                const userCooldown = cooldowns[ctx.sender] || { count: 0, reset: 0 };
                if (now > userCooldown.reset) {
                    userCooldown.count = 0;
                    userCooldown.reset = now + cooldownTime;
                }

                if (userCooldown.count >= 2) {
                    const tiempoRestante = Math.ceil((userCooldown.reset - now) / 60000);
                    return await ctx.reply(styleText(
                        `✘ Ya has robado 2 waifus. Espera *${tiempoRestante} minuto(s)* para volver a robar.`
                    ));
                }

                userCooldown.count++;
                cooldowns[ctx.sender] = userCooldown;
                ctx.db.cooldowns = cooldowns;
            }

            gachaService.transferCharacter(waifuId, ctx.sender);
            if (!userData.gacha.characters) {
                userData.gacha.characters = [];
            }
            userData.gacha.characters.push({
                id: waifu.id,
                name: waifu.name,
                claimedAt: Date.now()
            });

            const ownerCharIndex = ownerData.gacha.characters.findIndex(c => c.id === waifuId);
            if (ownerCharIndex !== -1) {
                ownerData.gacha.characters.splice(ownerCharIndex, 1);
            }

            ctx.dbService.markDirty();
            await ctx.dbService.save();
            await ctx.gachaService.save(); // 🔥 Guardado global

            await ctx.reply(styleText(
                `✧ Has robado a *${waifu.name}* (ID: ${waifu.id}) del usuario *${oldOwner?.split('@')[0] || 'Nadie'}* ✧`
            ));

            if (oldOwner && oldOwner !== ctx.sender && oldOwner !== global.botOwner) {
                try {
                    await ctx.bot.sendMessage(oldOwner, {
                        text: styleText(`✘ El usuario *@${ctx.sender.split('@')[0]}* ha robado tu waifu *${waifu.name}* (ID: ${waifu.id}).`),
                        mentions: [ctx.sender]
                    });
                } catch (error) {
                    console.error('Error enviando notificación al dueño:', error.message);
                }
            }
        } catch (error) {
            await ctx.reply(styleText(`✘ Error: ${error.message}`));
        }
    }
};
