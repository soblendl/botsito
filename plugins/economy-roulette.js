import { formatNumber, styleText } from '../lib/utils.js';

export default {
    commands: ['roulette', 'rt'],

    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
            }
        }
        // Fetch fresh user data
        const userData = await ctx.dbService.getUser(ctx.sender);
        const economy = userData.economy || {};
        const userCoins = economy.coins || 0;
        
        if (!ctx.args[0] || !ctx.args[1]) {
            return await ctx.reply(styleText('ꕤ Uso incorrecto.\n> Uso: *#roulette* `<red/black>` `<cantidad>`'));
        }
        const choice = ctx.args[0].toLowerCase();
        const amount = parseInt(ctx.args[1]);

        if (!['red', 'black'].includes(choice)) {
            return await ctx.reply(styleText('ꕤ Debes elegir: red o black'));
        }
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕤ Cantidad inválida.'));
        }
        if (amount > userCoins) {
            return await ctx.reply(styleText('ꕤ No tienes suficientes coins.'));
        }
        const result = Math.random() < 0.5 ? 'red' : 'black';
        const won = result === choice;
        if (won) {
            const winAmount = Math.floor(amount * 1.8);
            const newBalance = userCoins + winAmount;
            
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': newBalance
            });
            
            await ctx.reply(styleText(
                `ꕥ *¡Ganaste!*\n\n` +
                `Salió: ${result} ${result === 'red' ? '🔴' : '⚫'}\n` +
                `Ganancia: +${formatNumber(winAmount)} coins\n` +
                `Balance: ${formatNumber(newBalance)} coins`
            ));
        } else {
            const newBalance = Math.max(0, userCoins - amount);
            
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': newBalance
            });
            
            await ctx.reply(styleText(
                `ꕥ *Perdiste*\n\n` +
                `Salió: ${result} ${result === 'red' ? '🔴' : '⚫'}\n` +
                `Pérdida: -${formatNumber(amount)} coins\n` +
                `Balance: ${formatNumber(newBalance)} coins`
            ));
        }
    }
};