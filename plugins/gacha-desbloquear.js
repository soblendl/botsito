import { extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['desbloquear', 'unlock'],

    async execute(ctx) {
        const mentions = extractMentions(ctx);
        const userData = ctx.userData;

        if (mentions.length === 0) {
            return await ctx.reply(styleText('✘ Debes mencionar a alguien.\n\nEjemplo:\n*#desbloquear @usuario*'));
        }

        const target = mentions[0];
        const targetData = ctx.dbService.getUser(target);

        const costo = 100000;
        const duracion = 3 * 60 * 1000;

        if ((userData.monedas || 0) < costo) {
            return await ctx.reply(
                styleText(`✘ No tienes suficientes monedas.\n` +
                    `Necesitas *${costo.toLocaleString()}* monedas para desbloquear la base de @${target.split('@')[0]}.`),
                { mentions: [target] }
            );
        }

        userData.monedas = (userData.monedas || 0) - costo;
        targetData.desbloqueo = Date.now() + duracion;
        targetData.antirobo = 0;
        ctx.dbService.markDirty();

        await ctx.reply(
            styleText(`> 𐚁 *Base desbloqueada*.\n` +
                `⟡ @${target.split('@')[0]} ahora está vulnerable por 3 minutos.\n` +
                `⟡ Podrás robar sus waifus hasta: *${new Date(targetData.desbloqueo).toLocaleString()}*`),
            { mentions: [target] }
        );
    }
};
