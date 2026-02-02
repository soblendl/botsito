import { styleText } from '../lib/utils.js';
import { ERRORS } from '../lib/constants.js';
import { globalLogger as logger } from '../src/utils/logger.js';

let wapiModule = null;
const getWapi = async () => {
    if (!wapiModule) {
        wapiModule = await import('@imjxsx/wapi');
    }
    return wapiModule;
};

export function setupCommandWorker(bot, services) {
    const queue = services.queueManager.getQueue('commandQueue');

    queue.process(async (job) => {
        const { commandName, ctxData } = job.data;
        const commandData = global.commandMap.get(commandName);

        if (!commandData) {
            logger.error(`Command worker: Command '${commandName}' not found.`);
            return;
        }

        const ctx = {
            ...ctxData,
            ...services,
            bot: {
                sendMessage: async (jid, content, options) => {
                    return await bot.ws.sendMessage(jid, content, options);
                },
                sock: bot.ws,
                groupMetadata: async (jid) => {
                    return await bot.ws.groupMetadata(jid);
                },
                groupParticipantsUpdate: async (jid, participants, action) => {
                    return await bot.ws.groupParticipantsUpdate(jid, participants, action);
                }
            },
            reply: async (text, options = {}) => {
                return await bot.ws.sendMessage(ctxData.chatId, { text, ...options }, { quoted: ctxData.msg });
            },
            replyWithAudio: async (url, options = {}) => {
                return await bot.ws.sendMessage(ctxData.chatId, { audio: { url }, mimetype: 'audio/mpeg', ...options }, { quoted: ctxData.msg });
            },
            replyWithVideo: async (url, options = {}) => {
                return await bot.ws.sendMessage(ctxData.chatId, { video: { url }, ...options }, { quoted: ctxData.msg });
            },
            replyWithImage: async (url, options = {}) => {
                return await bot.ws.sendMessage(ctxData.chatId, { image: { url }, ...options }, { quoted: ctxData.msg });
            },
            download: async (message) => {
                const wapi = await getWapi();
                const { downloadContentFromMessage } = wapi;
                const msg = message || ctxData.msg;
                const type = Object.keys(msg.message)[0];
                const stream = await downloadContentFromMessage(msg.message[type], type.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer;
            }
        };

        try {
            await commandData.execute(ctx);
            if (!ctx.userData.stats) ctx.userData.stats = {};
            ctx.userData.stats.commands = (ctx.userData.stats.commands || 0) + 1;
            services.dbService.markDirty();
        } catch (error) {
            console.error(`Error executing command '${commandName}' in worker:`, error);
            try {
                await ctx.reply(styleText(ERRORS.GENERIC_ERROR));
            } catch (e) {
                console.error(`Failed to send error reply for command '${commandName}':`, e);
            }
        }
    });

    console.log('👷‍♂️ Command worker is ready to process jobs.');
}