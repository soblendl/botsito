import { formatNumber, styleText } from '../lib/utils.js';

export default {
    commands: ['coinflip', 'cf'],
    async execute(ctx) {
        if (ctx.args.length < 2) {
            return await ctx.reply(styleText('ꕤ Uso: */coinflip* `<cantidad>` `<cara/cruz>`'));
        }
        const amount = parseInt(ctx.args[0]);
        const choice = ctx.args[1].toLowerCase();
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕤ La cantidad debe ser un número mayor a 0.'));
        }
        if (!['cara', 'cruz'].includes(choice)) {
            return await ctx.reply(styleText('ꕤ Debes elegir cara o cruz.'));
        }
        const userData = await ctx.dbService.getUser(ctx.sender);
        if ((userData.economy?.coins || 0) < amount) {
            return await ctx.reply(styleText('ꕤ No tienes suficientes coins.'));
        }
        const result = Math.random() < 0.5 ? 'cara' : 'cruz';
        const won = result === choice;
        if (won) {
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': (userData.economy?.coins || 0) + amount
            });
            // await ctx.dbService.save();
            await ctx.reply(styleText(`ꕥ ¡Salió *${result}*! Ganaste *¥${formatNumber(amount)}* coins.`));
        } else {
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': (userData.economy?.coins || 0) - amount
            });
            // await ctx.dbService.save();
            await ctx.reply(styleText(`ꕤ Salió *${result}*. Perdiste *¥${formatNumber(amount)}* coins.`));
        }
    }
};