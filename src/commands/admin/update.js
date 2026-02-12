import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { styleText } from '../../utils/helpers.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default {
    commands: ['update', 'reload'],
    tags: ['owner'],
    help: ['update (recarga todos los plugins)'],
    async execute(ctx) {
        const { reply, sender } = ctx;
        if (!sender.includes('573115434166')) return await reply(styleText('⛔ Solo el owner puede usar este comando.'));
        try {
            await reply(styleText('ꕣ Iniciando recarga de sistema... 🔄'));
            global.commandMap.clear();
            global.beforeHandlers = [];
            const pluginFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
            let successCount = 0;
            let failCount = 0;
            for (const file of pluginFiles) {
                try {
                    const filePath = pathToFileURL(path.join(__dirname, file)).href + '?update=' + Date.now();
                    const plugin = await import(filePath);
                    const pluginExport = plugin.default;
                    if (pluginExport && pluginExport.commands) {
                        if (pluginExport.before && typeof pluginExport.before === 'function') global.beforeHandlers.push({ plugin: file, handler: pluginExport.before });
                        for (const cmd of pluginExport.commands) global.commandMap.set(cmd, { execute: pluginExport.execute, plugin: file });
                        successCount++;
                    }
                } catch (err) {
                    console.error(`Error recargando ${file}: `, err);
                    failCount++;
                }
            }
            await reply(styleText(`✅ * Sistema Actualizado *\n\n📦 Plugins recargados: ${successCount} \n❌ Fallos: ${failCount} \n⚙️ Comandos activos: ${global.commandMap.size} `));
        } catch (error) {
            console.error('Update Error:', error);
            await reply(styleText('❌ Error crítico al actualizar el sistema.'));
        }
    }
};
