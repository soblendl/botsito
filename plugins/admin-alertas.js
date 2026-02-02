import { isAdmin, styleText } from '../lib/utils.js';

export default {
    commands: ['alertas'],
    async execute(ctx) {
        console.log('[DEBUG] admin-alertas: Inicio del comando');
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }
        const admin = await isAdmin(ctx.bot, ctx.chatId, ctx.senderLid || ctx.sender);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }
        if (!ctx.args[0] || !['on', 'off'].includes(ctx.args[0].toLowerCase())) {
            return await ctx.reply(styleText('ꕤ Uso: */alertas* `<on/off>`'));
        }
        try {
            const enable = ctx.args[0].toLowerCase() === 'on';
            const groupData = await ctx.dbService.getGroup(ctx.chatId);
            
            // Ensure settings object exists
            if (!groupData.settings) {
                groupData.settings = {};
            }
            
            await ctx.dbService.updateGroup(ctx.chatId, { 'settings.alerts': enable });
            await ctx.reply(styleText(`ꕥ Sistema de alertas ${enable ? 'activado ✅' : 'desactivado ❌'}.`));
        } catch (error) {
            console.error('[AdminAlertas] Error:', error);
            await ctx.reply(styleText('ꕤ Error al cambiar la configuración de alertas.'));
        }
    }
};