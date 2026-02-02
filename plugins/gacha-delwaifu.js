import { styleText } from '../lib/utils.js';

export default {
    commands: ['delwaifu', 'delchar'],

    async execute(sock, m, { chatId, sender, args }) {
        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ Debes especificar el nombre del personaje.\nUso: #delwaifu <personaje>')
            });
        }

        const charName = args.join(' ');
        const userData = global.db.users[sender];
        const characters = userData.gacha?.characters || [];

        const charIndex = characters.findIndex(c =>
            c.name.toLowerCase() === charName.toLowerCase()
        );

        if (charIndex === -1) {
            return await sock.sendMessage(chatId, {
                text: styleText('ꕤ No tienes ese personaje en tu harem.')
            });
        }

        const character = characters[charIndex];
        characters.splice(charIndex, 1);

        await sock.sendMessage(chatId, {
            text: styleText(`ꕥ Has eliminado a ${character.name} de tu harem.`)
        });
    }
};
