import { extractMentions, formatNumber, styleText } from '../../utils/helpers.js';

export default {
    commands: ['givecoins', 'darcoins', 'pay', 'transfer'],

    async execute(ctx) {
        if (ctx.args.length < 2) {
            return await ctx.reply(styleText('ꕢ Uso: *#givecoins* `<@usuario>` `<cantidad>`'));
        }

        // Extraer el número limpio de cualquier ID
        const extractCleanNumber = (id) => {
            if (!id) return '';
            let num = id.split('@')[0];
            if (num.includes(':')) {
                num = num.split(':')[1] || num.split(':')[0];
            }
            return num.replace(/\D/g, '');
        };

        // Obtener menciones del mensaje
        let mentions = [];

        // Método 1: Del contextInfo (más confiable)
        if (ctx.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
            mentions = ctx.message.message.extendedTextMessage.contextInfo.mentionedJid;
        }

        // Método 2: Extraer del texto si no hay menciones directas
        if (mentions.length === 0) {
            mentions = extractMentions(ctx);
        }

        if (mentions.length === 0) {
            return await ctx.reply(styleText('ꕢ Debes mencionar a un usuario.'));
        }

        let target = mentions[0];
        let targetPhone = null;

        // RESOLVER LID A PHONE JID
        if (target.includes('@lid') || !target.includes('@s.whatsapp.net')) {
            const targetNumber = extractCleanNumber(target);

            // Estrategia 1: Buscar en participantes del grupo
            if (ctx.isGroup) {
                try {
                    const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);

                    // Buscar participante que coincida con el número
                    const participant = groupMetadata.participants.find(p => {
                        const pNum = extractCleanNumber(p.id);
                        const pLidNum = p.lid ? extractCleanNumber(p.lid) : '';

                        return pNum === targetNumber || pLidNum === targetNumber;
                    });

                    if (participant && participant.id && participant.id.includes('@s.whatsapp.net')) {
                        targetPhone = participant.id;
                    }
                } catch (e) {
                    console.error('Error obteniendo metadata:', e);
                }
            }

            // Estrategia 2: Buscar en store de contactos
            if (!targetPhone) {
                try {
                    const sock = ctx.bot.ws || ctx.bot.sock || ctx.bot;
                    const testJid = targetNumber + '@s.whatsapp.net';

                    if (sock.store && sock.store.contacts && sock.store.contacts[testJid]) {
                        targetPhone = testJid;
                    }
                } catch (e) {
                    console.error('Error buscando en store:', e);
                }
            }

            // Estrategia 3: Asumir formato estándar si tenemos un número válido
            if (!targetPhone && targetNumber && targetNumber.length >= 10) {
                targetPhone = targetNumber + '@s.whatsapp.net';
            }

            // Si aún no se resolvió, error
            if (!targetPhone) {
                return await ctx.reply(styleText('ꕢ No se pudo verificar el usuario. Intenta mencionarlo de nuevo o responde a uno de sus mensajes con el comando.'));
            }

            target = targetPhone;
        } else {
            // Ya es un phone JID válido
            target = target;
        }

        // Verificar que el target final sea un @s.whatsapp.net válido
        if (!target.includes('@s.whatsapp.net')) {
            return await ctx.reply(styleText('ꕢ Error: No se pudo obtener un identificador válido del usuario.'));
        }

        // Validar cantidad
        const amount = parseInt(ctx.args[1]);
        if (isNaN(amount) || amount <= 0) {
            return await ctx.reply(styleText('ꕢ La cantidad debe ser un número mayor a 0.'));
        }

        // No transferir a uno mismo
        const senderNumber = extractCleanNumber(ctx.sender);
        const targetNumber = extractCleanNumber(target);

        if (senderNumber === targetNumber) {
            return await ctx.reply(styleText('ꕢ No puedes transferirte coins a ti mismo.'));
        }

        // Verificar saldo del remitente
        const senderData = await ctx.dbService.getUser(ctx.sender);
        const senderEconomy = senderData.economy || {};

        if ((senderEconomy.coins || 0) < amount) {
            return await ctx.reply(styleText(`ꕢ No tienes suficientes coins. Tienes: ¥${formatNumber(senderEconomy.coins || 0)}`));
        }

        // Realizar transferencia
        const targetData = await ctx.dbService.getUser(target);
        const targetEconomy = targetData.economy || {};

        // Actualizar saldos
        await ctx.dbService.updateUser(ctx.sender, {
            'economy.coins': (senderEconomy.coins || 0) - amount
        });

        await ctx.dbService.updateUser(target, {
            'economy.coins': (targetEconomy.coins || 0) + amount
        });

        await ctx.dbService.save();

        // Mensaje de confirmación con mención
        const displayName = targetData.name || targetNumber;

        await ctx.reply(
            styleText(`ꕣ Transferiste ¥${formatNumber(amount)} coins a @${displayName}\n\n` +
                `Tu saldo: ¥${formatNumber((senderEconomy.coins || 0) - amount)}`),
            { mentions: [target] }
        );
    }
};