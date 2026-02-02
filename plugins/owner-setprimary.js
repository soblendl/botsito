import { isAdmin, styleText } from '../lib/utils.js';

export default {
    commands: ['setprimary', 'setmain', 'botprincipal'],
    tags: ['owner', 'group'],
    help: ['setprimary @bot', 'setprimary off'],

    async execute(ctx) {
        const { bot, chatId, isGroup, args, sender, reply, dbService } = ctx;
        const conn = bot.sock;

        if (!isGroup) {
            return await reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        // Permitir a admins del grupo y al dueño globales usar el comando
        if (!await isAdmin(conn, chatId, sender) && !ctx.isOwner) {
            return await reply(styleText('ꕤ Necesitas ser administrador para usar este comando.'));
        }

        const input = args[0]?.toLowerCase();
        
        if (input === 'off' || input === 'disable' || input === 'reset' || input === 'apagar') {
             await dbService.updateGroup(chatId, { primaryBot: null });
             return await reply(styleText('ꕤ Se ha desactivado el bot principal. Ahora responderán todos los bots.'));
        }

        let targetBotId = null;

        // Caso 1: Mención (@bot)
        if (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetBotId = ctx.msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            targetBotId = targetBotId.split('@')[0];
        } 
        // Caso 2: Argumento (número)
        else if (input && !isNaN(input)) {
            targetBotId = input;
        }
        // Caso 3: Sin argumentos (Asignar ESTE bot)
        else {
            if (conn?.user?.id) {
                targetBotId = conn.user.id.split(':')[0];
            } else {
                 return await reply(styleText('ꕤ Error: No se pudo obtener la ID del bot.'));
            }
        }

        if (!targetBotId) {
             return await reply(styleText('ꕤ No se pudo identificar el bot.'));
        }

        await dbService.updateGroup(chatId, { primaryBot: targetBotId });

        // Intentar obtener nombre del bot si es posible, o usar ID
        const targetBotName = (conn?.user?.id && targetBotId === conn.user.id.split(':')[0]) ? (conn.user.name || 'Este Bot') : `@${targetBotId}`;

        await reply(styleText(`ꕥ *Bot Principal Configurado*\n\n> Bot: ${targetBotName}\n\nAhora solo este bot responderá a los comandos en este grupo.`));
    }
};
