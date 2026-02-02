import { isBotAdmin, isAdmin, styleText } from '../lib/utils.js';

export default {
    commands: ['del', 'delete', 'eliminar', 'dd'],
    tags: ['admin'],
    help: ['delete (responde a un mensaje)'],

    async execute(ctx) {
        const { bot, chatId, isGroup, msg, reply, sender } = ctx;
        const conn = bot?.sock;

        if (!isGroup) {
            return await reply(styleText('ꕤ Este comando solo funciona en grupos.'));
        }

        if (!await isAdmin(conn, chatId, sender)) {
            return await reply(styleText('ꕤ Necesitas ser administrador para usar este comando.'));
        }

        if (!await isBotAdmin(conn, chatId)) {
            return await reply(styleText('ꕤ Necesito ser administrador para eliminar mensajes.'));
        }

        if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            return await reply(styleText('ꕤ Por favor responde al mensaje que quieres eliminar.'));
        }

        const quoted = msg.message.extendedTextMessage.contextInfo;
        const participant = quoted.participant || quoted.remoteJid;

        const deleteKey = {
            remoteJid: chatId,
            fromMe: participant === conn.user.id.split(':')[0] + '@s.whatsapp.net',
            id: quoted.stanzaId,
            participant: participant
        };

        try {
            await conn.sendMessage(chatId, { delete: deleteKey });
        } catch (e) {
            console.error('[Delete] Error:', e);
            await reply(styleText('ꕤ Error al eliminar el mensaje.'));
        }
    }
};
