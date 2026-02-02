import { Bot, LocalAuth } from '@imjxsx/wapi';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const BLOCKED_COMMANDS = [
    'eval', 'exec', 'shell', 'terminal', 'bash', 'cmd',
    'setowner', 'addowner', 'delowner', 'removeowner',
    'restart', 'shutdown', 'update', 'reboot',
    'banuser', 'unbanuser', 'globalban',
    'broadcast', 'bcall', 'bcgc',
    'setprefix', 'setbotname',
    'addprem', 'delprem',
    'clearsession', 'deletesession'
];
const LIMITS = {
    MAX_GROUPS: 50,
    MAX_CHATS: 200,
    COMMANDS_PER_MINUTE: 30,
    MESSAGES_PER_MINUTE: 60,
    SPAM_TIMEOUT: 5 * 60 * 1000,
    RECONNECT_ATTEMPTS: 5,
    BACKUP_INTERVAL: 5 * 60 * 1000
};
class PrembotManager {
    constructor(tokenService) {
        this.tokenService = tokenService;
        this.prembots = new Map();
        this.pendingConnections = new Map();
        this.codes = new Map();
        this.spamTracker = new Map();
        this.groupCounts = new Map();
    }
    generateCode() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    isCommandBlocked(command) {
        return BLOCKED_COMMANDS.includes(command.toLowerCase());
    }
    createPairingCode(userId, tokenId) {
        const code = this.generateCode();
        this.codes.set(code, {
            userId,
            tokenId,
            createdAt: Date.now()
        });
        setTimeout(() => this.codes.delete(code), 5 * 60 * 1000);
        return code;
    }
    async startPrembot(tokenId, chatId, mainSock, phoneNumber) {
        const validation = this.tokenService.validateToken(tokenId);
        if (!validation.valid) {
            return { success: false, message: `ꕤ ${validation.error}` };
        }
        let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return { success: false, message: `ꕤ Número de teléfono inválido: ${cleanPhone} (${cleanPhone.length} dígitos)` };
        }
        console.log('[Prembot] Phone number received:', phoneNumber);
        console.log('[Prembot] Clean phone number:', cleanPhone);
        const userId = `${cleanPhone}@s.whatsapp.net`;
        if (this.prembots.has(userId)) {
            return { success: false, message: 'ꕤ Ya tienes un Prembot activo' };
        }
        if (this.pendingConnections.has(userId)) {
            return { success: false, message: 'ꕤ Ya hay una conexión en proceso' };
        }
        this.pendingConnections.set(userId, {
            startTime: Date.now(),
            tokenId: tokenId
        });
        try {
            const sessionPath = path.join(process.cwd(), 'prembots', cleanPhone);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            fs.mkdirSync(sessionPath, { recursive: true });
            const prembotUUID = uuidv4();
            const auth = new LocalAuth(prembotUUID, sessionPath);
            const account = { jid: '', pn: `${cleanPhone}@s.whatsapp.net`, name: '' };
            console.log('[Prembot] Account config:', JSON.stringify(account));
            const prembotInstance = new Bot(prembotUUID, auth, account);
            let isConnected = false;
            const timeout = setTimeout(() => {
                if (!isConnected) {
                    this.pendingConnections.delete(userId);
                    prembotInstance.disconnect?.();
                    mainSock.sendMessage(chatId, {
                        text: 'ꕤ *Tiempo agotado*\n\n> No se pudo vincular. El token sigue disponible.'
                    }).catch(() => { });
                }
            }, 3 * 60 * 1000);
            prembotInstance.on('otp', async (otpCode) => {
                console.log('[Prembot] OTP received:', otpCode);
                const formatted = otpCode.match(/.{1,4}/g)?.join('-') || otpCode;
                await mainSock.sendMessage(chatId, {
                    text: `🌟 *PREMBOT - Código de Vinculación*\n\n` +
                        `\`${formatted}\`\n\n` +
                        `*Pasos:*\n` +
                        `① Abre WhatsApp\n` +
                        `② Dispositivos vinculados\n` +
                        `③ Vincular dispositivo\n` +
                        `④ Vincular con número\n` +
                        `⑤ Ingresa el código\n\n` +
                        `> _Expira en 3 minutos_`
                });
                await mainSock.sendMessage(chatId, { text: otpCode });
            });
            prembotInstance.on('open', async (acc) => {
                clearTimeout(timeout);
                isConnected = true;

                this.pendingConnections.delete(userId);
                this.tokenService.useToken(tokenId, userId);
                this.tokenService.registerPrembot(userId, tokenId);
                const prembotData = {
                    bot: prembotInstance,
                    chatId,
                    sessionPath,
                    uuid: prembotUUID,
                    tokenId,
                    userId,
                    connectedAt: Date.now(),
                    stats: { messages: 0, commands: 0 },
                    rateLimit: { commands: [], messages: [] }
                };
                this.prembots.set(userId, prembotData);
                this.startBackupInterval(userId);
                const userName = acc?.name || 'Usuario';
                await mainSock.sendMessage(chatId, {
                    text: `ꕤ *PREMBOT ACTIVADO*\n\n` +
                        `> ${userName}\n` +
                        `> ${cleanPhone}\n` +
                        `> Token: ${tokenId.slice(0, 15)}...\n\n` +
                        `> _*Límites:*_\n` +
                        `• Grupos: ${LIMITS.MAX_GROUPS}\n` +
                        `• Chats: ${LIMITS.MAX_CHATS}\n` +
                        `• Cmds/min: ${LIMITS.COMMANDS_PER_MINUTE}\n\n` +
                        `> _Usa #prembot status para ver stats_`
                });
                this.setupMessageHandler(prembotInstance, userId);
            });
            prembotInstance.on('close', async (reason) => {
                console.log('[Prembot] Disconnected:', reason);
                clearTimeout(timeout);
                
                if (isConnected) {
                    const reasonStr = String(reason).toLowerCase();
                    const isFatal = reasonStr.includes('401') || reasonStr.includes('403') || reasonStr.includes('428');
                    
                    this.prembots.delete(userId);

                    if (!isFatal) {
                         console.log(`[Prembot] Connection lost for ${cleanPhone}. Reconnecting in 5s...`);
                         setTimeout(() => this.restartSession(userId, mainSock, tokenId), 5000);
                    }
                } else {
                    this.pendingConnections.delete(userId);
                    let errorMsg = 'ꕤ No se pudo conectar';
                    const reasonStr = String(reason).toLowerCase();
                    if (reasonStr.includes('401')) errorMsg = 'ꕤ Código inválido';
                    else if (reasonStr.includes('403')) errorMsg = 'ꕤ WhatsApp bloqueó temporalmente';
                    else if (reasonStr.includes('428')) errorMsg = 'ꕤ Máximo de dispositivos alcanzado';
                    else if (reasonStr.includes('515')) errorMsg = 'ꕤ Error de WhatsApp. Reintenta.';
                    mainSock.sendMessage(chatId, { text: errorMsg }).catch(() => { });
                }
            });
            prembotInstance.on('error', (err) => {
                console.error('[Prembot] Error:', err);
            });
            console.log('[Prembot] Starting OTP login for:', cleanPhone);
            await prembotInstance.login('otp');
            return { success: true, message: 'ꕤ Generando código de vinculación...' };
        } catch (error) {
            console.error('[Prembot] Error:', error);
            this.pendingConnections.delete(userId);
            return { success: false, message: 'ꕤ Error: ' + error.message };
        }
    }
    setupMessageHandler(prembotInstance, ownerId) {
        prembotInstance.ws?.ev.on('messages.upsert', async ({ messages }) => {
            for (const m of messages) {
                if (!m.message) continue;
                const chatId = m.key.remoteJid;
                const prembotData = this.prembots.get(ownerId);
                if (!prembotData) continue;
                const text = m.message.conversation ||
                    m.message.extendedTextMessage?.text || '';
                if (m.key.fromMe) {
                    const isCommand = text.startsWith('#') || text.startsWith('/') || text.startsWith('!');
                    if (!isCommand) continue; 
                }
                if (!this.tokenService.isPrembotActive(ownerId)) {
                    await prembotInstance.sendMessage(chatId, {
                        text: 'ꕤ Este Prembot ha expirado o fue desactivado.'
                    });
                    this.stopPrembot(ownerId);
                    return;
                }
                const rateCheck = this.checkRateLimit(ownerId, 'messages');
                if (!rateCheck.allowed) continue;
                prembotData.stats.messages++;
                this.tokenService.updateStats(ownerId, 'messages');
                if (text.startsWith('#') || text.startsWith('/') || text.startsWith('!')) {
                    const command = text.slice(1).split(' ')[0].toLowerCase();
                    if (this.isCommandBlocked(command)) {
                        await prembotInstance.sendMessage(chatId, {
                            text: 'ꕤ Este comando está bloqueado en Prembots.'
                        });
                        continue;
                    }
                    const cmdRateCheck = this.checkRateLimit(ownerId, 'commands');
                    if (!cmdRateCheck.allowed) {
                        await prembotInstance.sendMessage(chatId, {
                            text: `⏱ Rate limit excedido. Espera ${Math.ceil(cmdRateCheck.waitTime / 1000)}s`
                        });
                        continue;
                    }
                    prembotData.stats.commands++;
                    this.tokenService.updateStats(ownerId, 'commands');
                }
                if (global.messageHandler) {
                    try {
                        await global.messageHandler.handleMessage(prembotInstance, m, true, false);
                    } catch (err) {
                        console.error('[Prembot] Handler error:', err);
                    }
                }
            }
        });
        prembotInstance.ws?.ev.on('groups.update', (updates) => {
            for (const update of updates) {
                const currentCount = this.groupCounts.get(ownerId) || 0;

                if (currentCount >= LIMITS.MAX_GROUPS) {
                    console.log(`[Prembot] ${ownerId} hit group limit`);
                }
            }
        });
    }
    checkRateLimit(userId, type) {
        const prembotData = this.prembots.get(userId);
        if (!prembotData) return { allowed: false };
        const now = Date.now();
        const oneMinAgo = now - 60000;
        const limit = type === 'commands'
            ? LIMITS.COMMANDS_PER_MINUTE
            : LIMITS.MESSAGES_PER_MINUTE;
        prembotData.rateLimit[type] = prembotData.rateLimit[type].filter(t => t > oneMinAgo);
        if (prembotData.rateLimit[type].length >= limit) {
            const oldestTimestamp = prembotData.rateLimit[type][0];
            const waitTime = 60000 - (now - oldestTimestamp);
            return { allowed: false, waitTime };
        }
        prembotData.rateLimit[type].push(now);
        return { allowed: true };
    }
    startBackupInterval(userId) {
        const prembotData = this.prembots.get(userId);
        if (!prembotData) return;
        prembotData.backupInterval = setInterval(() => {
            this.backupSession(userId);
        }, LIMITS.BACKUP_INTERVAL);
    }
    backupSession(userId) {
        const prembotData = this.prembots.get(userId);
        if (!prembotData) return;
        try {
            const backupDir = path.join(process.cwd(), 'prembots_backup', userId.split('@')[0]);
            fs.mkdirSync(backupDir, { recursive: true });
            const sessionFiles = ['creds.json', 'app-state-sync-key-*.json'];
            if (fs.existsSync(prembotData.sessionPath)) {
                const files = fs.readdirSync(prembotData.sessionPath);
                for (const file of files) {
                    const src = path.join(prembotData.sessionPath, file);
                    const dest = path.join(backupDir, file);
                    fs.copyFileSync(src, dest);
                }
            }
            console.log(`[Prembot] Backup completed for ${userId}`);
        } catch (error) {
            console.error(`[Prembot] Backup error for ${userId}:`, error.message);
        }
    }
    stopPrembot(userId) {
        const prembotData = this.prembots.get(userId);
        if (!prembotData) {
            if (this.pendingConnections.has(userId)) {
                this.pendingConnections.delete(userId);
                return { success: true, message: 'ꕤ Conexión cancelada' };
            }
            return { success: false, message: 'ꕤ No tienes un Prembot activo' };
        }
        try {
            if (prembotData.backupInterval) {
                clearInterval(prembotData.backupInterval);
            }
            if (prembotData.bot) {
                prembotData.bot.disconnect?.();
            }
            this.prembots.delete(userId);
            return { success: true, message: 'ꕤ Prembot detenido' };
        } catch (error) {
            return { success: false, message: 'ꕤ Error al detener' };
        }
    }
    getPrembotStatus(userId) {
        const prembotData = this.prembots.get(userId);
        const tokenData = this.tokenService.getPrembot(userId);
        if (!prembotData && !tokenData) {
            return null;
        }
        const expiresAt = tokenData?.expiresAt || 0;
        const daysRemaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
        return {
            active: !!prembotData,
            userId,
            daysRemaining,
            expiresAt: new Date(expiresAt).toLocaleDateString(),
            stats: prembotData?.stats || tokenData?.stats || { messages: 0, commands: 0 },
            limits: {
                groups: `${this.groupCounts.get(userId) || 0}/${LIMITS.MAX_GROUPS}`,
                commandsPerMin: LIMITS.COMMANDS_PER_MINUTE
            },
            banned: tokenData?.banned || false
        };
    }
    async loadSessions(mainSock) {
        const sessionsDir = path.join(process.cwd(), 'prembots');
        if (!fs.existsSync(sessionsDir)) return;
        const files = fs.readdirSync(sessionsDir);
        for (const file of files) {
            const userId = `${file}@s.whatsapp.net`;
            if (fs.statSync(path.join(sessionsDir, file)).isDirectory()) {
                console.log(`[Prembot] Restoring session for ${file}`);
                const tokenData = this.tokenService.getPrembot(userId);
                if (tokenData && !tokenData.banned) {
                     this.restartSession(userId, mainSock, tokenData.tokenId);
                } else {
                    console.log(`[Prembot] Skipping restore for ${file}: No active token found or banned.`);
                }
            }
        }
    }
    async restartSession(userId, mainSock, tokenId) {
        if (this.prembots.has(userId)) return;
        const cleanPhone = userId.split('@')[0];
        const sessionPath = path.join(process.cwd(), 'prembots', cleanPhone);
        try {
            const prembotUUID = uuidv4();
            const auth = new LocalAuth(prembotUUID, sessionPath);
            const account = { jid: '', pn: userId, name: '' };
            const prembotInstance = new Bot(prembotUUID, auth, account);
            prembotInstance.on('open', async (acc) => {
                 const prembotData = {
                    bot: prembotInstance,
                    chatId: null,
                    sessionPath,
                    uuid: prembotUUID,
                    tokenId,
                    userId,
                    connectedAt: Date.now(),
                    stats: { messages: 0, commands: 0 },
                    rateLimit: { commands: [], messages: [] }
                };
                this.prembots.set(userId, prembotData);
                this.startBackupInterval(userId);
                this.setupMessageHandler(prembotInstance, userId);
                console.log(`[Prembot] Session restored for ${cleanPhone}`);
            });
             prembotInstance.on('close', async (reason) => {
                console.log('[Prembot] Disconnected:', reason);
                const reasonStr = String(reason).toLowerCase();
                const isFatal = reasonStr.includes('401') || reasonStr.includes('403') || reasonStr.includes('428');
                
                this.prembots.delete(userId);
                
                if (!isFatal) {
                     console.log(`[Prembot] Auto-reconnecting session for ${cleanPhone} in 5s...`);
                     setTimeout(() => this.restartSession(userId, mainSock, tokenId), 5000);
                }
            });
             prembotInstance.on('error', (err) => {
                console.error('[Prembot] Error:', err);
            });
            console.log('[Prembot] Restarting login for:', cleanPhone);
            await prembotInstance.login('qr'); 
        } catch (error) {
            console.error(`[Prembot] Failed to restart session for ${userId}:`, error.message);
        }
    }
    getAllPrembots() {
        return Array.from(this.prembots.entries()).map(([userId, data]) => ({
            userId,
            connectedAt: data.connectedAt,
            stats: data.stats
        }));
    }
}
export default PrembotManager;