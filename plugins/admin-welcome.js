import { isAdmin, styleText } from '../lib/utils.js';

export default {
    commands: ['welcome'],

    async execute(ctx) {
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const admin = await isAdmin(ctx.bot, ctx.chatId, ctx.senderLid || ctx.sender);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        if (!ctx.args[0] || !['on', 'off'].includes(ctx.args[0].toLowerCase())) {
            return await ctx.reply(styleText('ꕤ Uso: */welcome* `<on/off>`'));
        }

        try {
            const enable = ctx.args[0].toLowerCase() === 'on';
            const result = ctx.dbService.updateGroup(ctx.chatId, { 'settings.welcome': enable });

            if (result) {
                await ctx.reply(styleText(`ꕥ Bienvenidas ${enable ? 'activadas ✅' : 'desactivadas ❌'}.`));
            } else {
                throw new Error('Database update failed');
            }
        } catch (error) {
            console.error('[AdminWelcome] Error:', error);
            await ctx.reply(styleText('ꕤ Error al cambiar la configuración de bienvenidas.'));
        }
    }
};
