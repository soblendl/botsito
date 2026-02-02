import { formatNumber, extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['steal'],

    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
            }
        }
        const mentions = extractMentions(ctx);
        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes mencionar a un usuario.\nUso: *#steal* @usuario'));
        }
        const target = mentions[0];
        if (target === ctx.sender) {
            return await ctx.reply(styleText('ꕤ No puedes robarte a ti mismo.'));
        }
        
        // Fetch fresh data for both
        const userData = (await ctx.dbService.getUser(ctx.sender))?.economy || {};
        const targetUser = await ctx.dbService.getUser(target);
        const targetData = targetUser?.economy || {};
        
        const SUCCESS_RATE = 0.5;
        const success = Math.random() < SUCCESS_RATE;
        if (success) {
            const maxSteal = Math.floor(targetData.coins * 0.3);
            const stolen = Math.floor(Math.random() * maxSteal) + 1;
            
            // Await updates
            await ctx.dbService.updateUser(target, {
                'economy.coins': Math.max(0, targetData.coins - stolen)
            });
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': userData.coins + stolen
            });
            
            await ctx.reply(
                styleText(`ꕥ Robaste *¥${formatNumber(stolen)}* coins a @${target.split('@')[0]}`)
            );
        } else {
            const fine = Math.floor(Math.random() * 1000) + 500;
            
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': Math.max(0, userData.coins - fine)
            });
            await ctx.reply(
                styleText(`ꕤ *Te atraparon!*\n\n` +
                    `Intentaste robar a @${target.split('@')[0]} pero te atraparon.\n` +
                    `> ✿ Multa » *¥${formatNumber(fine)}* coins\n` +
                    `> ✿ Tu balance » *¥${formatNumber(Math.max(0, userData.coins - fine))}* coins`),
                { mentions: [target] }
            );
        }
    }
};