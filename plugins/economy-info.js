import { formatNumber, formatNumberLarge, extractMentions, styleText, getCooldown, formatTime } from '../lib/utils.js';

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
        const target = mentions.length > 0 ? mentions[0] : ctx.sender;
        const userData = await ctx.dbService.getUser(target);
        const stats = userData.stats || {};
        const total = userData.economy.coins + userData.economy.bank;
        const cooldowns = {
            work: getCooldown(userData.economy?.lastWork || 0, 1 * 60 * 1000),
            daily: getCooldown(userData.economy?.lastDaily || 0, 24 * 60 * 60 * 1000),
            crime: getCooldown(userData.economy?.lastCrime || 0, 10 * 60 * 1000),
            slut: getCooldown(userData.economy?.lastSlut || 0, 10 * 60 * 1000),
            fish: getCooldown(userData.economy?.lastFish || 0, 30 * 1000)
        };
        let message = `ꕥ *Información de Economía*\n\n`;
        message += `✦ Usuario » @${target.split('@')[0]}\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n`;
        message += `✦ *DINERO*\n`;
        message += `> Coins » ${formatNumberLarge(userData.economy.coins)}\n`;
        message += `> Banco » ${formatNumberLarge(userData.economy.bank)}\n`;
        message += `> Total » ${formatNumberLarge(total)}\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n`;
        message += `✦ *COOLDOWNS*\n`;
        message += `> Work » ${cooldowns.work > 0 ? formatTime(cooldowns.work) : '*Disponible*'}\n`;
        message += `> Daily » ${cooldowns.daily > 0 ? formatTime(cooldowns.daily) : '*Disponible*'}\n`;
        message += `> Crime » ${cooldowns.crime > 0 ? formatTime(cooldowns.crime) : '*Disponible*'}\n`;
        message += `> Slut » ${cooldowns.slut > 0 ? formatTime(cooldowns.slut) : '*Disponible*'}\n`;
        message += `> Fish » ${cooldowns.fish > 0 ? formatTime(cooldowns.fish) : '*Disponible*'}\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n`;
        message += `✦ *ESTADÍSTICAS*\n`;
        message += `> Mensajes » ${formatNumber(stats?.messages || 0)}\n`;
        message += `> Comandos » ${formatNumber(stats?.commands || 0)}`;
        await ctx.reply(styleText(message), { mentions: [target] });
    }
};