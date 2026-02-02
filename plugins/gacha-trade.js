import { styleText } from '../lib/utils.js';
const pendingTrades = new Map();
export default {
    commands: ['trade', 'intercambio', 'aceptar'],
    tags: ['gacha'],
    help: ['trade <mi_personaje> + <su_personaje> + @usuario', 'aceptar'],

    async execute(ctx) {
        const { bot, chatId, sender, args, text, mentionedJid, reply, gachaService, command } = ctx;
        if (command === 'aceptar') {
            const trade = pendingTrades.get(chatId);
            if (!trade) {
                return await reply(styleText('ꕤ No hay ningún intercambio pendiente en este chat.'));
            }

            if (trade.targetUser !== sender) {
                return await reply(styleText('ꕤ Este intercambio no es para ti.'));
            }

            const { initiator, targetUser, initiatorChar, targetChar } = trade;
            const char1 = gachaService.getById(initiatorChar.id);
            const char2 = gachaService.getById(targetChar.id);
            if (char1.owner !== initiator || char2.owner !== targetUser) {
                pendingTrades.delete(chatId);
                return await reply(styleText('ꕤ El intercambio falló porque uno de los personajes ya no pertenece al dueño original.'));
            }

            // Transferir personajes
            gachaService.transferCharacter(initiatorChar.id, targetUser);
            gachaService.transferCharacter(targetChar.id, initiator);

            // Actualizar arrays locales de usuarios (opcional pero recomendado para consistencia visual inmediata)
            // Esto asume que tienes acceso a userData de ambos. Como solo tenemos 'sender' en ctx, necesitamos cargar ambos.
            const user1Data = ctx.dbService.getUser(initiator);
            const user2Data = ctx.dbService.getUser(targetUser);

            if (user1Data.gacha && user1Data.gacha.characters) {
                // Remover char1, agregar char2
                const idx1 = user1Data.gacha.characters.findIndex(c => c.id === initiatorChar.id);
                if (idx1 !== -1) user1Data.gacha.characters.splice(idx1, 1);
                user1Data.gacha.characters.push({ id: targetChar.id, name: targetChar.name, claimedAt: Date.now() });
            }

            if (user2Data.gacha && user2Data.gacha.characters) {
                // Remover char2, agregar char1
                const idx2 = user2Data.gacha.characters.findIndex(c => c.id === targetChar.id);
                if (idx2 !== -1) user2Data.gacha.characters.splice(idx2, 1);
                user2Data.gacha.characters.push({ id: initiatorChar.id, name: initiatorChar.name, claimedAt: Date.now() });
            }

            // Guardar todo
            ctx.dbService.updateUser(initiator, { 'gacha.characters': user1Data.gacha.characters });
            ctx.dbService.updateUser(targetUser, { 'gacha.characters': user2Data.gacha.characters });

            await ctx.dbService.save(); // Guarda usuarios
            await gachaService.save(); // Guarda personajes (global)

            pendingTrades.delete(chatId);
            return await reply(styleText(
                `ꕥ *Intercambio Exitoso* \n\n` +
                `✧ @${initiator.split('@')[0]} recibió a *${targetChar.name}*\n` +
                `✧ @${targetUser.split('@')[0]} recibió a *${initiatorChar.name}*`),
                { mentions: [initiator, targetUser] }
            );
        }

        if (!mentionedJid || mentionedJid.length === 0) {
            return await reply(styleText(
                `ꕤ *Uso incorrecto*\n\n` +
                `Formato: #trade <mi_personaje> <su_personaje> @usuario\n` +
                `Ejemplo: #trade Rem Emilia @usuario`
            ));
        }

        const targetUser = mentionedJid[0];
        if (targetUser === sender) {
            return await reply(styleText('ꕤ No puedes intercambiar contigo mismo.'));
        }

        const cleanText = text.replace(/@\d+/g, '').trim();
        const myChars = gachaService.getUserCharacters(sender);
        myChars.sort((a, b) => b.name.length - a.name.length);
        let myChar = null;
        let theirCharName = '';
        for (const char of myChars) {
            const regex = new RegExp(`^${char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+|$)`, 'i');
            if (regex.test(cleanText)) {
                myChar = char;
                theirCharName = cleanText.slice(char.name.length).trim();
                break;
            }
        }

        if (!myChar) {
            return await reply(styleText(`ꕤ No encontré ningún personaje tuyo al inicio del mensaje.\nAsegúrate de escribir el nombre tal cual lo tienes.`));
        }

        if (!theirCharName) {
            return await reply(styleText('ꕤ Debes escribir el nombre del personaje que quieres recibir después del tuyo.'));
        }

        const theirChars = gachaService.getUserCharacters(targetUser);
        const theirChar = theirChars.find(c => c.name.toLowerCase() === theirCharName.toLowerCase());
        if (!theirChar) {
            return await reply(styleText(`ꕤ @${targetUser.split('@')[0]} no tiene ningún personaje llamado "${theirCharName}".`), { mentions: [targetUser] });
        }

        pendingTrades.set(chatId, {
            initiator: sender,
            targetUser: targetUser,
            initiatorChar: myChar,
            targetChar: theirChar,
            timestamp: Date.now()
        });

        setTimeout(() => {
            const currentTrade = pendingTrades.get(chatId);
            if (currentTrade && currentTrade.timestamp === pendingTrades.get(chatId).timestamp) {
                pendingTrades.delete(chatId);
            }
        }, 120000);
        await reply(styleText(
            `ꕥ *Solicitud de Intercambio* \n\n` +
            `✧ @${sender.split('@')[0]} ofrece: *${myChar.name}*\n` +
            `✧ Para: @${targetUser.split('@')[0]} por: *${theirChar.name}*\n\n` +
            `> _*Responde con *#aceptar* para confirmar el intercambio.*_`),
            { mentions: [sender, targetUser] }
        );
    }
};
