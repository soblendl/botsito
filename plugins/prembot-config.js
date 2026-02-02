import { styleText } from '../lib/utils.js';
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from 'baileys';
import { CatboxService } from '../lib/CatboxService.js';

export default {
    commands: ['setnamesubbot', 'setimagesubbot', 'configbot', 'miconfig'],

    async execute(ctx) {
        const tokenService = ctx.tokenService;
        const command = ctx.command;

        // Detectar si es un prembot (verificar si el usuario actual tiene prembot)
        const userId = ctx.senderPhone ? `${ctx.senderPhone}@s.whatsapp.net` : ctx.sender;
        const prembot = tokenService?.getPrembot(userId);

        if (!prembot) {
            return await ctx.reply(styleText(
                `⚠️ *Error*\n\n` +
                `> Este comando solo está disponible para Prembots.\n` +
                `> Usa *#prembot buy* para obtener uno.`
            ));
        }

        // Comando: /setnamesubbot <nombre>
        if (command === 'setnamesubbot') {
            const name = ctx.args.join(' ').trim();

            if (!name) {
                return await ctx.reply(styleText(
                    `ꕥ *Establecer Nombre del Bot*\n\n` +
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

        // Comando: /setimagesubbot (con imagen citada o adjunta)
        if (command === 'setimagesubbot') {
            const msg = ctx.msg;
            try {
                const quotedContent = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const quoted = quotedContent ? { message: quotedContent } : null;
                const isImage = msg.message?.imageMessage || quoted?.message?.imageMessage;

                if (!isImage) {
                    return await ctx.reply(styleText(
                        `ꕥ *Establecer Imagen del Menú*\n\n` +
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

                // Subir a Catbox
                const url = await CatboxService.upload(buffer);

                // Guardar URL en configuración
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
                console.error('[Prembot Config] Error:', error);
                return await ctx.reply(styleText(`❌ Error al procesar la imagen: ${error.message}`));
            }
        }

        // Comando: /configbot o /miconfig - Ver configuración actual
        if (command === 'configbot' || command === 'miconfig') {
            const config = tokenService.getPrembotConfig(userId);

            const nameDisplay = config?.customName || '(Nombre por defecto)';
            const imageDisplay = config?.customImage ? '✅ Configurada' : '❌ No configurada';

            return await ctx.reply(styleText(
                `ꕥ *Configuración de tu Prembot*\n\n` +
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
