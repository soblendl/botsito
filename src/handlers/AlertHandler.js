import { styleText } from '../utils/helpers.js';
import { globalLogger as logger } from '../utils/logger.js';

export class AlertHandler {
    constructor(dbService) {
        this.dbService = dbService;
    }

    async handle(bot, event) {
        const { id, participants, action, author } = event;

        if (!['promote', 'demote', 'remove'].includes(action)) {
            return;
        }

        const groupData = await this.dbService.getGroup(id);

        if (!groupData?.settings?.alerts) {
            return;
        }

        const maker = author;
        for (const participant of participants) {
            const participantId = typeof participant === 'string'
                ? participant
                : (participant.phoneNumber || participant.id);

            let message = '';
            const makerNumber = maker?.split('@')[0]?.split(':')[0] || 'Desconocido';
            const participantNumber = participantId?.split('@')[0]?.split(':')[0] || 'Desconocido';

            if (action === 'promote') {
                message = `> ⌞✦⌝ *@${makerNumber}* ha promovido a @${participantNumber}`;
            } else if (action === 'demote') {
                message = `> ⌞✦⌝ *@${makerNumber}* ha quitado el admin a @${participantNumber}`;
            } else if (action === 'remove') {
                if (maker && maker !== participantId) {
                    message = `> ⌞✦⌝ *@${makerNumber}* ha eliminado a *@${participantNumber}*`;
                }
            }

            if (message) {
                const mentions = [maker, participantId].filter(Boolean);
                try {
                    await bot.ws.sendMessage(id, {
                        text: styleText(message),
                        mentions: mentions
                    });
                } catch (sendErr) {
                    logger.error(`[AlertHandler] Error enviando mensaje:`, sendErr.message);
                }
            }
        }
    }
}
