import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UploadService } from '../lib/UploadService.js';
import { downloadMediaMessage } from 'baileys';
import { styleText, isOwner } from '../lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        const dbDir = path.join(__dirname, '..', 'database');
        const charactersPath = path.join(dbDir, 'characters.json');
        const newCharactersPath = path.join(dbDir, 'new_characters.json');

        const normalizeName = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedInputName = normalizeName(name);

        // Validar duplicados en characters.json
        if (fs.existsSync(charactersPath)) {
            try {
                const existing = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));
                if (Array.isArray(existing)) {
                    const duplicate = existing.find(c => normalizeName(c.name) === normalizedInputName);
                    if (duplicate) {
                        await ctx.reply(styleText(
                            `⚠️ *Personaje Duplicado*\n\n` +
                            `El personaje "${name}" ya existe en la base de datos.\n` +
                            `ID existente: ${duplicate.id}\n\n` +
                            `> No se agregó el personaje.`
                        ));
                        return true;
                    }
                }
            } catch (e) {
                console.error('Error leyendo characters.json:', e);
            }
        }

        // Validar duplicados en new_characters.json
        if (fs.existsSync(newCharactersPath)) {
            try {
                const existingNew = JSON.parse(fs.readFileSync(newCharactersPath, 'utf8'));
                if (Array.isArray(existingNew)) {
                    const duplicate = existingNew.find(c => normalizeName(c.name) === normalizedInputName);
                    if (duplicate) {
                        await ctx.reply(styleText(
                            `⚠️ *Personaje Duplicado*\n\n` +
                            `El personaje "${name}" ya existe en nuevos personajes.\n` +
                            `ID existente: ${duplicate.id}\n\n` +
                            `> No se agregó el personaje.`
                        ));
                        return true;
                    }
                }
            } catch (e) {
                console.error('Error leyendo new_characters.json:', e);
            }
        }

        // Descargar imagen
        let imageBuffer = null;
        let msg = ctx.msg;

        try {
            const message = msg.message;

            if (message.imageMessage) {
                imageBuffer = await downloadMediaMessage(msg, 'buffer');
            } 
            else if (message.extendedTextMessage?.contextInfo?.quotedMessage) {
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
            }
            else if (message.viewOnceMessageV2?.message?.imageMessage) {
                imageBuffer = await downloadMediaMessage(msg, 'buffer');
            }
        } catch (e) {
            console.error('Error descargando imagen:', e);
            await ctx.reply(styleText(`❌ Error descargando imagen: ${e.message}`));
            return true;
        }

        if (!imageBuffer) {
            await ctx.reply(styleText('ꕤ Falta la imagen. Por favor adjunta una imagen o responde a una imagen con el formulario.'));
            return true; 
        }

        try {
            await ctx.reply(styleText('⏳ Subiendo imagen a CatBox...'));

            // Subir a CatBox con manejo de errores mejorado
            let imageUrl;
            try {
                imageUrl = await UploadService.uploadToCatbox(imageBuffer);
                
                if (!imageUrl || !imageUrl.startsWith('http')) {
                    throw new Error('URL de CatBox inválida');
                }
            } catch (uploadError) {
                console.error('Error subiendo a CatBox:', uploadError);
                await ctx.reply(styleText(
                    `❌ *Error al subir imagen*\n\n` +
                    `No se pudo subir la imagen a CatBox.\n` +
                    `Error: ${uploadError.message}\n\n` +
                    `> Intenta nuevamente o verifica tu conexión.`
                ));
                return true;
            }

            // Determinar nuevo ID
            let lastId = 0;
            
            if (fs.existsSync(newCharactersPath)) {
                try {
                    const existingNew = JSON.parse(fs.readFileSync(newCharactersPath, 'utf8'));
                    if (Array.isArray(existingNew) && existingNew.length > 0) {
                        const ids = existingNew.map(c => parseInt(c.id)).filter(n => !isNaN(n));
                        if (ids.length > 0) lastId = Math.max(lastId, ...ids);
                    }
                } catch (e) {
                    console.error('Error leyendo IDs existentes:', e);
                }
            }

            const newId = (lastId + 1).toString();

            const newCharacter = {
                id: newId,
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

            // Guardar en new_characters.json
            let newCharsList = [];
            if (fs.existsSync(newCharactersPath)) {
                try {
                    newCharsList = JSON.parse(fs.readFileSync(newCharactersPath, 'utf8'));
                } catch(e) {
                    console.error('Error leyendo new_characters.json:', e);
                }
            }
            if (!Array.isArray(newCharsList)) newCharsList = [];
            
            newCharsList.push(newCharacter);
            
            // Asegurar que el directorio existe
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            fs.writeFileSync(newCharactersPath, JSON.stringify(newCharsList, null, 3));

            await ctx.reply(styleText(
                `✅ *Personaje Agregado Exitosamente*\n\n` +
                `✿ ID: ${newId}\n` +
                `✿ Nombre: ${name}\n` +
                `✿ Género: ${gender}\n` +
                `✿ Valor: ${value}\n` +
                `✿ Estado: ${status}\n` +
                `✿ Fuente: ${source}\n` +
                `✿ Imagen: ${imageUrl}\n\n` +
                `> Guardado en database/new_characters.json`
            ));

        } catch (error) {
            console.error('Error en AddWaifu:', error);
            await ctx.reply(styleText(
                `❌ *Error Inesperado*\n\n` +
                `${error.message}\n\n` +
                `> Por favor intenta nuevamente.`
            ));
        }

        return true;
    },

    async execute(ctx) {
        // Manejado por 'before'
    }
};