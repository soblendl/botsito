import fs from 'fs';
import path from 'path';
import { styleText } from '../lib/utils.js';
import { OWNER_JID } from '../lib/constants.js';

export default {
    commands: ['diskcheck', 'chkdisk', 'espacio'],
    
    async execute(ctx) {
        // Solo owner
        const isOwner = ctx.sender === OWNER_JID || ctx.sender.includes(OWNER_JID.split('@')[0]);
        if (!isOwner) return;

        await ctx.reply(styleText('🔍 Analizando uso de disco... (Esto puede tardar unos segundos)'));

        try {
            const rootDir = process.cwd();
            const usage = await getDiskUsage(rootDir);
            
            // Ordenar por tamaño
            usage.sort((a, b) => b.size - a.size);

            let text = `💾 *Análisis de Espacio en Disco*\n\n`;
            text += `Total analizado en: \`${rootDir}\`\n\n`;
            
            // Top 15 carpetas/archivos más pesados
            for (let i = 0; i < Math.min(15, usage.length); i++) {
                text += `• *${formatBytes(usage[i].size)}* - \`${usage[i].path}\`\n`;
            }

            await ctx.reply(styleText(text));

        } catch (error) {
            console.error('Error checking disk:', error);
            await ctx.reply(styleText(`❌ Error al analizar disco: ${error.message}`));
        }
    }
};

async function getDiskUsage(dirPath) {
    let results = [];
    
    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            const relativePath = path.relative(process.cwd(), fullPath);
            
            // Ignorar node_modules para no saturar, a menos que se quiera ver
            if (relativePath.startsWith('node_modules')) continue;

            if (file.isDirectory()) {
                const size = await getDirectorySize(fullPath);
                results.push({ path: relativePath + '/', size });
            } else {
                const stats = await fs.promises.stat(fullPath);
                results.push({ path: relativePath, size: stats.size });
            }
        }
    } catch (e) {
        console.error('Error reading dir:', e);
    }
    
    return results;
}

async function getDirectorySize(dirPath) {
    let size = 0;
    try {
        const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                size += await getDirectorySize(fullPath);
            } else {
                const stats = await fs.promises.stat(fullPath);
                size += stats.size;
            }
        }
    } catch (e) {
        // Ignore permission errors etc
    }
    return size;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
