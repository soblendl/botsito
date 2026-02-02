import os from 'os';
import { EventEmitter } from 'events';

export const MEMORY_LIMITS = {
    MAX_DOWNLOAD_SIZE: 50 * 1024 * 1024,   // Reducido a 50MB para evitar saturación
    MAX_BUFFER_SIZE: 30 * 1024 * 1024,     // Reducido a 30MB
    CRITICAL_FREE_MEMORY: 150 * 1024 * 1024, // Aumentado a 150MB para ser más agresivo
    WARNING_FREE_MEMORY: 250 * 1024 * 1024,  // Aumentado a 250MB
    MAX_HEAP_USAGE_PERCENT: 75,              // Reducido a 75% para prevenir el "Heap Lleno"
    CLEANUP_INTERVAL: 5000,                  // Limpieza más frecuente (cada 5s)
    MONITOR_INTERVAL: 3000,                  // Monitoreo más frecuente (cada 3s)
    BUFFER_TTL: 10000                        // Los buffers expiran mucho más rápido (10s)
};
class MemoryManager extends EventEmitter {
    constructor() {
        super();
        this.activeBuffers = new Map();
        this.downloadQueue = [];
        this.isProcessing = false;
        this.stats = {
            totalDownloads: 0,
            failedDownloads: 0,
            memoryCleanups: 0,
            rejectedBySize: 0,
            rejectedByMemory: 0
        };
        this.startMonitoring();
        this.startCleanup();
    }
    getMemoryStatus() {
        const freeMemory = os.freemem();
        const totalMemory = os.totalmem();
        const usedMemory = totalMemory - freeMemory;
        const heapUsed = process.memoryUsage().heapUsed;
        const heapTotal = process.memoryUsage().heapTotal;
        const rss = process.memoryUsage().rss;
        return {
            freeMemory,
            totalMemory,
            usedMemory,
            usedPercent: Math.round((usedMemory / totalMemory) * 100),
            heapUsed,
            heapTotal,
            heapPercent: Math.round((heapUsed / heapTotal) * 100),
            rss,
            activeBuffers: this.activeBuffers.size,
            activeBuffersSize: this.getActiveBuffersSize(),
            isCritical: freeMemory < MEMORY_LIMITS.CRITICAL_FREE_MEMORY,
            isWarning: freeMemory < MEMORY_LIMITS.WARNING_FREE_MEMORY
        };
    }
    getActiveBuffersSize() {
        let total = 0;
        for (const [, data] of this.activeBuffers) {
            total += data.size || 0;
        }
        return total;
    }
    canProcessDownload(estimatedSize = 0) {
        const status = this.getMemoryStatus();
        
        // Debug
        // console.log(`[Memory Check] Free: ${this.formatBytes(status.freeMemory)}, Heap: ${status.heapPercent}%, Active: ${this.formatBytes(this.getActiveBuffersSize())}`);

        if (status.isCritical) {
            console.warn(`[MemoryManager] Rechazado por memoria crítica. Libre: ${this.formatBytes(status.freeMemory)} < ${this.formatBytes(MEMORY_LIMITS.CRITICAL_FREE_MEMORY)}`);
            this.stats.rejectedByMemory++;
            return {
                allowed: false,
                reason: 'CRITICAL_MEMORY',
                message: 'ꕤ Memoria crítica en servidor (muy poca RAM libre).'
            };
        }

        if (estimatedSize > MEMORY_LIMITS.MAX_DOWNLOAD_SIZE) {
            console.warn(`[MemoryManager] Rechazado por tamaño. Est: ${this.formatBytes(estimatedSize)} > Max: ${this.formatBytes(MEMORY_LIMITS.MAX_DOWNLOAD_SIZE)}`);
            this.stats.rejectedBySize++;
            return {
                allowed: false,
                reason: 'FILE_TOO_LARGE',
                message: `ꕤ Archivo muy grande (máx ${this.formatBytes(MEMORY_LIMITS.MAX_DOWNLOAD_SIZE)})`
            };
        }

        if (status.heapPercent > MEMORY_LIMITS.MAX_HEAP_USAGE_PERCENT) {
            this.forceCleanup();
            const newStatus = this.getMemoryStatus();
            if (newStatus.heapPercent > MEMORY_LIMITS.MAX_HEAP_USAGE_PERCENT) {
                console.warn(`[MemoryManager] Rechazado por Heap. Uso: ${newStatus.heapPercent}% > ${MEMORY_LIMITS.MAX_HEAP_USAGE_PERCENT}%`);
                this.stats.rejectedByMemory++;
                return {
                    allowed: false,
                    reason: 'HIGH_HEAP_USAGE',
                    message: 'ꕤ Servidor sobrecargado (Heap Lleno).'
                };
            }
        }

        const activeSize = this.getActiveBuffersSize();
        // Red de seguridad: Si hay pocas descargas activas (< 5), permitir siempre (evita bloqueos por tamaños mal calculados)
        if (this.activeBuffers.size < 5) {
            return {
                allowed: true,
                availableMemory: status.freeMemory
            };
        }

        if (activeSize + estimatedSize > MEMORY_LIMITS.MAX_BUFFER_SIZE * 3) {
            console.warn(`[MemoryManager] Rechazado por buffer lleno. Activo: ${this.formatBytes(activeSize)}`);
            return {
                allowed: false,
                reason: 'TOO_MANY_BUFFERS',
                message: 'ꕤ Demasiadas descargas simultáneas.'
            };
        }

        return {
            allowed: true,
            availableMemory: status.freeMemory
        };
    }
    registerBuffer(id, size, metadata = {}) {
        this.activeBuffers.set(id, {
            size,
            createdAt: Date.now(),
            ...metadata
        });
    }
    releaseBuffer(id) {
        this.activeBuffers.delete(id);
    }
    forceCleanup() {
        const now = Date.now();
        for (const [id, data] of this.activeBuffers) {
            if (now - data.createdAt > MEMORY_LIMITS.BUFFER_TTL) {
                this.activeBuffers.delete(id);
            }
        }
        if (global.gc) {
            global.gc();
        }
        this.stats.memoryCleanups++;
        this.emit('cleanup');
    }
    startMonitoring() {
        this.monitorInterval = setInterval(() => {
            const status = this.getMemoryStatus();
            
            if (status.isCritical) {
                console.warn('⚠️ [MemoryManager] MEMORIA CRÍTICA - Forzando limpieza');
                this.forceCleanup();
                this.emit('critical', status);
            } else if (status.isWarning) {
                console.log('⚡ [MemoryManager] Advertencia de memoria baja');
                this.emit('warning', status);
            }
        }, MEMORY_LIMITS.MONITOR_INTERVAL);
    }
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let cleaned = 0;
            for (const [id, data] of this.activeBuffers) {
                if (now - data.createdAt > MEMORY_LIMITS.BUFFER_TTL) {
                    this.activeBuffers.delete(id);
                    cleaned++;
                }
            }
            if (cleaned > 0) {
                console.log(`\ud83e\uddf9 [MemoryManager] Limpiados ${cleaned} buffers expirados`);
            }
            if (global.gc && this.getMemoryStatus().heapPercent > 60) {
                global.gc();
            }
        }, MEMORY_LIMITS.CLEANUP_INTERVAL);
    }
    stop() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        this.activeBuffers.clear();
    }
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    getStats() {
        return {
            ...this.stats,
            ...this.getMemoryStatus()
        };
    }
}

const memoryManager = new MemoryManager();
export default memoryManager;
export { MemoryManager };
