import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { downloadMediaMessage } from 'baileys';
import { styleText } from '../../utils/helpers.js';

export default {
    commands: ['sticker', 's'],
    async execute(ctx) {
        try {
            const { msg, bot, chatId, args } = ctx;
            const quotedContent = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quoted = quotedContent ? { message: quotedContent } : null;
            const isImage = msg.message?.imageMessage || quoted?.message?.imageMessage;
            const isVideo = msg.message?.videoMessage || quoted?.message?.videoMessage;
            if (!isImage && !isVideo) {
                return await ctx.reply(styleText('ꕢ Debes enviar una imagen o video, o responder a uno.'));
            }
            const messageToDownload = quoted || msg;
            const [buffer, pushName, description] = await Promise.all([
                downloadMediaMessage(
                    messageToDownload,
                    'buffer',
                    {},
                    { logger: console, reuploadRequest: bot.sock.updateMediaMessage }
                ),
                Promise.resolve(msg.pushName || 'Usuario'),
                Promise.resolve(args?.length > 0 ? args.join(' ') : null)
            ]);

            const packName = `${pushName} • ༘⋆✿ Shoko Nishimiya\n     ⤷ ゛Soblend | soblend.vercel.appˎˊ˗`;
            const authorName = description
                ? `> ⊹Description ࣪ ˖  »\n${description}`
                : '';
            const sticker = new Sticker(buffer, {
                pack: packName,
                author: authorName,
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 30,
                background: 'transparent'
            });
            const stickerBuffer = await sticker.toBuffer();
            await bot.sock.sendMessage(chatId, { sticker: stickerBuffer }, { quoted: msg });
        } catch (error) {
            console.error('Error creando sticker:', error);
            await ctx.reply(styleText(`ꕢ Error al crear el sticker: ${error.message}`));
        }
    }
};