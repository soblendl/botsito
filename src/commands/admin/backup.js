import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { styleText } from '../../utils/helpers.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default {
    commands: ['backup', 'dbbackup'],
    tags: ['owner'],
    help: ['backup (envía copia de DB)'],
    async execute(ctx) {
        const { reply, sender, dbService } = ctx;
        if (!sender.includes('573115434166')) return await reply(styleText('⛔ Solo el owner puede usar este comando.'));
        try {
            await reply(styleText('ꕣ Generando backup de base de datos... 📦'));
            await dbService.save();
            const dbPath = path.join(__dirname, '..', 'data');
            const files = ['users.json', 'groups.json', 'gacha.json', 'tokens.json'];
            let sentCount = 0;
            for (const file of files) {
                const filePath = path.join(dbPath, file);
                if (fs.existsSync(filePath)) {
                    await ctx.bot.sendMessage(ctx.chatId, { document: fs.readFileSync(filePath), mimetype: 'application/json', fileName: `BACKUP_${Date.now()}_${file}`, caption: styleText(`ꕣ *Backup:* ${file}`) }, { quoted: ctx.msg });
                    sentCount++;
                }
            }
            await reply(styleText(sentCount === 0 ? '⚠️ No se encontraron archivos de base de datos para enviar.' : `✅ Backup completado (${sentCount} archivos).`));
        } catch (error) {
            console.error('Backup Error:', error);
            await reply(styleText('❌ Error al generar el backup.'));
        }
    }
};
