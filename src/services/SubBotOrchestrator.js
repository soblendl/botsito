import { Bot, LocalAuth } from '@imjxsx/wapi';
import Logger from '@imjxsx/logger';
import { nanoid } from 'nanoid';
import path from 'path';
export class SubBotOrchestrator {
    constructor(dbService) {
        this.dbService = dbService;
        this.subBots = new Map();
        this.maxConcurrent = 5;
        this.quotaLimit = 10000;
        this.heartbeatInterval = 30000;
        this.logger = new Logger({ level: 'INFO' });
        this.setupMonitoring();
    }
    setupMonitoring() {
        setInterval(() => {
            this.checkHealth();
        }, this.heartbeatInterval);
    }
    async createSubBot(ownerId, sessionData = null) {
        if (this.subBots.size >= this.maxConcurrent) {
            throw new Error(`Límite de sub-bots alcanzado (${this.maxConcurrent}). Detén uno antes de crear otro.`);
        }
        const sessionId = sessionData?.sessionId || nanoid();
        const uuid = nanoid();
        const subBotConfig = {
            id: sessionId,
            ownerId,
            uuid,
            status: 'initializing',
            createdAt: Date.now(),
            lastActive: Date.now(),
            quota: this.quotaLimit,
            usedQuota: 0,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };
        try {
            const auth = new LocalAuth(uuid, `sessions/subbots/${sessionId}`);
            const logger = new Logger({ level: 'INFO', prefix: `[SubBot ${sessionId}]` });
            const account = { jid: '', pn: '', name: '' };
            const bot = new Bot(uuid, auth, account, logger);
            bot.on('open', (accountInfo) => {
                subBotConfig.status = 'active';
                subBotConfig.lastActive = Date.now();
                subBotConfig.phoneNumber = accountInfo.pn;
                this.logger.info(`✅ Sub-bot ${sessionId} conectado (${accountInfo.pn})`);
                this.setupMessageHandler(bot, sessionId);
            });
            bot.on('close', async (reason) => {
                this.logger.warn(`⚠️ Sub-bot ${sessionId} desconectado: ${reason}`);
                subBotConfig.status = 'disconnected';
                await this.attemptReconnect(sessionId);
            });
            bot.on('error', (err) => {
                this.logger.error(`❌ Error en sub-bot ${sessionId}: ${err.message}`);
                subBotConfig.status = 'error';
            });
            this.subBots.set(sessionId, {
                ...subBotConfig,
                bot,
                logger
            });
            await bot.login('qr');
            return {
                sessionId,
                status: 'initializing',
                message: 'Sub-bot creado. Escanea el código QR para conectar.'
            };
        } catch (error) {
            this.logger.error(`Error creando sub-bot: ${error.message}`);
            throw error;
        }
    }
    setupMessageHandler(bot, sessionId) {
        bot.ws?.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                if (!m.message) continue;
                const chatId = m.key.remoteJid;
                const subBot = this.subBots.get(sessionId);
                if (!subBot) continue;
                const text = m.message.conversation ||
                    m.message.extendedTextMessage?.text || '';
                if (m.key.fromMe) {
                    const isCommand = text.startsWith('#') || text.startsWith('/') || text.startsWith('!');
                    if (!isCommand) continue;
                }
                if (!this.incrementQuota(sessionId)) {
                    continue;
                }
                subBot.lastActive = Date.now();
                if (global.messageHandler) {
                    try {
                        await global.messageHandler.handleMessage(bot, m, true); 
                    } catch (err) {
                        this.logger.error(`[SubBot ${sessionId}] Handler error: ${err.message}`);
                    }
                }
            }
        });
    }
    async attemptReconnect(sessionId) {
        const subBot = this.subBots.get(sessionId);
        if (!subBot) return;
        if (subBot.reconnectAttempts >= subBot.maxReconnectAttempts) {
            this.logger.error(`Sub-bot ${sessionId} alcanzó límite de reconexiones. Se requiere intervención manual.`);
            subBot.status = 'failed';
            return;
        }
        subBot.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, subBot.reconnectAttempts), 30000);
        this.logger.info(`Reintentando conexión para sub-bot ${sessionId} en ${delay}ms (intento ${subBot.reconnectAttempts})`);
        setTimeout(async () => {
            try {
                await subBot.bot.login('qr');
            } catch (error) {
                this.logger.error(`Error en reconexión de sub-bot ${sessionId}: ${error.message}`);
                await this.attemptReconnect(sessionId);
            }
        }, delay);
    }
    async stopSubBot(sessionId, ownerId) {
        const subBot = this.subBots.get(sessionId);
        if (!subBot) {
            throw new Error('Sub-bot no encontrado');
        }
        if (subBot.ownerId !== ownerId) {
            throw new Error('No tienes permiso para detener este sub-bot');
        }
        try {
            if (subBot.bot) {
                await subBot.bot.sock?.logout();
                subBot.bot.sock?.end();
            }
            this.subBots.delete(sessionId);
            this.logger.info(`ִ𖤐 Sub-bot ${sessionId} detenido exitosamente`);
            return {
                success: true,
                message: 'Sub-bot detenido correctamente'
            };
        } catch (error) {
            this.logger.error(`Error deteniendo sub-bot ${sessionId}: ${error.message}`);
            throw error;
        }
    }
    getSubBot(sessionId) {
        return this.subBots.get(sessionId);
    }
    listSubBots(ownerId = null) {
        const bots = Array.from(this.subBots.values());
        if (ownerId) {
            return bots.filter(bot => bot.ownerId === ownerId);
        }
        return bots.map(bot => ({
            sessionId: bot.id,
            status: bot.status,
            phoneNumber: bot.phoneNumber,
            createdAt: bot.createdAt,
            lastActive: bot.lastActive,
            quota: bot.quota,
            usedQuota: bot.usedQuota
        }));
    }
    async checkHealth() {
        const now = Date.now();
        const timeout = 60000;
        for (const [sessionId, subBot] of this.subBots.entries()) {
            if (now - subBot.lastActive > timeout && subBot.status === 'active') {
                this.logger.warn(`Sub-bot ${sessionId} no responde. Marcando como inactivo.`);
                subBot.status = 'inactive';
                await this.attemptReconnect(sessionId);
            }
        }
    }
    incrementQuota(sessionId, amount = 1) {
        const subBot = this.subBots.get(sessionId);
        if (!subBot) return false;
        if (subBot.usedQuota + amount > subBot.quota) {
            this.logger.warn(`Sub-bot ${sessionId} excedió su cuota (${subBot.usedQuota}/${subBot.quota})`);
            return false;
        }
        subBot.usedQuota += amount;
        subBot.lastActive = Date.now();
        return true;
    }
    resetQuota(sessionId) {
        const subBot = this.subBots.get(sessionId);
        if (subBot) {
            subBot.usedQuota = 0;
            return true;
        }
        return false;
    }
    getStats() {
        const bots = Array.from(this.subBots.values());
        return {
            total: bots.length,
            active: bots.filter(b => b.status === 'active').length,
            inactive: bots.filter(b => b.status === 'inactive').length,
            error: bots.filter(b => b.status === 'error').length,
            totalQuota: bots.reduce((sum, b) => sum + b.quota, 0),
            usedQuota: bots.reduce((sum, b) => sum + b.usedQuota, 0)
        };
    }
}
