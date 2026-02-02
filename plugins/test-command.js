
import { proto } from 'baileys';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['test'],
    tags: ['tools'],
    help: ['test'],

    async execute(ctx) {
        const { bot, msg } = ctx;
        const m = msg;
        m.sender = ctx.sender;

        const fkontak = {
            key: {
                participants: '0@s.whatsapp.net',
                remoteJid: 'status@broadcast',
                fromMe: false,
                id: 'Halo'
            },
            message: {
                contactMessage: {
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            },
            participant: '0@s.whatsapp.net'
        };

        await bot.sock.sendMessage(ctx.chatId, {
            text: styleText("The best time to plant a tree was 20 years ago. The second best time is now.")
        }, { quoted: fkontak });
    }
};
