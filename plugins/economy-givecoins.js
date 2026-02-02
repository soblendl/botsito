import { extractMentions, formatNumber, styleText } from '../lib/utils.js';

export default {
    commands: ['givecoins', 'darcoins', 'pay', 'transfer'],

    async execute(ctx) {
        if (ctx.args.length < 2) {
            return await ctx.reply(styleText('ꕤ Uso: *#givecoins* `<@usuario>` `<cantidad>`'));
        }
        const mentions = extractMentions(ctx);
        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes mencionar a un usuario.'));
        }
        let target = mentions[0];
        
        // Fix: Resolver LID a Phone JID si es necesario
        if (target.includes('@lid') && ctx.isGroup) {
            try {
                const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
                const participant = groupMetadata.participants.find(p => p.lid === target || p.id === target);
                if (participant && participant.id) {
                    target = participant.id;
                }
            } catch (e) {
                console.error('Error resolving LID in givecoins:', e);
            }
        }

        const amount = parseInt(ctx.args[1]);
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕤ La cantidad debe ser un número mayor a 0.'));
        }
        const senderData = await ctx.dbService.getUser(ctx.sender);
        const senderEconomy = senderData.economy || {};
        if ((senderEconomy.coins || 0) < amount) {
            return await ctx.reply(styleText('ꕤ No tienes suficientes coins.'));
        }
        const targetData = await ctx.dbService.getUser(target);
        const targetEconomy = targetData.economy || {};
        ctx.dbService.updateUser(ctx.sender, {
            'economy.coins': (senderEconomy.coins || 0) - amount
        });
        ctx.dbService.updateUser(target, {
            'economy.coins': (targetEconomy.coins || 0) + amount
        });
        await ctx.dbService.save();
        await ctx.dbService.save();
        
        const displayName = targetData.name || target.split('@')[0].split(':')[0];
        
        await ctx.reply(styleText(`ꕥ Transferiste ¥${formatNumber(amount)} coins a @${displayName}`), {
            mentions: [target]
        });
    }
};