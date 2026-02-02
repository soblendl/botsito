import fs from 'fs';
import path from 'path';

/**
 * Limpia archivos de sesión antiguos para liberar espacio.
 * Específicamente purga 'pre-keys' de Baileys que se acumulan indefinidamente.
 */
export async function cleanSessionFiles(sessionDir = 'sessions') {
    if (!fs.existsSync(sessionDir)) {
        console.log(`[SessionCleaner] Directorio ${sessionDir} no existe, saltando limpieza.`);
        return;
    }

    try {
        console.log(`[SessionCleaner] Iniciando limpieza de sesiones...`);
        
        // Buscar carpeta real de la sesión (LocalAuth usa subcarpetas por UUID)
        const subDirs = fs.readdirSync(sessionDir);
        let cleanedTotal = 0;

        for (const subDir of subDirs) {
            const fullPath = path.join(sessionDir, subDir);
            
            // Si es un directorio, buscar dentro (estructura LocalAuth)
            if (fs.statSync(fullPath).isDirectory()) {
                 cleanedTotal += cleanDirectory(fullPath);
            } else {
                // Si la estructura es plana
                cleanedTotal += cleanDirectory(sessionDir);
                break; // Ya limpiamos el root, salir
            }
        }
        
        if (cleanedTotal > 0) {
            console.log(`[SessionCleaner] ✅ Eliminados ${cleanedTotal} archivos de sesión basura (pre-keys).`);
        } else {
            console.log(`[SessionCleaner] No se encontraron archivos para limpiar.`);
        }

    } catch (error) {
        console.error(`[SessionCleaner] Error durante limpieza: ${error.message}`);
    }
}

function cleanDirectory(dirPath) {
    let count = 0;
    const files = fs.readdirSync(dirPath);
    
    // Solo eliminamos pre-keys para evitar perder la sesión
    const preKeyRegex = /^pre-key-[0-9]+\.json$/;

    for (const file of files) {
        if (preKeyRegex.test(file)) {
            try {
                fs.unlinkSync(path.join(dirPath, file));
                count++;
            } catch (e) {
                // Ignorar error
            }
        }
    }
    return count;
}
