import { formatNumber, getCooldown, formatTime, styleText } from '../lib/utils.js';

export default {
    commands: ['daily', 'diario'],
    tags: ['economy'],
    help: ['daily'],

    async execute(ctx) {
        if (ctx.isGroup) {
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            if (!groupData?.settings?.economy) {
                return await ctx.reply(styleText('ꕤ El sistema de economía está desactivado en este grupo.'));
            }
        }

        const userData = await ctx.dbService.getUser(ctx.sender);
        const now = Date.now();
        const COOLDOWN = 24 * 60 * 60 * 1000;
        const lastDaily = userData.economy?.lastDaily || 0;
        const cooldown = getCooldown(lastDaily, COOLDOWN);
        if (cooldown > 0) {
            return await ctx.reply(styleText(`ꕤ Ya reclamaste tu recompensa diaria.\nVuelve en: *${formatTime(cooldown)}*`));
        }
        const timeSinceLast = now - lastDaily;
        const streakTimeLimit = 48 * 60 * 60 * 1000;
        let streak = (userData.economy?.dailyStreak || 0);
        if (timeSinceLast < streakTimeLimit && lastDaily !== 0) {
            streak += 1;
        } else {
            streak = 1;
        }

        const reward = streak * 10000;
        await ctx.dbService.updateUser(ctx.sender, {
            'economy.coins': (userData.economy?.coins || 0) + reward,
            'economy.lastDaily': now,
            'economy.dailyStreak': streak
        });
        // DatabaseService.save is a no-op for MongoDB but harmless if awaited, though redundant.
        // We will keep it if it's there for compatibility or remove if not needed.
        // Given updateUser saves, we can probably remove it or keep it await-ed.
        // await ctx.dbService.save(); // Removed as updateUser handles persistence
        let message = `ꕥ *RECOMPENSA DIARIA*\n\n`;
        message += `> Día » ¥${streak}\n`;
        message += `> Recompensa » *¥${formatNumber(reward)}* coins\n`;
        if (streak > 1) {
            message += `\n_¡Mantén la racha para ganar más!_`;
        } else if (lastDaily !== 0) {
            message += `\n_¡Perdiste tu racha! Vuelve mañana para continuar._`;
        }
        await ctx.reply(styleText(message));
    }
};