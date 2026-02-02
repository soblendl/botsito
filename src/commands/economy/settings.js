import { styleText, isAdmin } from '../../utils/helpers.js';
export default {
    commands: ['economy'],
    async execute(ctx) {
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }
        const userIdForAdmin = ctx.senderLid || ctx.sender;
        const admin = await isAdmin(ctx.bot, ctx.chatId, userIdForAdmin);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }
        if (!ctx.args[0] || !['on', 'off'].includes(ctx.args[0].toLowerCase())) {
            return await ctx.reply(styleText('ꕤ Uso: *#economy* `<on/off>`'));
        }
        const enable = ctx.args[0].toLowerCase() === 'on';
        const groupData = await ctx.dbService.getGroup(ctx.chatId);
        await ctx.dbService.updateGroup(ctx.chatId, { 'settings.economy': enable });
        await ctx.reply(styleText(`ꕥ Sistema de economía ${enable ? 'activado' : 'desactivado'}.`));
    }
};
