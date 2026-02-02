import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { createWriteStream, createReadStream } from 'fs';
import { randomUUID } from 'crypto';
import memoryManager, { MEMORY_LIMITS } from './MemoryManager.js';

const TEMP_DIR = path.join(os.tmpdir(), 'kaoruko-downloads');
const REPLIT_CACHE_DIR = path.join(process.cwd(), '.cache');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
} else {
    purgeAllTempFiles();
}

function cleanupTempFiles() {
    try {
        // Limpiar descargas temporales
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            const now = Date.now();
            const maxAge = 2 * 60 * 1000; // Reducido a 2 min
            for (const file of files) {
                const filePath = path.join(TEMP_DIR, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    try { fs.unlinkSync(filePath); } catch (_) {}
                }
            }
        }

        // Limpieza agresiva de .cache si existe y el espacio es bajo
        if (fs.existsSync(REPLIT_CACHE_DIR)) {
            const status = memoryManager.getMemoryStatus();
            if (status.isWarning || status.isCritical) {
                console.warn('[SafeDownloader] Espacio bajo detectado - Limpiando .cache');
                const cacheFiles = fs.readdirSync(REPLIT_CACHE_DIR);
                for (const file of cacheFiles) {
                    // Evitar borrar archivos de sistema de replit si es posible
                    if (file === 'replit' || file === 'toolchain.json') continue;
                    try {
                        const p = path.join(REPLIT_CACHE_DIR, file);
                        if (fs.statSync(p).isDirectory()) {
                            fs.rmSync(p, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(p);
                        }
                    } catch (_) {}
                }
            }
        }
    } catch (e) {
        console.error('[SafeDownloader] Error limpiando archivos:', e.message);
    }
}

function purgeAllTempFiles() {
    try {
        console.warn('[SafeDownloader] \u26a0\ufe0f PURGANDO TODOS LOS ARCHIVOS TEMPORALES');
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(TEMP_DIR, file));
                } catch (_) {}
            }
        }
    } catch (e) {
        console.error('[SafeDownloader] Error en purga:', e.message);
    }
}

setInterval(cleanupTempFiles, 1 * 60 * 1000); // Cada minuto

async function getRemoteFileSize(url, timeout = 10000) {
    try {
        const response = await axios.head(url, {
            timeout,
            maxRedirects: 5,
            validateStatus: (status) => status < 400
        });
        const contentLength = response.headers['content-length'];
        return contentLength ? parseInt(contentLength, 10) : null;
    } catch (error) {
        try {
            const response = await axios.get(url, {
                timeout: 5000,
                headers: { 'Range': 'bytes=0-0' },
                maxRedirects: 5,
                validateStatus: (status) => status < 400
            });
            const contentRange = response.headers['content-range'];
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)/);
                if (match) return parseInt(match[1], 10);
            }
        } catch (e) {
            // No se pudo obtener el tamaño
        }
        return null;
    }
}

/**
 * Descarga un archivo de forma segura usando streams
 * @param {string} url - URL del archivo a descargar
 * @param {Object} options - Opciones de descarga
 * @returns {Promise<{success: boolean, filePath?: string, buffer?: Buffer, error?: string}>}
 */
async function safeDownload(url, options = {}) {
    const {
        maxSize = MEMORY_LIMITS.MAX_DOWNLOAD_SIZE,
        timeout = 60000,
        returnBuffer = false,
        headers = {}
    } = options;
    const downloadId = randomUUID();
    let tempFilePath = null;
    try {
        // Verificar si podemos procesar la descarga
        const canProcess = memoryManager.canProcessDownload(maxSize);
        if (!canProcess.allowed) {
            return {
                success: false,
                error: canProcess.message,
                reason: canProcess.reason
            };
        }

        // Intentar obtener el tamaño del archivo primero
        const remoteSize = await getRemoteFileSize(url);
        
        if (remoteSize !== null) {
            if (remoteSize > maxSize) {
                return {
                    success: false,
                    error: `\ua564 Archivo muy grande (${memoryManager.formatBytes(remoteSize)}). M\u00e1ximo: ${memoryManager.formatBytes(maxSize)}`,
                    reason: 'FILE_TOO_LARGE',
                    actualSize: remoteSize
                };
            }
            
            // Verificar nuevamente con el tamaño real
            const canProcessReal = memoryManager.canProcessDownload(remoteSize);
            if (!canProcessReal.allowed) {
                return {
                    success: false,
                    error: canProcessReal.message,
                    reason: canProcessReal.reason
                };
            }
        }

        // Registrar el buffer
        memoryManager.registerBuffer(downloadId, remoteSize || maxSize, { url });

        // Crear archivo temporal
        tempFilePath = path.join(TEMP_DIR, `${downloadId}.tmp`);

        // Descargar usando stream a archivo
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'stream',
            timeout,
            headers,
            maxContentLength: maxSize,
            maxBodyLength: maxSize,
            onDownloadProgress: (progressEvent) => {
                // Verificar que no exceda el l\u00edmite durante la descarga
                if (progressEvent.loaded > maxSize) {
                    response.data.destroy(new Error('FILE_TOO_LARGE'));
                }
            }
        });

        // Verificar content-length del response
        const contentLength = response.headers['content-length'];
        if (contentLength && parseInt(contentLength) > maxSize) {
            response.data.destroy();
            return {
                success: false,
                error: `\ua564 Archivo muy grande. M\u00e1ximo: ${memoryManager.formatBytes(maxSize)}`,
                reason: 'FILE_TOO_LARGE'
            };
        }

        // Stream a archivo temporal con l\u00edmite de tama\u00f1o
        let downloadedBytes = 0;
        const writeStream = createWriteStream(tempFilePath);
        
        await new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                if (downloadedBytes > maxSize) {
                    response.data.destroy();
                    writeStream.destroy();
                    reject(new Error('FILE_TOO_LARGE'));
                }
            });
            
            response.data.on('error', reject);
            writeStream.on('error', reject);
            writeStream.on('finish', resolve);
            
            response.data.pipe(writeStream);
        });

        memoryManager.stats.totalDownloads++;

        // Si se necesita buffer, leer el archivo
        if (returnBuffer) {
            const buffer = fs.readFileSync(tempFilePath);
            
            // Limpiar archivo temporal despu\u00e9s de leer
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                // Ignorar error de limpieza
            }
            
            return {
                success: true,
                buffer,
                size: buffer.length,
                contentType: response.headers['content-type']
            };
        }

        return {
            success: true,
            filePath: tempFilePath,
            size: downloadedBytes,
            contentType: response.headers['content-type']
        };

    } catch (error) {
        memoryManager.stats.failedDownloads++;
        
        // Limpiar archivo temporal si existe
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                // Ignorar
            }
        }

        let errorMessage = '\ua564 Error al descargar el archivo.';
        
        if (error.message === 'FILE_TOO_LARGE') {
            errorMessage = `\ua564 El archivo es muy grande. M\u00e1ximo: ${memoryManager.formatBytes(maxSize)}`;
        } else if (error.code === 'ENOSPC') {
            errorMessage = '\ua564 No hay espacio suficiente. Intenta m\u00e1s tarde.';
            memoryManager.forceCleanup();
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            errorMessage = '\ua564 Tiempo de espera agotado. Intenta de nuevo.';
        } else if (error.response?.status === 404) {
            errorMessage = '\ua564 Archivo no encontrado.';
        }

        return {
            success: false,
            error: errorMessage,
            reason: error.code || error.message
        };

    } finally {
        // Siempre liberar el buffer registrado
        memoryManager.releaseBuffer(downloadId);
    }
}

/**
 * Descarga un archivo peque\u00f1o directamente a buffer (para archivos < 5MB)
 * Usa streaming pero retorna buffer para compatibilidad
 */
async function downloadSmallFile(url, options = {}) {
    const maxSize = Math.min(options.maxSize || 5 * 1024 * 1024, MEMORY_LIMITS.MAX_BUFFER_SIZE);
    
    return safeDownload(url, {
        ...options,
        maxSize,
        returnBuffer: true
    });
}

/**
 * Wrapper para enviar media de forma segura
 * Descarga a archivo temporal y env\u00eda por URL local o stream
 */
async function safeMediaDownload(url, options = {}) {
    const result = await safeDownload(url, {
        ...options,
        returnBuffer: false
    });

    if (!result.success) {
        return result;
    }

    // Retornar ruta del archivo para que el bot lo env\u00ede
    return {
        success: true,
        filePath: result.filePath,
        size: result.size,
        contentType: result.contentType,
        // Funci\u00f3n para limpiar despu\u00e9s de usar
        cleanup: () => {
            if (result.filePath && fs.existsSync(result.filePath)) {
                try {
                    fs.unlinkSync(result.filePath);
                } catch (e) {
                    // Ignorar
                }
            }
        }
    };
}

/**
 * Verifica si una URL es segura para descargar (no excede l\u00edmites)
 */
async function checkDownloadSafe(url) {
    const size = await getRemoteFileSize(url);
    const canProcess = memoryManager.canProcessDownload(size || MEMORY_LIMITS.MAX_DOWNLOAD_SIZE);
    
    return {
        safe: canProcess.allowed,
        size,
        formattedSize: size ? memoryManager.formatBytes(size) : 'Desconocido',
        reason: canProcess.reason,
        message: canProcess.message
    };
}

export {
    safeDownload,
    downloadSmallFile,
    safeMediaDownload,
    checkDownloadSafe,
    getRemoteFileSize,
    cleanupTempFiles,
    purgeAllTempFiles,
    TEMP_DIR
};

export default {
    safeDownload,
    downloadSmallFile,
    safeMediaDownload,
    checkDownloadSafe,
    getRemoteFileSize,
    cleanupTempFiles,
    purgeAllTempFiles
};
