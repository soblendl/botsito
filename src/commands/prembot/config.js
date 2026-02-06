import { styleText } from '../../utils/helpers.js';
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from 'baileys';
import { CatboxService } from '../../services/media/CatboxService.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['setnamesubbot', 'setimagesubbot', 'configbot', 'miconfig'],
    async execute(ctx) {
        const tokenService = ctx.tokenService;
        const command = ctx.command;
        const userId = ctx.senderPhone ? `${ctx.senderPhone}@s.whatsapp.net` : ctx.sender;
        const prembot = tokenService?.getPrembot(userId);

        if (!prembot) {
            return await ctx.reply(styleText(
                `⚠️ *Error*\n\n` +
                `> Este comando solo está disponible para Prembots.\n` +
                `> Usa *#prembot buy* para obtener uno.`
            ));
        }

        if (command === 'setnamesubbot') {
            const name = ctx.args.join(' ').trim();
            if (!name) {
                return await ctx.reply(styleText(
                    `ꕣ *Establecer Nombre del Bot*\n\n` +
                    `*Uso:* #setnamesubbot <nombre>\n\n` +
                    `*Ejemplo:*\n` +
                    `> #setnamesubbot MiBot Premium\n\n` +
                    `> _El nombre aparecerá en el menú /help_`
                ));
            }
            if (name.length > 50) {
                return await ctx.reply(styleText(`❌ El nombre es muy largo (máx. 50 caracteres)`));
            }
            const result = tokenService.setPrembotName(userId, name);
            if (result.success) {
                return await ctx.reply(styleText(
                    `✅ *Nombre Establecido*\n\n` +
                    `> Tu bot ahora se llamará: *${name}*\n\n` +
                    `> _Usa #help para verificar el cambio_`
                ));
            } else {
                return await ctx.reply(styleText(`❌ ${result.error}`));
            }
        }

        if (command === 'setimagesubbot') {
            const msg = ctx.msg;
            try {
                const quotedContent = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const quoted = quotedContent ? { message: quotedContent } : null;
                const isImage = msg.message?.imageMessage || quoted?.message?.imageMessage;

                if (!isImage) {
                    return await ctx.reply(styleText(
                        `ꕣ *Establecer Imagen del Menú*\n\n` +
                        `*Uso:*\n` +
                        `> Enviar imagen con #setimagesubbot\n` +
                        `> O citar una imagen con #setimagesubbot\n\n` +
                        `> _La imagen aparecerá en el menú /help_`
                    ));
                }

                await ctx.reply(styleText('⏳ Descargando y subiendo imagen...'));
                const messageToDownload = quoted || msg;
                const buffer = await downloadMediaMessage(
                    messageToDownload,
                    'buffer',
                    {},
                    {
                        logger: console,
                        reuploadRequest: ctx.bot.sock.updateMediaMessage
                    }
                );

                const url = await CatboxService.upload(buffer);
                const result = tokenService.setPrembotImage(userId, url);

                if (result.success) {
                    return await ctx.reply(styleText(
                        `✅ *Imagen del Menú Establecida*\n\n` +
                        `> La imagen se ha guardado correctamente.\n\n` +
                        `> URL: ${url}\n` +
                        `> _Usa #help para verificar el cambio_`
                    ));
                } else {
                    return await ctx.reply(styleText(`❌ ${result.error}`));
                }
            } catch (error) {
                logger.error('[Prembot Config] Error:', error);
                return await ctx.reply(styleText(`❌ Error al procesar la imagen: ${error.message}`));
            }
        }

        if (command === 'configbot' || command === 'miconfig') {
            const config = tokenService.getPrembotConfig(userId);
            const nameDisplay = config?.customName || '(Nombre por defecto)';
            const imageDisplay = config?.customImage ? '✅ Configurada' : '❌ No configurada';

            return await ctx.reply(styleText(
                `ꕣ *Configuración de tu Prembot*\n\n` +
                `*Nombre:* ${nameDisplay}\n` +
                `*Imagen del menú:* ${imageDisplay}\n\n` +
                `*Comandos disponibles:*\n` +
                `> #setnamesubbot <nombre>\n` +
                `> #setimagesubbot (con imagen)\n\n` +
                `> _Los cambios se reflejan en #help_`
            ));
        }
    }
};
