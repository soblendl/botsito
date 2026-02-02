import axios from 'axios';
import { formatNumber, getCooldown, formatTime, styleText } from '../lib/utils.js';

const imageCache = new Map();
const COOLDOWN_TIME = 10 * 60 * 1000;
async function fetchImageBuffer(url) {
    if (imageCache.has(url)) {
        return imageCache.get(url);
    }
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000, 
            maxRedirects: 3
        });
        const buffer = Buffer.from(response.data);
        if (imageCache.size >= 50) {
            const firstKey = imageCache.keys().next().value;
            imageCache.delete(firstKey);
        }
        imageCache.set(url, buffer);
        return buffer;
    } catch {
        return null;
    }
}

export default {
    commands: ['rollwaifu', 'rw'],

    async execute(ctx) {
        const gachaService = ctx.gachaService;
        if (!ctx.userData.gacha) ctx.userData.gacha = {};
        const lastRoll = ctx.userData.gacha.lastRoll || 0;
        const cooldown = getCooldown(lastRoll, COOLDOWN_TIME);
        if (cooldown > 0) {
            return await ctx.reply(styleText(
                `ꕤ Debes esperar *${formatTime(cooldown)}* para volver a hacer roll.\n\n` +
                `> _*❐ Cooldown: 10 minutos*_`
            ));
        }
        const character = gachaService.getRandom();
        if (!character) {
            return await ctx.reply(styleText('ꕤ No hay personajes disponibles.'));
        }
        await ctx.dbService.updateUser(ctx.sender, {
            'gacha.rolled': character.id,
            'gacha.lastRoll': Date.now()
        });
        const rarity = Math.floor(parseInt(character.value || 0) / 400);
        const stars = '⭐'.repeat(Math.min(rarity, 5)) || '⭐';
        const rarityText = rarity >= 5 ? 'Legendario' :
            rarity >= 4 ? 'Mítico' :
                rarity >= 3 ? 'Raro' :
                    rarity >= 2 ? 'Poco Común' : 'Común';

        const sellPrice = Math.floor(character.value * 0.8);
        let message = `ꕥ Nombre » *${character.name}*\n\n`;
        message += `➭ Fuente » *${character.source || 'Desconocido'}*\n`;
        message += `𖧧 Rareza » *${rarityText}*\n`;
        message += `苳 Valor » *${formatNumber(character.value)}*\n`;
        message += `₿ Precio » *${formatNumber(sellPrice)}*\n`;
        message += `♛ Dueño » *${character.owner ? '@' + character.owner.replace(/@.+/, '') : 'Nadie'}*\n\n`;
        message += `> _*❐ Usa #claim en 30 segundos o se perderá!*_`;
        if (character.img && character.img.length > 0) {
            try {
                const mentions = character.owner ? [character.owner] : [];
                const imageBuffer = await Promise.race([
                    fetchImageBuffer(character.img[0]),
                    new Promise(resolve => setTimeout(() => resolve(null), 3000)) 
                ]);
                if (imageBuffer) {
                    await ctx.bot.sendMessage(ctx.chatId, {
                        image: imageBuffer,
                        caption: styleText(message),
                        mentions: mentions
                    });
                } else {
                        await ctx.bot.sendMessage(ctx.chatId, {
                        image: { url: character.img[0] },
                        caption: styleText(message),
                        mentions: mentions
                    });
                }
            } catch (error) {
                console.error('[DEBUG] Error sending waifu image:', error);
                if (error.code === 'ENOSPC') {
                    return await ctx.reply(styleText(
                        `ꕤ Error temporal del servidor (sin espacio).\n\n` +
                        `Mostrando información sin imagen:\n\n${message}`
                    ), { mentions: character.owner ? [character.owner] : [] });
                }
                await ctx.reply(styleText(message), { mentions: character.owner ? [character.owner] : [] });
            }
        } else {
            await ctx.reply(styleText(message), { mentions: character.owner ? [character.owner] : [] });
        }
    }
};