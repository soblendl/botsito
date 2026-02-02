
import axios from 'axios'
import { styleText } from '../lib/utils.js'

const instagramSearchCommand = {
    name: 'instagramsearch',
    aliases: ['igsearch', 'insearch'],
    category: 'search',
    description: 'Busca videos en Instagram',
    usage: '#instagramsearch [texto]',
    adminOnly: false,
    groupOnly: false,
    botAdminRequired: false,

    async execute(sock, msg, args) {
        const chatId = msg.key.remoteJid

        if (args.length === 0) {
            return await sock.sendMessage(chatId, {
                text: styleText(`ꕤ *Uso incorrecto del comando*\n\n` +
                    `Ejemplo:\n` +
                    `> #instagramsearch naturaleza\n` +
                    `> #igsearch viajes`)
            })
        }

        const query = args.join(' ')

        await sock.sendMessage(chatId, {
            text: styleText(`_Esta función está en desarrollo_`)
        })
    }
}

export default instagramSearchCommand
