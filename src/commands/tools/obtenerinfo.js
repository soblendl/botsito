import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['obtenerinfo', 'getinfo', 'userinfo'],
    tags: ['tools'],
    help: ['obtenerinfo @usuario'],
    async execute(ctx) {
        const { msg, bot, chatId, isGroup } = ctx;

        if (!isGroup) {
            return await ctx.reply(styleText('ꕢ Este comando solo funciona en grupos.'));
        }

        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentionedJid || mentionedJid.length === 0) {
            return await ctx.reply(styleText('ꕢ Debes etiquetar a un usuario.\nEjemplo: #obtenerinfo @usuario'));
        }

        const targetUser = mentionedJid[0];

        try {
            const metadata = await ctx.bot.groupMetadata(chatId);
            const participants = metadata.participants;
            const phoneNumber = targetUser.split('@')[0].split(':')[0];
            const participant = participants.find(p => {
                const participantNumber = p.id.split('@')[0].split(':')[0];
                return participantNumber === phoneNumber;
            });

            let message = `📱 *Información del Usuario*\n\n`;
            message += `👤 *Mencionado como:* @${targetUser.split('@')[0]}\n\n`;
            message += `📞 *Número base:* ${phoneNumber}\n\n`;
            message += `🔗 *Formatos de JID:*\n`;
            message += `• PN (Phone Number): \`${phoneNumber}@s.whatsapp.net\`\n`;

            if (participant) {
                message += `• LID (Linked ID): \`${participant.id}\`\n`;
            } else {
                message += `• LID: _No encontrado en el grupo_\n`;
            }

            await ctx.reply(styleText(message), { mentions: [targetUser] });
        } catch (error) {
            logger.error('Error en obtenerinfo:', error);
            await ctx.reply(styleText('ꕢ Error al obtener la información del usuario.'));
        }
    }
};
