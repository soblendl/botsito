import { getMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['giveallharem', 'giveall'],

    async execute(sock, m, { chatId, sender, body }) {
        const mentions = getMentions(body);
        if (mentions.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ Debes mencionar al usuario.\nUso: #giveall @usuario')
            });
        }

        const target = mentions[0];
        const userData = global.db.users[sender];
        const characters = userData.gacha?.characters || [];

        if (characters.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ No tienes personajes en tu harem.')
            });
        }

        if (!global.db.users[target]) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ Ese usuario no está registrado.')
            });
        }

        if (!global.db.users[target].gacha.characters) {
            global.db.users[target].gacha.characters = [];
        }

        const count = characters.length;
        global.db.users[target].gacha.characters.push(...characters);
        userData.gacha.characters = [];

        await sock.sendMessage(chatId, {
            text: styleText(`ꕥ *Regalo Masivo*\n\n` +
                `Has regalado ${count} personajes a @${target.split('@')[0]}`),
            mentions: [target]
        });
    }
};
