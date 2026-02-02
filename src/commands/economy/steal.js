import { formatNumber, extractMentions, styleText } from '../../utils/helpers.js';

export default {
    commands: ['steal', 'robar'],
    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
            }
        }

        let target = null;
        const mentions = extractMentions(ctx);

        if (mentions.length > 0) {
            target = mentions[0];
        } else if (ctx.args.length > 0) {
            const potentialNumber = ctx.args[0].replace('@', '');
            if (/^\d+$/.test(potentialNumber)) {
                target = `${potentialNumber}@s.whatsapp.net`;
            }
        }

        if (!target) {
            return await ctx.reply(styleText('ꕤ Debes mencionar a un usuario.\nUso: *#steal* @usuario'));
        }

        // Fix LID issues
        if (target.includes('@lid')) {
            // We can't easily resolve LID to JID without context, but if the user passed a number in args, we use that.
            // If it came from mentions array, it might be an LID if the user has no contact name.
            // We'll rely on dbService to handle it or error out gracefully.
            // Ideally extractMentions should return JIDs, but Baileys sometimes gives LIDs.
            const participant = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.find(j => j.includes('@s.whatsapp.net'));
            if (participant) target = participant;
        }

        if (target === ctx.sender) {
            return await ctx.reply(styleText('ꕤ No puedes robarte a ti mismo.'));
        }

        const userData = (await ctx.dbService.getUser(ctx.sender))?.economy || {};
        const targetUser = await ctx.dbService.getUser(target);
        const targetData = targetUser?.economy || {};

        const SUCCESS_RATE = 0.5;
        const success = Math.random() < SUCCESS_RATE;

        if (success) {
            const maxSteal = Math.floor(targetData.coins * 0.3);
            const stolen = Math.floor(Math.random() * maxSteal) + 1;

            await ctx.dbService.updateUser(target, {
                'economy.coins': Math.max(0, targetData.coins - stolen)
            });
            await ctx.dbService.updateUser(ctx.sender, {
                'economy.coins': userData.coins + stolen
            });

            await ctx.reply(
                styleText(`ꕥ Robaste *¥${formatNumber(stolen)}* coins a @${target.split('@')[0]}`),
                { mentions: [target] }
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
