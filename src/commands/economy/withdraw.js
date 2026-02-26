import { formatNumber, styleText, getCurrencyName } from '../../utils/helpers.js';
export default {
    // Updated for currency system
    commands: ['withdraw', 'wd'],
    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕢ El sistema de economía está desactivado en este grupo.'));
            }
        }
        const economy = ctx.userData.economy || {};
        if (!ctx.args[0]) {
            return await ctx.reply(styleText('ꕢ Debes especificar una cantidad.\nUso: #withdraw <cantidad>'));
        }
        const amount = ctx.args[0].toLowerCase() === 'all' ? (economy.bank || 0) : parseInt(ctx.args[0]);
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕢ Cantidad inválida.'));
        }
        if (amount > (economy.bank || 0)) {
            return await ctx.reply(styleText('ꕢ No tienes suficientes coins en el banco.'));
        }
        const currencyName = await getCurrencyName(ctx);
        ctx.dbService.updateUser(ctx.sender, {
            'economy.bank': (economy.bank || 0) - amount,
            'economy.coins': (economy.coins || 0) + amount
        });
        await ctx.dbService.save();
        await ctx.reply(styleText(
            `ꕣ *Retiro Exitoso*\n\n` +
            `> ✿ Retiraste » *¥${formatNumber(amount)}* ${currencyName}\n` +
            `> ✿ ${currencyName} » *¥${formatNumber((economy.coins || 0) + amount)}*\n` +
            `> ✿ Banco » *¥${formatNumber((economy.bank || 0) - amount)}*`
        ));
    }
};
