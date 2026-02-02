import fs from 'fs';
import path from 'path';
import { globalLogger as logger } from '../utils/logger.js';

export async function cleanSessionFiles(sessionDir = 'sessions') {
    if (!fs.existsSync(sessionDir)) {
        logger.warn(`[SessionCleaner] Directorio ${sessionDir} no existe, saltando limpieza.`);
        return;
    }

    try {
        logger.info(`[SessionCleaner] Iniciando limpieza de sesiones...`);
        const subDirs = fs.readdirSync(sessionDir);
        let cleanedTotal = 0;

        for (const subDir of subDirs) {
            const fullPath = path.join(sessionDir, subDir);
            if (fs.statSync(fullPath).isDirectory()) {
                cleanedTotal += cleanDirectory(fullPath);
            } else {
                cleanedTotal += cleanDirectory(sessionDir);
                break;
            }
        }

        if (cleanedTotal > 0) {
            logger.info(`[SessionCleaner] ✅ Eliminados ${cleanedTotal} archivos de sesión basura (pre-keys).`);
        } else {
            logger.info(`[SessionCleaner] No se encontraron archivos para limpiar.`);
        }
    } catch (error) {
        logger.error(`[SessionCleaner] Error durante limpieza: ${error.message}`);
    }
}

function cleanDirectory(dirPath) {
    let count = 0;
    const files = fs.readdirSync(dirPath);
    const preKeyRegex = /^pre-key-[0-9]+\.json$/;

    for (const file of files) {
        if (preKeyRegex.test(file)) {
            try {
                fs.unlinkSync(path.join(dirPath, file));
                count++;
            } catch (e) {
                // Ignore unlink errors
            }
        }
    }
    return count;
}
