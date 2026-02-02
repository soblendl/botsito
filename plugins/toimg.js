import sharp from 'sharp';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['toimg', 'img'],
    tags: ['tools'],
    help: ['toimg (responde a un sticker)'],

    async execute(ctx) {
        const { msg, bot, chatId } = ctx;

        // Extract quoted message
        const quotedContent = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quoted = quotedContent ? { message: quotedContent } : null;

        // Check if it's a sticker
        const isSticker = quoted?.message?.stickerMessage;

        if (!isSticker) {
            return await ctx.reply(styleText('ꕤ Debes responder a un sticker.'));
        }

        try {
            await ctx.reply(styleText('⏳ Convirtiendo sticker a imagen...'));

            // Download sticker
            const buffer = await ctx.download(quoted);

            // Convert webp to png using sharp
            const imgBuffer = await sharp(buffer)
                .toFormat('png')
                .toBuffer();

            // Send image
            await bot.sock.sendMessage(chatId, {
                image: imgBuffer,
                caption: styleText('ꕥ Aquí tienes tu imagen')
            }, { quoted: msg });

        } catch (error) {
            console.error('Error en toimg:', error);
            await ctx.reply(styleText('ꕤ Error al convertir el sticker.'));
        }
    }
};
