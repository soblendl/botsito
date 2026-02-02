import { isAdmin, styleText } from '../lib/utils.js';

export default {
    commands: ['tag'],

    async execute(ctx) {
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const admin = await isAdmin(ctx.bot, ctx.chatId, ctx.senderLid || ctx.sender);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        // Obtener el texto del mensaje citado o de los argumentos
        let text = '';
        
        // El mensaje está en ctx.msg
        const msg = ctx.msg;
        
        // Buscar el mensaje citado en diferentes ubicaciones posibles
        const contextInfo = 
            msg?.message?.extendedTextMessage?.contextInfo ||
            msg?.message?.imageMessage?.contextInfo ||
            msg?.message?.videoMessage?.contextInfo ||
            msg?.message?.documentMessage?.contextInfo;
        
        const quotedMsg = contextInfo?.quotedMessage;
        
        if (quotedMsg) {
            // Extraer texto según el tipo de mensaje citado
            if (quotedMsg.conversation) {
                text = quotedMsg.conversation;
            } else if (quotedMsg.extendedTextMessage?.text) {
                text = quotedMsg.extendedTextMessage.text;
            } else if (quotedMsg.imageMessage?.caption) {
                text = quotedMsg.imageMessage.caption;
            } else if (quotedMsg.videoMessage?.caption) {
                text = quotedMsg.videoMessage.caption;
            } else if (quotedMsg.documentMessage?.caption) {
                text = quotedMsg.documentMessage.caption;
            } else if (quotedMsg.buttonsResponseMessage?.selectedDisplayText) {
                text = quotedMsg.buttonsResponseMessage.selectedDisplayText;
            } else if (quotedMsg.listResponseMessage?.title) {
                text = quotedMsg.listResponseMessage.title;
            }
        }
        
        // Si no hay texto del mensaje citado, usar los argumentos del comando
        if (!text || text.trim() === '') {
            text = ctx.args.join(' ') || 'Atención a todos!';
        }

        try {
            const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
            const participants = groupMetadata.participants.map(p => p.id);

            // Enviar el mensaje con menciones a todos
            await ctx.reply(text, {
                mentions: participants
            });
        } catch (error) {
            console.error('[AdminTag] Error:', error);
            await ctx.reply(styleText('ꕤ Error al enviar el mensaje: ' + error.message));
        }
    }
};