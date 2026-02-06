import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['suggest', 'sugerencia', 'sugest'],
    tags: ['tools'],
    help: ['suggest <texto>'],
    async execute(ctx) {
        const { text, bot, sender } = ctx;
        const adminNumber = '639972367773@s.whatsapp.net';

        if (!text) {
            return await ctx.reply(styleText('ꕢ Por favor escribe tu sugerencia.\nEjemplo: #suggest Agregar más juegos'));
        }

        try {
            const originalSender = ctx.msg.key.participant || sender;
            const suggestionMsg = `ꕣ *Nueva Sugerencia*\n\n` +
                `> *De* » @${originalSender.split('@')[0]}\n` +
                `> *Mensaje* » ${text}`;

            await bot.sock.sendMessage(adminNumber, {
                text: suggestionMsg,
                mentions: [originalSender]
            });

            await ctx.reply(styleText('ꕢ ¡Gracias! Tu sugerencia ha sido enviada al administrador.'));
        } catch (error) {
            logger.error('Error enviando sugerencia:', error);
            await ctx.reply(styleText('ꕢ Hubo un error al enviar la sugerencia. Intenta más tarde.'));
        }
    }
};
