import { isBotAdmin, isAdmin, extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['warn', 'advertir', 'unwarn', 'delwarn'],
    tags: ['admin'],
    help: ['warn @user [razón]', 'unwarn @user'],

    async execute(ctx) {
        // 1. Verificaciones básicas
        if (!ctx.isGroup) {
            return await ctx.reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        const admin = await isAdmin(ctx.bot, ctx.chatId, ctx.senderLid || ctx.sender);
        if (!admin) {
            return await ctx.reply(styleText('ꕤ Solo los administradores pueden usar este comando.'));
        }

        // 2. Obtener usuario objetivo
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

        if (mentioned.length > 0) {
            targetUser = mentioned[0];
        } else if (quoted) {
            targetUser = quoted;
        }

        if (!targetUser) {
            return await ctx.reply(styleText('ꕤ Por favor etiqueta o responde al usuario que deseas advertir.'));
        }

        // 3. Verificaciones de seguridad
        if (await isAdmin(ctx.bot.sock, ctx.chatId, targetUser)) {
            return await ctx.reply(styleText('ꕤ No puedo advertir a un administrador.'));
        }

        if (targetUser.includes(ctx.bot.sock.user.id.split(':')[0])) {
            return await ctx.reply(styleText('ꕤ No puedo advertirme a mí mismo.'));
        }

        // 4. Lógica de advertencias
        const userData = ctx.dbService.getUser(targetUser);
        if (!userData.warns) userData.warns = 0;

        const isUnwarn = ['unwarn', 'delwarn'].includes(ctx.command);

        if (isUnwarn) {
            if (userData.warns > 0) {
                userData.warns -= 1;
                ctx.dbService.markDirty();
                
                return await ctx.reply(styleText(
                    `ꕥ *Advertencia Eliminada*\n\n` +
                    `> ⚬ Usuario » @${targetUser.split('@')[0]}\n` +
                    `> ⚬ Advertencias » ${userData.warns}/3`
                ), { mentions: [targetUser] });
            } else {
                return await ctx.reply(styleText('ꕤ El usuario no tiene advertencias para eliminar.'));
            }
        } 
        
        // 5. Agregar advertencia
        userData.warns += 1;
        ctx.dbService.markDirty();

        // Extraer razón (limpiando menciones si es necesario)
        const reason = ctx.args.filter(arg => !arg.includes('@')).join(' ') || 'Sin razón especificada';
        const warns = userData.warns;

        // 6. Verificar límite de advertencias (Kick)
        if (warns >= 3) {
            // Verificar si el bot es admin antes de intentar expulsar
            if (await isBotAdmin(ctx.bot.sock, ctx.chatId)) {
                
                await ctx.reply(styleText(
                    `ꕥ *LÍMITE ALCANZADO* \n\n` +
                    `> ⚬ Usuario » @${targetUser.split('@')[0]}\n` +
                    `> ▸ Razón Final » ${reason}\n\n` +
                    `> El usuario ha acumulado 3 advertencias y será expulsado.`
                ), { mentions: [targetUser] });

                try {
                    await ctx.bot.groupParticipantsUpdate(ctx.chatId, [targetUser], 'remove');
                    userData.warns = 0; // Resetear warn al expulsar
                    ctx.dbService.markDirty();
                } catch (error) {
                    await ctx.reply(styleText('ꕤ Error al intentar expulsar al usuario.'));
                }

            } else {
                await ctx.reply(styleText(
                    `ꕥ *LÍMITE ALCANZADO* \n\n` +
                    `> ⚬ Usuario » @${targetUser.split('@')[0]}\n` +
                    `> Ha acumulado 3 advertencias pero no soy admin para expulsarlo.`
                ), { mentions: [targetUser] });
            }
        } else {
            // Solo advertencia
            await ctx.reply(styleText(
                `ꕥ *Advertencia* \n\n` +
                `> ⚬ Usuario » @${targetUser.split('@')[0]}\n` +
                `> ▸ Razón » ${reason}\n` +
                `> ⚬ Advertencias » ${warns}/3\n\n` +
                `> _Al llegar a 3 advertencias serás expulsado_`
            ), { mentions: [targetUser] });
        }
    }
};
