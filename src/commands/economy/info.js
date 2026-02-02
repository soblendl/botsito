import { formatNumber, formatNumberLarge, extractMentions, styleText, getCooldown, formatTime } from '../../utils/helpers.js';

export default {
    commands: ['einfo'],
    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
            }
        }

        const mentions = extractMentions(ctx);
        let target = mentions.length > 0 ? mentions[0] : ctx.sender;

        // Fix LID issues
        if (target.includes('@lid')) {
            // Try to resolve using senderPhone if it's the sender
            if (target === ctx.senderLid && ctx.senderPhone) {
                target = `${ctx.senderPhone}@s.whatsapp.net`;
            } else {
                // Fallback: try to resolve from args if mentions failed but text was provided
                const targetNumber = ctx.args[0]?.replace('@', '');
                if (targetNumber && /^\d+$/.test(targetNumber)) {
                    target = `${targetNumber}@s.whatsapp.net`;
                }
            }
        }

        // Ensure standard JID format
        if (!target.includes('@s.whatsapp.net') && !target.includes('@lid')) {
            target = `${target}@s.whatsapp.net`;
        }

        const userData = await ctx.dbService.getUser(target);
        if (!userData) {
            return await ctx.reply(styleText('ꕤ Usuario no encontrado en la base de datos.'));
        }

        const stats = userData.stats || {};
        const total = (userData.economy.coins || 0) + (userData.economy.bank || 0);
        const cooldowns = {
            work: getCooldown(userData.economy?.lastWork || 0, 1 * 60 * 1000),
            daily: getCooldown(userData.economy?.lastDaily || 0, 24 * 60 * 60 * 1000),
            crime: getCooldown(userData.economy?.lastCrime || 0, 10 * 60 * 1000),
            slut: getCooldown(userData.economy?.lastSlut || 0, 10 * 60 * 1000),
            fish: getCooldown(userData.economy?.lastFish || 0, 30 * 1000)
        };

        let message = `╭─────── ୨୧ ───────╮\n`;
        message += `│ *ECONOMY INFO* \n`;
        message += `╰────────────────╯\n`;
        message += `✿ *::* *Usuario* › @${target.split('@')[0]}\n\n`;

        message += `╭─── ⚐ Balance ───╮\n`;
        message += `│ *Efectivo* › ${formatNumberLarge(userData.economy.coins || 0)}\n`;
        message += `│ *Banco*    › ${formatNumberLarge(userData.economy.bank || 0)}\n`;
        message += `│ *Total*    › ${formatNumberLarge(total)}\n`;
        message += `╰────────────────╯\n\n`;

        message += `╭─── ⚐ Cooldowns ───╮\n`;
        message += `│ *Work*  › ${cooldowns.work > 0 ? formatTime(cooldowns.work) : '✔'}\n`;
        message += `│ *Daily* › ${cooldowns.daily > 0 ? formatTime(cooldowns.daily) : '✔'}\n`;
        message += `│ *Crime* › ${cooldowns.crime > 0 ? formatTime(cooldowns.crime) : '✔'}\n`;
        message += `│ *Slut*  › ${cooldowns.slut > 0 ? formatTime(cooldowns.slut) : '✔'}\n`;
        message += `│ *Fish*  › ${cooldowns.fish > 0 ? formatTime(cooldowns.fish) : '✔'}\n`;
        message += `╰────────────────╯`;

        await ctx.reply(styleText(message), { mentions: [target] });
    }
};
