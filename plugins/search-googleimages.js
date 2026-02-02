
import axios from 'axios'
import * as cheerio from 'cheerio'
import { styleText } from '../lib/utils.js'

class GoogleImageScraper {
    constructor() {
        this.baseUrl = 'https://www.google.com/search'
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        this.timeout = 15000
    }
    async search(query) {
        try {
            const params = new URLSearchParams({
                q: query,
                tbm: 'isch',
                safe: 'off',
                hl: 'en'
            })
            const searchUrl = `${this.baseUrl}?${params.toString()}`
            const response = await axios.get(searchUrl, {
                headers: this.headers,
                timeout: this.timeout
            })
            const html = response.data
            const $ = cheerio.load(html)
            const images = []
            $('img[data-src]').each((i, el) => {
                const src = $(el).attr('data-src')
                if (src && src.startsWith('http') && !src.includes('google.com/xjs')) {
                    images.push({
                        url: src,
                        title: $(el).attr('alt') || ''
                    })
                }
            })

            return {
                success: true,
                images: images.slice(0, 5)
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            }
        }
    }
}

const googleimageCommand = {
    name: 'googleimages',
    aliases: ['gimages', 'gimg'],
    category: 'search',
    description: 'Busca imágenes en Google',
    usage: '#googleimages [búsqueda]',
    adminOnly: false,
    groupOnly: false,
    botAdminRequired: false,

    async execute(sock, msg, args) {
        const chatId = msg.key.remoteJid

        try {
            if (args.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: styleText('《✧》 *Uso incorrecto del comando*\n\n' +
                        '📌 Ejemplos:\n' +
                        '✿ #googleimages gato\n' +
                        '✿ #gimages paisaje montaña\n' +
                        '✿ #gimg anime')
                })
            }

            const query = args.join(' ')

            const scraper = new GoogleImageScraper()
            const result = await scraper.search(query)

            if (!result.success || !result.images || result.images.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: styleText(`《✧》 😔 No se encontraron imágenes para: *${query}*\n\n💡 Intenta con otros términos`)
                })
            }

            const randomImage = result.images[Math.floor(Math.random() * result.images.length)]

            await sock.sendMessage(chatId, {
                image: { url: randomImage.url },
                caption: styleText(`《✧》 🖼️ *Resultado de búsqueda*\n\n📝 Búsqueda: *${query}*`)
            }, { quoted: msg })

        } catch (error) {
            console.error('Error en googleimages:', error)
            await sock.sendMessage(chatId, {
                text: styleText(`《✧》 ❌ Error al buscar imágenes\n\n💡 Intenta de nuevo más tarde`)
            })
        }
    }
}

export default googleimageCommand
