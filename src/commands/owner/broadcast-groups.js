import { styleText, sleep } from '../../utils/helpers.js';
import { OWNER_JID } from '../../config/constants.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['allgroups', 'broadcastgroups', 'bcgroups', 'tx'],
    async execute(ctx) {
        const isOwner = ctx.sender === OWNER_JID ||
            ctx.senderPhone === OWNER_JID.split('@')[0] ||
            ctx.sender.split('@')[0] === OWNER_JID.split('@')[0];

        if (!isOwner) {
            return await ctx.reply(styleText('ꕢ Este comando es solo para el dueño del bot.'));
        }

        const message = ctx.args.join(' ');
        if (!message) {
            return await ctx.reply(styleText('ꕢ Por favor escribe el mensaje a transmitir.'));
        }

        await ctx.reply(styleText('ꕢ Iniciando transmisión a todos los grupos...'));

        const groups = await ctx.bot.sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        let sent = 0;
        let failed = 0;
        const broadcastMsg = `ꕣ *COMUNICADO OFICIAL* ꕣ\n\n${message}\n\n> 📢 Transmisión Global para Grupos`;

        for (const groupId of groupIds) {
            try {
                await ctx.bot.sendMessage(groupId, { text: styleText(broadcastMsg) });
                sent++;
                await sleep(1500);
            } catch (error) {
                logger.error(`Error enviando a ${groupId}:`, error.message);
                failed++;
            }
        }

        await ctx.reply(styleText(
            `✅ *Transmisión Finalizada*\n\n` +
            `> 📤 Enviados: ${sent}\n` +
            `> ❌ Fallidos: ${failed}\n` +
            `> 👥 Total Grupos: ${groupIds.length}`
        ));
    }
};
