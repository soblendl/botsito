import { formatNumber, styleText } from '../../utils/helpers.js';
export default {
    commands: ['deposit', 'dep', 'depositar', 'd'],
    async execute(ctx) {
        if (ctx.args.length === 0) {
            return await ctx.reply(styleText('ꕤ Uso: *#deposit* <cantidad|all>'));
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
            return await ctx.reply(styleText('ꕤ La cantidad debe ser un número mayor a 0.'));
        }
        if ((economy.coins || 0) < amount) {
            return await ctx.reply(styleText('ꕤ No tienes suficientes coins en tu billetera.'));
        }
        ctx.dbService.updateUser(ctx.sender, {
            'economy.coins': (economy.coins || 0) - amount,
            'economy.bank': (economy.bank || 0) + amount
        });
        await ctx.dbService.save();
        await ctx.reply(styleText(`ꕥ Depositaste *¥${formatNumber(amount)}* coins en el banco.`));
    }
};
