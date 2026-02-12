import { extractMentions, formatNumber, styleText } from '../src/utils/helpers.js';

export default {
    commands: ['givecoins', 'darcoins', 'pay', 'transfer'],
    async execute(ctx) {
        if (ctx.args.length < 2) {
            return await ctx.reply(styleText('ꕢ Uso: *#givecoins* `<@usuario>` `<cantidad>`'));
        }
        const mentions = extractMentions(ctx);
        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕢ Debes mencionar a un usuario.'));
        }
        let target = mentions[0];

        // Fix: Resolver LID a Phone JID si es necesario
        if (target.includes('@lid') || !target.includes('@s.whatsapp.net')) {
            if (ctx.isGroup) {
                try {
                    const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
                    const participant = groupMetadata.participants.find(p => p.lid === target || p.id === target);
                    if (participant && participant.id && !participant.id.includes('@lid')) {
                        target = participant.id;
                    }
                } catch (e) {
                    // Fail silently, target remains as is
                }
            }

            // Si después de intentar resolver sigue siendo LID, intentar buscar en store o fallar
            if (target.includes('@lid')) {
                // Try one last heuristic: matches numbers
                const lidMatch = target.match(/^(\d+)/);
                if (lidMatch) {
                    // Assume it might be a phone number if we couldn't resolve it
                }
            }
        }

        // Final sanity check: if it looks like a phone JID, ensure suffix
        if (!target.includes('@s.whatsapp.net') && !target.includes('@lid')) {
            const nums = target.match(/\d+/);
            if (nums) target = `${nums[0]}@s.whatsapp.net`;
        }

        const amount = parseInt(ctx.args[1]);
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕢ La cantidad debe ser un número mayor a 0.'));
        }
        const senderData = await ctx.dbService.getUser(ctx.sender);
        const senderEconomy = senderData.economy || {};
        if ((senderEconomy.coins || 0) < amount) {
            return await ctx.reply(styleText('ꕢ No tienes suficientes coins.'));
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
        await ctx.reply(styleText(`ꕣ Transferiste ¥${formatNumber(amount)} coins a @${displayName}`), {
            mentions: [target]
        });
    }
};