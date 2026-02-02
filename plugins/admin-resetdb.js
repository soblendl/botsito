import { styleText } from '../lib/utils.js';
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

        // Verificar Owner
        const ownerNumber = '573115434166';
        if (!sender.includes(ownerNumber)) {
            return await reply(styleText('⛔ Solo el owner puede usar este comando.'));
        }

        try {
            await reply(styleText('⚠️ *ADVERTENCIA*: Iniciando borrado completo de base de datos... ⚠️'));

            // 1. Crear backup automático antes de borrar
            const dbPath = path.join(__dirname, '..', 'database');
            const timestamp = Date.now();

            // Backup Users
            if (fs.existsSync(path.join(dbPath, 'users.json'))) {
                fs.copyFileSync(
                    path.join(dbPath, 'users.json'),
                    path.join(dbPath, `users_backup_${timestamp}.json`)
                );
            }

            // Backup Groups
            if (fs.existsSync(path.join(dbPath, 'groups.json'))) {
                fs.copyFileSync(
                    path.join(dbPath, 'groups.json'),
                    path.join(dbPath, `groups_backup_${timestamp}.json`)
                );
            }

            // 2. Limpiar colecciones en memoria
            // LocalDB no tiene clear() nativo que expongamos, pero podemos resetear los objetos internos
            // si tenemos acceso, o borrar archivo y recargar.
            // Dado que dbService mantiene referencias, lo más seguro es:

            // Opción B: Vaciar los datos uno por uno (lento pero seguro en memoria)
            // Opción A (Mejor): Sobrescribir archivos con JSON vacío y recargar

            // Vamos por Opción C: Manipular arrays internos de LocalDB si fuera posible, 
            // pero como usamos una lib externa, lo mejor es vaciar a lo bruto.

            // Hack para LocalDB: delete on existing keys
            // Como no tenemos un método 'clear', simulamos borrado de archivos y reinicio de estructuras.

            // Resetear estructuras en memoria del servicio
            dbService.users.data = []; // Hack: Acceso directo a propiedad interna de LocalDB si existe
            // O mejor, re-inicializar

            fs.writeFileSync(path.join(dbPath, 'users.json'), '[]');
            fs.writeFileSync(path.join(dbPath, 'groups.json'), '[]');

            // Forzar recarga de DBService
            await dbService.load();

            // Actualizar referencias globales
            global.db = dbService.db;

            await reply(styleText(
                `✅ *Base de datos reseteada*\n\n` +
                `🗑️ Archivos limpiados.\n` +
                `📦 Backup automático creado: _${timestamp}_`
            ));

        } catch (error) {
            console.error('ResetDB Error:', error);
            await reply(styleText('❌ Error al resetear la base de datos.'));
        }
    }
};
