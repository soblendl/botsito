import { styleText } from '../../utils/helpers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default {
    commands: ['resetdb', 'cleardb'],
    tags: ['owner'],
    help: ['resetdb (BORRA TODOS LOS DATOS)'],
    async execute(ctx) {
        const { sender, dbService, reply } = ctx;
        if (!sender.includes('573115434166')) return await reply(styleText('⛔ Solo el owner puede usar este comando.'));
        try {
            await reply(styleText('⚠️ *ADVERTENCIA*: Iniciando borrado completo de base de datos... ⚠️'));
            const dbPath = path.join(__dirname, '..', 'database');
            const timestamp = Date.now();
            if (fs.existsSync(path.join(dbPath, 'users.json'))) fs.copyFileSync(path.join(dbPath, 'users.json'), path.join(dbPath, `users_backup_${timestamp}.json`));
            if (fs.existsSync(path.join(dbPath, 'groups.json'))) fs.copyFileSync(path.join(dbPath, 'groups.json'), path.join(dbPath, `groups_backup_${timestamp}.json`));
            dbService.users.data = [];
            fs.writeFileSync(path.join(dbPath, 'users.json'), '[]');
            fs.writeFileSync(path.join(dbPath, 'groups.json'), '[]');
            await dbService.load();
            global.db = dbService.db;
            await reply(styleText(`✅ *Base de datos reseteada*\n\n🗑️ Archivos limpiados.\n📦 Backup automático creado: _${timestamp}_`));
        } catch (error) {
            console.error('ResetDB Error:', error);
            await reply(styleText('❌ Error al resetear la base de datos.'));
        }
    }
};
