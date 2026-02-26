import { formatNumber, formatNumberLarge, styleText, getCurrencyName } from '../../utils/helpers.js';
export default {
    commands: ['balance', 'bal', 'saldo'],
    async execute(ctx) {
        console.log('🔍 [BAL] ctx.sender:', ctx.sender);
        console.log('🔍 [BAL] ctx.senderLid:', ctx.senderLid);
        const currencyName = await getCurrencyName(ctx);
        const userData = await ctx.dbService.getUser(ctx.sender, ctx.senderLid);
        console.log('🔍 [BAL] userData.id:', userData?.id);
        console.log('🔍 [BAL] userData.economy.coins:', userData?.economy?.coins);
        console.log('🔍 [BAL] userData.economy.bank:', userData?.economy?.bank);
        const economy = userData.economy || {};
        await ctx.reply(styleText(
            `ꕣ *Balance de Usuario*\n\n` +
            `⟡ Billetera: *¥${formatNumberLarge(economy.coins || 0)}* ${currencyName}\n` +
            `⟡ Banco: *¥${formatNumberLarge(economy.bank || 0)}* ${currencyName}\n` +
            `⟡ Total: *¥${formatNumberLarge((economy.coins || 0) + (economy.bank || 0))}* ${currencyName}`
        ));
    }
};