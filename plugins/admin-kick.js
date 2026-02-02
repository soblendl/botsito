import { isAdmin, isBotAdmin, extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['kick', 'expulsar', 'ban', 'b'],

    async execute(ctx) {
        console.log(`[AdminKick] ========== INICIANDO COMANDO KICK ==========`);
        console.log(`[AdminKick] Sender: ${ctx.sender}`);
        console.log(`[AdminKick] SenderLid: ${ctx.senderLid}`);
        console.log(`[AdminKick] ChatId: ${ctx.chatId}`);
        console.log(`[AdminKick] isGroup: ${ctx.isGroup}`);

        if (!ctx.isGroup) {
            console.log(`[AdminKick] No es grupo, saliendo`);
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        // 1. Verificar Admin
        const userIdForAdmin = ctx.senderLid || ctx.sender;
        console.log(`[AdminKick] Verificando permisos de admin con: ${userIdForAdmin}`);
        const admin = await isAdmin(ctx.bot, ctx.chatId, userIdForAdmin);
        console.log(`[AdminKick] ¿Usuario es admin?: ${admin}`);
        
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        // 2. Verificar Bot Admin
        console.log(`[AdminKick] Verificando si el bot es admin...`);
        const botAdmin = await isBotAdmin(ctx.bot, ctx.chatId);
        console.log(`[AdminKick] ¿Bot es admin?: ${botAdmin}`);
        
        if (!botAdmin) {
            return await ctx.reply(styleText('ꕤ Necesito ser administrador para expulsar usuarios.'));
        }

        // 3. Obtener Usuario Objetivo
        let targetUser = null;
        const msg = ctx.msg;

        // Buscar en menciones o respuesta
        const contextInfo = 
            msg?.message?.extendedTextMessage?.contextInfo ||
            msg?.message?.imageMessage?.contextInfo ||
            msg?.message?.videoMessage?.contextInfo ||
            msg?.message?.documentMessage?.contextInfo;
            
        const quoted = contextInfo?.participant;
        const mentioned = extractMentions(ctx);

        console.log(`[AdminKick] ContextInfo:`, contextInfo ? 'presente' : 'null');
        console.log(`[AdminKick] Quoted participant:`, quoted);
        console.log(`[AdminKick] Menciones:`, mentioned);

        if (mentioned.length > 0) {
            targetUser = mentioned[0];
            console.log(`[AdminKick] Usuario objetivo (de menciones): ${targetUser}`);
        } else if (quoted) {
            targetUser = quoted;
            console.log(`[AdminKick] Usuario objetivo (de quoted): ${targetUser}`);
        }

        if (!targetUser) {
            console.log(`[AdminKick] No se encontró usuario objetivo`);
            return await ctx.reply(styleText('ꕤ Por favor etiqueta o responde al usuario a expulsar.\n\n> _Uso: #kick @usuario_'));
        }

        // 4. Ejecutar Expulsión
        try {
            // Verificar si el usuario objetivo es admin
            console.log(`[AdminKick] Verificando si objetivo ${targetUser} es admin...`);
            const targetIsAdmin = await isAdmin(ctx.bot, ctx.chatId, targetUser);
            console.log(`[AdminKick] ¿Objetivo es admin?: ${targetIsAdmin}`);
            
            if (targetIsAdmin) {
                return await ctx.reply(styleText(`ꕤ No puedo expulsar a @${targetUser.split('@')[0]} porque es administrador.`), {
                    mentions: [targetUser]
                });
            }

            // Verificar si es el propio bot
            const botId = ctx.bot.sock?.user?.id?.split(':')[0] || ctx.bot.user?.id?.split(':')[0];
            console.log(`[AdminKick] Bot ID: ${botId}`);
            console.log(`[AdminKick] Target incluye botId?: ${targetUser.includes(botId)}`);
            
            if (targetUser.includes(botId)) {
                return await ctx.reply(styleText('ꕤ No puedo expulsarme a mí mismo.'));
            }

            // Proceder con la expulsión
            console.log(`[AdminKick] Ejecutando expulsión de ${targetUser}...`);
            await ctx.bot.groupParticipantsUpdate(ctx.chatId, [targetUser], 'remove');
            console.log(`[AdminKick] Expulsión exitosa`);

            await ctx.reply(styleText(
                `ꕥ *Usuario Expulsado* \n\n` +
                `> ⚬ Usuario » @${targetUser.split('@')[0]}\n` +
                `> ⚬ Acción » Expulsión inmediata`
            ), {
                mentions: [targetUser]
            });

        } catch (error) {
            console.error('[AdminKick] Error:', error);
            await ctx.reply(styleText('ꕤ Error al expulsar al usuario: ' + error.message));
        }
        
        console.log(`[AdminKick] ========== FIN COMANDO KICK ==========`);
    }
};
