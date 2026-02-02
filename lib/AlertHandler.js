import { styleText } from './utils.js';

export class AlertHandler {
    constructor(dbService) {
        this.dbService = dbService;
    }
    async handle(bot, event) {
        const { id, participants, action, author } = event;
        
        console.log(`[AlertHandler] Evento recibido: action=${action}, author=${author}`);
        
        if (!['promote', 'demote', 'remove'].includes(action)) {
            console.log(`[AlertHandler] Accion '${action}' no soportada, ignorando`);
            return;
        }
        
        const groupData = await this.dbService.getGroup(id);
        console.log(`[AlertHandler] GroupData alerts: ${groupData?.settings?.alerts}`);
        
        if (!groupData?.settings?.alerts) {
            console.log(`[AlertHandler] Alertas no activadas para este grupo`);
            return;
        }
        
        const maker = author;
        
        for (const participant of participants) {
            // Handle both old format (string) and new format (object with id/phoneNumber)
            const participantId = typeof participant === 'string' 
                ? participant 
                : (participant.phoneNumber || participant.id);
            
            console.log(`[AlertHandler] Procesando participante: ${participantId}`);
            
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
                console.log(`[AlertHandler] Enviando alerta: ${message}`);
                const mentions = [maker, participantId].filter(Boolean);
                try {
                    await bot.ws.sendMessage(id, {
                        text: styleText(message),
                        mentions: mentions
                    });
                    console.log(`[AlertHandler] Alerta enviada exitosamente`);
                } catch (sendErr) {
                    console.error(`[AlertHandler] Error enviando mensaje:`, sendErr.message);
                }
            }
        }
    }
}