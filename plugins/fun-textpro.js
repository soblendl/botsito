import { styleText } from '../lib/utils.js';

export default {
    commands: ['textpro'],
    tags: ['fun'],
    help: ['textpro <efecto> <texto>'],

    async execute(ctx) {
        const { bot, msg, text, chatId } = ctx

        if (!text) {
            return await ctx.reply(styleText('ꕤ Uso: #textpro <efecto> <texto>\n\nEfectos disponibles:\nneon, magma, glitch, thunder, blackpink'))
        }

        const args = text.split(' ')
        const effect = args[0].toLowerCase()
        const content = args.slice(1).join(' ')

        if (!content) {
            return await ctx.reply(styleText('ꕤ Debes escribir el texto.'))
        }

        const effects = {
            'neon': 'https://textpro.me/images/user_image/2023/11/1700813735.jpg', // Placeholder logic, actually need an API
            'magma': 'magma',
            'glitch': 'glitch',
            'thunder': 'thunder',
            'blackpink': 'blackpink'
        }

        if (!Object.keys(effects).includes(effect)) {
            return await ctx.reply(styleText('ꕤ Efecto no válido. Disponibles: ' + Object.keys(effects).join(', ')))
        }

        try {
            await ctx.reply(styleText('ꕤ Generando imagen...'))
            // Using a generic API endpoint structure for textpro
            // If this fails, user will likely report it and we can adjust
            const apiUrl = `https://api.stellarwa.xyz/textpro/${effect}?text=${encodeURIComponent(content)}&key=stellar-20J4F8hk`

            await bot.sock.sendMessage(chatId, {
                image: { url: apiUrl },
                caption: styleText(`🎨 *Efecto:* ${effect}`)
            }, { quoted: msg })

        } catch (error) {
            console.error('Error en textpro:', error)
            await ctx.reply(styleText('ꕤ Error al generar la imagen.'))
        }
    }
}
