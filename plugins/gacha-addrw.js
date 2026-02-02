import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { styleText } from '../lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OWNER_NUMBER = '573115434166';

export default {
    commands: ['addrw', 'addwaifu'],

    async execute(ctx) {
        const { sender, args } = ctx;

        // Extract phone number from sender (handles formats like 573115434166:0@s.whatsapp.net)
        const senderNumber = sender.split('@')[0].split(':')[0];

        // Only owner can add characters
        if (senderNumber !== OWNER_NUMBER) {
            return await ctx.reply(styleText('ꕤ Solo el owner puede usar este comando.'));
        }

        // Parse arguments: /addrw name | gender | value | source | img | vid
        const fullArgs = args.join(' ');
        const parts = fullArgs.split('|').map(p => p.trim());

        if (parts.length < 5) {
            return await ctx.reply(styleText(
                `ꕤ *Uso incorrecto*\n\n` +
                `Formato: #addrw name | gender | value | source | img | vid\n\n` +
                `*Ejemplo:*\n` +
                `#addrw Naruto | Hombre | 1800 | Naruto Shippuden | https://img1.jpg,https://img2.jpg | https://vid1.mp4`
            ));
        }

        const [name, gender, value, source, imgUrls, vidUrls] = parts;

        // Validate required fields
        if (!name || !gender || !value || !source || !imgUrls) {
            return await ctx.reply(styleText('ꕤ Faltan campos obligatorios (name, gender, value, source, img).'));
        }

        // Parse images and videos as arrays
        const img = imgUrls.split(',').map(url => url.trim()).filter(Boolean);
        const vid = vidUrls ? vidUrls.split(',').map(url => url.trim()).filter(Boolean) : [];

        // Load gacha.json
        const gachaPath = path.join(__dirname, '..', 'database', 'gacha.json');

        let gachaData;
        try {
            const fileContent = fs.readFileSync(gachaPath, 'utf8');
            gachaData = JSON.parse(fileContent);
        } catch (error) {
            return await ctx.reply(styleText('ꕤ Error al leer gacha.json'));
        }

        // Generate new ID (max ID + 1)
        const maxId = Math.max(...gachaData.characters.map(c => parseInt(c.id) || 0), 0);
        const newId = String(maxId + 1);

        // Create new character
        const newCharacter = {
            id: newId,
            name: name,
            gender: gender,
            value: value,
            source: source,
            img: img,
            vid: vid,
            user: null,
            status: 'Libre',
            votes: 0
        };

        // Add to characters array
        gachaData.characters.push(newCharacter);

        // Save gacha.json
        try {
            fs.writeFileSync(gachaPath, JSON.stringify(gachaData, null, 2), 'utf8');
        } catch (error) {
            return await ctx.reply(styleText('ꕤ Error al guardar gacha.json'));
        }

        // Update GachaService in memory
        if (global.gachaService) {
            global.gachaService.characters.push(newCharacter);
            global.gachaService.indexCharacters();
        }

        await ctx.reply(styleText(
            `ꕥ *Personaje agregado exitosamente*\n\n` +
            `> ID: ${newId}\n` +
            `> Nombre: ${name}\n` +
            `> Género: ${gender}\n` +
            `> Valor: ¥${value}\n` +
            `> Fuente: ${source}\n` +
            `> Imágenes: ${img.length}\n` +
            `> Videos: ${vid.length}`
        ));
    }
};
