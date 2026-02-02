import fetch from 'node-fetch';
import FormData from 'form-data';
import { downloadMediaMessage } from 'baileys';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['upload', 'subir'],

    async execute(ctx) {
        const { msg } = ctx;

        const quotedContent = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quoted = quotedContent ? { message: quotedContent } : null;

        const isImage = msg.message?.imageMessage;
        const isQuotedImage = quoted?.message?.imageMessage;
        const isVideo = msg.message?.videoMessage;
        const isQuotedVideo = quoted?.message?.videoMessage;
        const isDocument = msg.message?.documentMessage;
        const isQuotedDocument = quoted?.message?.documentMessage;
        const isAudio = msg.message?.audioMessage;
        const isQuotedAudio = quoted?.message?.audioMessage;
        const isSticker = msg.message?.stickerMessage;
        const isQuotedSticker = quoted?.message?.stickerMessage;

        const hasMedia = isImage || isQuotedImage || isVideo || isQuotedVideo ||
            isDocument || isQuotedDocument || isAudio || isQuotedAudio ||
            isSticker || isQuotedSticker;

        if (!hasMedia) {
            return await ctx.reply(styleText(
                `ꕤ *UPLOAD - Subir Archivos*\n\n` +
                `> Responde a un archivo con #upload\n` +
                `> O envía un archivo con el comando.\n\n` +
                `> Soporta: Imágenes`
            ));
        }

        await ctx.reply(styleText('ꕤ Subiendo archivo...'));

        try {
            const buffer = await downloadMediaMessage(
                quoted ? quoted : msg,
                'buffer',
                {}
            );

            if (!buffer) {
                return await ctx.reply(styleText('ꕤ Error al descargar el archivo.'));
            }

            let filename = 'file';
            let mimetype = 'application/octet-stream';

            if (isImage || isQuotedImage) {
                const imageMsg = isImage || isQuotedImage;
                mimetype = imageMsg.mimetype || 'image/jpeg';
                filename = `image.${mimetype.split('/')[1] || 'jpg'}`;
            } else if (isVideo || isQuotedVideo) {
                const videoMsg = isVideo || isQuotedVideo;
                mimetype = videoMsg.mimetype || 'video/mp4';
                filename = `video.${mimetype.split('/')[1] || 'mp4'}`;
            } else if (isDocument || isQuotedDocument) {
                const docMsg = isDocument || isQuotedDocument;
                mimetype = docMsg.mimetype || 'application/octet-stream';
                filename = docMsg.fileName || `document.${mimetype.split('/')[1] || 'bin'}`;
            } else if (isAudio || isQuotedAudio) {
                const audioMsg = isAudio || isQuotedAudio;
                mimetype = audioMsg.mimetype || 'audio/mpeg';
                filename = `audio.${audioMsg.ptt ? 'ogg' : 'mp3'}`;
            } else if (isSticker || isQuotedSticker) {
                const stickerMsg = isSticker || isQuotedSticker;
                mimetype = stickerMsg.mimetype || 'image/webp';
                filename = 'sticker.webp';
            }

            const formData = new FormData();
            formData.append('file', buffer, {
                filename: filename,
                contentType: mimetype
            });

            const response = await fetch('https://soblend-api.drexelxx.workers.dev/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            // Extraer el link - puede estar en diferentes campos
            const fileUrl = result.url || result.link || result.file || result.data?.url || result.data?.link;

            if (!fileUrl) {
                throw new Error('No se recibió un link válido del servidor');
            }

            await ctx.reply(styleText(
                `ꕥ *Archivo subido exitosamente*\n\n` +
                `> Archivo » ${filename}\n` +
                `> Link » ${fileUrl}\n\n` +
                `> El archivo estará disponible en línea`
            ));

        } catch (error) {
            console.error('Error uploading file:', error);
            await ctx.reply(styleText(`ꕤ Error al subir: ${error.message}`));
        }
    }
};