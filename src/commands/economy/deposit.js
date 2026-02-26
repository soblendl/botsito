import { formatNumber, styleText, getCurrencyName } from '../../utils/helpers.js';
export default {
    // Updated for currency system
    commands: ['deposit', 'dep', 'depositar', 'd'],
    async execute(ctx) {
        if (ctx.args.length === 0) {
            return await ctx.reply(styleText('ꕢ Uso: *#deposit* <cantidad|all>'));
        }
        const userData = await ctx.dbService.getUser(ctx.sender);
        const economy = userData.economy || {};
        let amount;
        if (ctx.args[0].toLowerCase() === 'all') {
            amount = economy.coins || 0;
        } else {
            amount = parseInt(ctx.args[0]);
        }
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕢ La cantidad debe ser un número mayor a 0.'));
        }
        if ((economy.coins || 0) < amount) {
            return await ctx.reply(styleText('ꕢ No tienes suficientes coins en tu billetera.'));
        }
        const currencyName = await getCurrencyName(ctx);
        ctx.dbService.updateUser(ctx.sender, {
            'economy.coins': (economy.coins || 0) - amount,
            'economy.bank': (economy.bank || 0) + amount
        });
        await ctx.dbService.save();
        await ctx.reply(styleText(`ꕣ Depositaste *¥${formatNumber(amount)}* ${currencyName} en el banco.`));
    }
};
