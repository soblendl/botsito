import { formatNumber, styleText } from '../lib/utils.js';

export default {
    commands: ['withdraw', 'wd'],

    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
            }
        }
        const economy = ctx.userData.economy || {};
        if (!ctx.args[0]) {
            return await ctx.reply(styleText('ꕤ Debes especificar una cantidad.\nUso: #withdraw <cantidad>'));
        }
        const amount = ctx.args[0].toLowerCase() === 'all' ? (economy.bank || 0) : parseInt(ctx.args[0]);
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕤ Cantidad inválida.'));
        }
        if (amount > (economy.bank || 0)) {
            return await ctx.reply(styleText('ꕤ No tienes suficientes coins en el banco.'));
        }
        ctx.dbService.updateUser(ctx.sender, {
            'economy.bank': (economy.bank || 0) - amount,
            'economy.coins': (economy.coins || 0) + amount
        });
        await ctx.dbService.save();
        await ctx.reply(styleText(
            `ꕥ *Retiro Exitoso*\n\n` +
            `> ✿ Retiraste » *¥${formatNumber(amount)}* coins\n` +
            `> ✿ Coins » *¥${formatNumber((economy.coins || 0) + amount)}*\n` +
            `> ✿ Banco » *¥${formatNumber((economy.bank || 0) - amount)}*`
        ));
    }
};