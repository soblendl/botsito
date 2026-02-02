import Queue from 'bull';
import Redis from 'ioredis';
import { globalLogger as logger } from '../utils/logger.js';

export class MessageQueue {
    constructor() {
        this.queues = {};
        this.redis = null;
        this.enabled = false;
        this.initQueue();
    }

    initQueue() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            const redisConfig = {
                redis: redisUrl,
                settings: {
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false
                }
            };

            this.queues.commands = new Queue('commands', redisConfig);
            this.queues.messages = new Queue('messages', redisConfig);
            this.queues.jobs = new Queue('scheduled-jobs', redisConfig);

            this.enabled = true;
            logger.info('ִ𖤐 Sistema de colas activado para procesamiento distribuido');
            this.setupProcessors();
        } catch (error) {
            logger.warn(`ִ𖤐 Sistema de colas no disponible, usando procesamiento directo: ${error.message}`);
            this.enabled = false;
        }
    }

    setupProcessors() {
        this.queues.commands.process(async (job) => {
            const { ctx, plugin, command } = job.data;
            try {
                await plugin.execute(ctx);
                return { success: true, command };
            } catch (error) {
                logger.error(`ִ𖤐 Error procesando comando ${command}:`, error);
                throw error;
            }
        });

        this.queues.messages.process(async (job) => {
            const { message, handlers } = job.data;
            for (const handler of handlers) {
                try {
                    await handler(message);
                } catch (error) {
                    logger.error('ִ𖤐 Error en handler de mensaje:', error);
                }
            }
            return { processed: true };
        });

        this.queues.jobs.process(async (job) => {
            const { type, data } = job.data;
            logger.info(`ִ𖤐 Ejecutando trabajo programado: ${type}`);
            return { completed: true, type };
        });
    }

    async addCommand(ctx, plugin, command, priority = 0) {
        if (!this.enabled) {
            await plugin.execute(ctx);
            return null;
        }
        try {
            const job = await this.queues.commands.add(
                { ctx, plugin, command },
                {
                    priority,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    }
                }
            );
            return job.id;
        } catch (error) {
            logger.error('ִ𖤐 Error añadiendo comando a la cola:', error);
            await plugin.execute(ctx);
            return null;
        }
    }

    async addMessage(message, handlers, priority = 0) {
        if (!this.enabled) {
            for (const handler of handlers) {
                await handler(message);
            }
            return null;
        }
        try {
            const job = await this.queues.messages.add(
                { message, handlers },
                { priority }
            );
            return job.id;
        } catch (error) {
            logger.error('ִ𖤐 Error añadiendo mensaje a la cola:', error);
            for (const handler of handlers) {
                await handler(message);
            }
            return null;
        }
    }

    async scheduleJob(type, data, delay) {
        if (!this.enabled) {
            logger.warn('ִ𖤐 Cola no disponible para programar trabajos');
            return null;
        }
        try {
            const job = await this.queues.jobs.add(
                { type, data },
                { delay }
            );
            logger.info(`ִ𖤐 Trabajo programado: ${type} en ${delay}ms`);
            return job.id;
        } catch (error) {
            logger.error('ִ𖤐 Error programando trabajo:', error);
            return null;
        }
    }

    async getQueueStats() {
        if (!this.enabled) {
            return { enabled: false };
        }
        const stats = {};
        for (const [name, queue] of Object.entries(this.queues)) {
            try {
                const [waiting, active, completed, failed] = await Promise.all([
                    queue.getWaitingCount(),
                    queue.getActiveCount(),
                    queue.getCompletedCount(),
                    queue.getFailedCount()
                ]);
                stats[name] = { waiting, active, completed, failed };
            } catch (error) {
                stats[name] = { error: error.message };
            }
        }
        return { enabled: true, queues: stats };
    }

    async cleanOldJobs(hoursAgo = 24) {
        if (!this.enabled) return;
        for (const queue of Object.values(this.queues)) {
            try {
                await queue.clean(hoursAgo * 3600 * 1000, 'completed');
                await queue.clean(hoursAgo * 3600 * 1000, 'failed');
            } catch (error) {
                logger.error('ִ𖤐 Error limpiando trabajos antiguos:', error);
            }
        }
    }
}
