import { formatNumber, formatNumberLarge, styleText } from '../../utils/helpers.js';
export default {
    commands: ['balance', 'bal', 'saldo'],
    async execute(ctx) {
        const userData = await ctx.dbService.getUser(ctx.sender);
        const economy = userData.economy || {};
        await ctx.reply(styleText(
            `ꕣ *Balance de Usuario*\n\n` +
            `⟡ Billetera: *¥${formatNumberLarge(economy.coins || 0)}* coins\n` +
            `⟡ Banco: *¥${formatNumberLarge(economy.bank || 0)}* coins\n` +
            `⟡ Total: *¥${formatNumberLarge((economy.coins || 0) + (economy.bank || 0))}* coins`
        ));
    }
};
