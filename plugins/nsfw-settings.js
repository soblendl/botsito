import { isAdmin, styleText } from '../lib/utils.js';

export default {
    commands: ['nsfw'],

    async execute(ctx) {
        const { chatId, sender, senderLid, args, isGroup, bot, dbService } = ctx;
        if (!isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const userIdForAdmin = senderLid || sender;
        const admin = await isAdmin(bot, chatId, userIdForAdmin);
        
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        if (!args[0] || !['on', 'off'].includes(args[0].toLowerCase())) {
            return await ctx.reply(styleText('ꕤ Uso » *#nsfw* <on/off>'));
        }

        const enable = args[0].toLowerCase() === 'on';
        
        // Update group settings via dbService
        const group = await dbService.getGroup(chatId);
        if (!group.settings) group.settings = {};
        
        await dbService.updateGroup(chatId, {
            'settings.nsfw': enable
        });

        await ctx.reply(styleText(`ꕤ Comandos NSFW ${enable ? 'activados' : 'desactivados'}.`));
    }
};
