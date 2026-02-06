import { fileURLToPath } from 'url';
import path from 'path';
import { UploadService } from '../../services/media/UploadService.js'; 
import { downloadMediaMessage } from 'baileys';
import { styleText, isOwner } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function normalizeName(name) {
    return name.trim().toLowerCase();
}

export default {
    commands: [], 
    tags: ['owner'],
    help: ['addwaifu'],
    before: async (ctx) => {
        const text = ctx.body || '';

        
        if (!isOwner(ctx.sender)) return false;

        
        const regex = /❀ Nombre »\s*(.+)\s*[\n\r]+⚥ Genero »\s*(.+)\s*[\n\r]+✰ Valor »\s*(.+)\s*[\n\r]+♡ Estado »\s*(.+)\s*[\n\r]+❖ Fuente »\s*(.+)/i;
        const match = text.match(regex);

        
        if (!match) return false;

        const name = match[1].trim();
        const gender = match[2].trim();
        const value = parseInt(match[3].trim().replace(/\D/g, '')) || 0;
        const status = match[4].trim();
        const source = match[5].trim();

        
        
        if (ctx.gachaService) {
            const existing = ctx.gachaService.getByName(name);
            if (existing) {
                await ctx.reply(styleText(
                    `⚠️ *Personaje Duplicado*\n\n` +
                    `El personaje "${name}" ya existe.\n` +
                    `ID existente: ${existing.id}\n\n` +
                    `> No se agregó el personaje.`
                ));
                return true; 
            }
        } else {
            logger.warn('GachaService not found in context for addwaifu');
        }

        let imageBuffer = null;
        let msg = ctx.msg;

        try {
            
            const message = msg.message;
            if (message.imageMessage) {
                imageBuffer = await downloadMediaMessage(msg, 'buffer');
            } else if (message.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = message.extendedTextMessage.contextInfo.quotedMessage;
                const fakeMsg = {
                    key: {
                        remoteJid: ctx.chatId,
                        id: message.extendedTextMessage.contextInfo.stanzaId,
                        participant: message.extendedTextMessage.contextInfo.participant
                    },
                    message: quoted
                };
                if (quoted.imageMessage || quoted.viewOnceMessageV2?.message?.imageMessage) {
                    imageBuffer = await downloadMediaMessage(fakeMsg, 'buffer');
                }
            } else if (message.viewOnceMessageV2?.message?.imageMessage) {
                imageBuffer = await downloadMediaMessage(msg, 'buffer');
            }
        } catch (e) {
            logger.error('Error downloading image in addwaifu:', e);
            await ctx.reply(styleText(`❌ Error descargando imagen: ${e.message}`));
            return true;
        }

        if (!imageBuffer) {
            await ctx.reply(styleText('ꕢ Falta la imagen. Por favor adjunta una imagen o responde a una imagen con el formulario.'));
            return true;
        }

        try {
            await ctx.reply(styleText('⏳ Subiendo imagen a Soblend R2...'));

            let imageUrl;
            try {
                
                imageUrl = await UploadService.uploadToSoblendR2(imageBuffer);
                if (!imageUrl || !imageUrl.startsWith('http')) {
                    throw new Error('URL invalid from Soblend R2');
                }
            } catch (uploadError) {
                logger.error('Error uploading to Soblend R2:', uploadError);
                await ctx.reply(styleText(
                    `❌ *Error al subir imagen*\n\n` +
                    `No se pudo subir la imagen a Soblend R2.\n` +
                    `Error: ${uploadError.message}`
                ));
                return true;
            }

            const newCharacterData = {
                name: name,
                gender: gender,
                value: value.toString(),
                source: source,
                img: [imageUrl],
                vid: [],
                user: null,
                status: status,
                votes: 0
            };

            
            const addedChar = await ctx.gachaService.addCharacter(newCharacterData);

            if (addedChar) {
                await ctx.reply(styleText(
                    `✅ *Personaje Agregado Exitosamente*\n\n` +
                    `✿ ID: ${addedChar.id}\n` +
                    `✿ Nombre: ${addedChar.name}\n` +
                    `✿ Género: ${addedChar.gender}\n` +
                    `✿ Valor: ${addedChar.value}\n` +
                    `✿ Estado: ${addedChar.status}\n` +
                    `✿ Fuente: ${addedChar.source}\n` +
                    `✿ Imagen: ${imageUrl}\n\n` +
                    `> Agregado a la base de datos global.`
                ));
            } else {
                throw new Error('Failed to add character to GachaService');
            }

        } catch (error) {
            logger.error('Error in addwaifu execution:', error);
            await ctx.reply(styleText(
                `❌ *Error Inesperado*\n\n` +
                `${error.message}`
            ));
        }

        return true;
    },
    async execute(ctx) {
        
    }
};
