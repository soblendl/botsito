import { Bot, LocalAuth } from '@imjxsx/wapi';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class JadibotManager {
    constructor() {
        this.subbots = new Map();
        this.codes = new Map();
        this.pendingConnections = new Map();
    }
    generateCode() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    createCode(userId) {
        const code = this.generateCode();
        this.codes.set(code, { userId, createdAt: Date.now() });
        setTimeout(() => this.codes.delete(code), 5 * 60 * 1000);
        return code;
    }
    async startSubbot(code = null, chatId, mainSock, phoneNumber = null) {
        if (phoneNumber) { return await this.startWithPairingCode(chatId, mainSock, phoneNumber) }
        if (code) {
            return await this.startWithQR(code, chatId, mainSock);
        }
        return { success: false, message: 'ꕤ Se requiere código o número de teléfono' };
    }
    async startWithPairingCode(chatId, mainSock, phoneNumber) {
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const userId = `${cleanPhone}@s.whatsapp.net`;
        if (this.subbots.has(userId)) {
            return { success: false, message: 'ꕤ Ya tienes un sub-bot activo' };
        }
        if (this.pendingConnections.has(userId)) {
            return { success: false, message: 'ꕤ Ya hay una conexión en proceso' };
        }
        this.pendingConnections.set(userId, { startTime: Date.now() });
        try {
            const sessionPath = path.join(process.cwd(), 'subbots', cleanPhone);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }
            fs.mkdirSync(sessionPath, { recursive: true });
            const subbotUUID = uuidv4();
            const auth = new LocalAuth(subbotUUID, sessionPath);
            const account = { jid: '', pn: `${cleanPhone}@s.whatsapp.net`, name: '' };
            const subbotInstance = new Bot(subbotUUID, auth, account);
            let isConnected = false;
            const timeout = setTimeout(() => {
                if (!isConnected) {
                    this.pendingConnections.delete(userId);
                    subbotInstance.disconnect?.();
                    mainSock.sendMessage(chatId, {
                        text: 'ꕤ *Tiempo agotado*\n\n> No se pudo vincular. Intenta nuevamente con */code*'
                    }).catch(() => { });
                }
            }, 3 * 60 * 1000);
            subbotInstance.on('otp', async (otpCode) => {
                console.log('[Jadibot] OTP code received:', otpCode);
                const formatted = otpCode.match(/.{1,4}/g)?.join('-') || otpCode;
                await mainSock.sendMessage(chatId, {
                    text: `𓆩❤︎𓆪 *Código de vinculación:*\n\n\`${formatted}\`\n\n*Pasos:*\n① » Abre WhatsApp en tu teléfono\n② » Dispositivos vinculados*\n③ » Toca *"Vincular dispositivo"*\n④ » Elige *"Vincular con número de teléfono"*\n⑤ » Ingresa el código\n\n> _El código expira en 3 minutos 订_`
                });
                await mainSock.sendMessage(chatId, { text: otpCode });
            });
            subbotInstance.on('open', async (acc) => {
                clearTimeout(timeout);
                isConnected = true;
                this.pendingConnections.delete(userId);
                this.subbots.set(userId, {
                    bot: subbotInstance,
                    chatId,
                    sessionPath,
                    uuid: subbotUUID
                });
                const userName = acc?.name || 'Usuario';
                await mainSock.sendMessage(chatId, {
                    text: `ꕤ *Sub-bot vinculado exitosamente*\n\n⸝⸝ ${userName}\n⸝⸝ ${cleanPhone}\n\n> *_Ya puedes usar el bot desde ese número_*`
                });
                subbotInstance.ws?.ev.on('messages.upsert', async ({ messages }) => {
                    const m = messages[0];
                    if (!m.message || m.key.fromMe) return;
                    if (global.messageHandler) {
                        await global.messageHandler.handleMessage(subbotInstance, m);
                    }
                });
            });
            subbotInstance.on('close', (reason) => {
                console.log('[Jadibot] Connection closed:', reason);
                clearTimeout(timeout);
                if (!isConnected) {
                    this.pendingConnections.delete(userId);
                    let errorMsg = 'ꕤ No se pudo conectar';
                    const reasonStr = String(reason).toLowerCase();
                    if (reasonStr.includes('401')) {
                        errorMsg = 'ꕤ Código inválido o expirado';
                    } else if (reasonStr.includes('403')) {
                        errorMsg = 'ꕤ WhatsApp bloqueó la conexión. Espera unos minutos.';
                    } else if (reasonStr.includes('428')) {
                        errorMsg = 'ꕤ Demasiados dispositivos vinculados (máx 4)';
                    } else if (reasonStr.includes('515')) {
                        errorMsg = 'ꕤ Requiere reinicio. Intenta de nuevo.';
                    }
                    mainSock.sendMessage(chatId, { text: errorMsg }).catch(() => { });
                } else {
                    const reasonStr = String(reason).toLowerCase();
                    const isFatal = reasonStr.includes('401') || reasonStr.includes('403') || reasonStr.includes('428');
                    this.subbots.delete(userId);
                    
                    if (!isFatal) {
                        console.log(`[Jadibot] Connection lost for ${cleanPhone}. Reconnecting in 5s...`);
                        setTimeout(() => this.restartSession(userId, mainSock), 5000);
                    }
                }
            });
            subbotInstance.on('error', (err) => {
                console.error('[Jadibot] Error:', err);
            });
            console.log('[Jadibot] Starting login with OTP for:', cleanPhone);
            await subbotInstance.login('otp');
            return { success: true, message: 'ꕤ Generando código...' };
        } catch (error) {
            console.error('[Jadibot] Error:', error.message);
            this.pendingConnections.delete(userId);
            return { success: false, message: 'ꕤ Error: ' + error.message };
        }
    }
    async startWithQR(code, chatId, mainSock) {
        const codeData = this.codes.get(code);
        if (!codeData) {
            return { success: false, message: 'ꕤ Código inválido o expirado' };
        }
        const userId = codeData.userId;
        const cleanUserId = userId.split('@')[0];
        if (this.subbots.has(userId)) {
            return { success: false, message: 'ꕤ Ya tienes un sub-bot activo' };
        }
        if (this.pendingConnections.has(userId)) {
            return { success: false, message: 'ꕤ Ya hay una conexión en proceso' };
        }
        this.pendingConnections.set(userId, { startTime: Date.now() });
        try {
            const sessionPath = path.join(process.cwd(), 'subbots', cleanUserId);
            fs.mkdirSync(sessionPath, { recursive: true });
            const subbotUUID = uuidv4();
            const auth = new LocalAuth(subbotUUID, sessionPath);
            const account = { jid: '', pn: '', name: '' };
            const subbotInstance = new Bot(subbotUUID, auth, account);
            let isConnected = false;
            const timeout = setTimeout(() => {
                if (!isConnected) {
                    this.pendingConnections.delete(userId);
                    subbotInstance.disconnect?.();
                    mainSock.sendMessage(chatId, { text: 'ꕤ Tiempo agotado' }).catch(() => { });
                }
            }, 2 * 60 * 1000);
            subbotInstance.on('qr', async (qr) => {
                const qrBuffer = await QRCode.toBuffer(qr, { scale: 8 });
                await mainSock.sendMessage(chatId, {
                    image: qrBuffer,
                    caption: '> ꩜ *Escanea este QR con WhatsApp*\n\n> _Tienes 2 minutos_'
                });
            });
            subbotInstance.on('open', async (acc) => {
                clearTimeout(timeout);
                isConnected = true;
                this.pendingConnections.delete(userId);
                this.codes.delete(code);
                this.subbots.set(userId, {
                    bot: subbotInstance,
                    chatId,
                    sessionPath,
                    uuid: subbotUUID
                });
                await mainSock.sendMessage(chatId, {
                    text: `ꕥ Sub-bot conectado\n\n➜ ${cleanUserId}`
                });
                subbotInstance.ws?.ev.on('messages.upsert', async ({ messages }) => {
                    const m = messages[0];
                    if (!m.message || m.key.fromMe) return;
                    if (global.messageHandler) {
                        await global.messageHandler.handleMessage(subbotInstance, m);
                    }
                });
            });
            subbotInstance.on('close', (reason) => {
                clearTimeout(timeout);
                if (!isConnected) {
                    this.pendingConnections.delete(userId);
                    mainSock.sendMessage(chatId, { text: 'ꕤ No se pudo conectar' }).catch(() => { });
                } else {
                    const reasonStr = String(reason).toLowerCase();
                    const isFatal = reasonStr.includes('401') || reasonStr.includes('403') || reasonStr.includes('428');
                    this.subbots.delete(userId);

                    if (!isFatal) {
                        console.log(`[Jadibot] Connection lost for ${cleanUserId}. Reconnecting in 5s...`);
                        setTimeout(() => this.restartSession(userId, mainSock), 5000);
                    }
                }
            });
            await subbotInstance.login('qr');
            return { success: true, message: 'ꕤ Generando QR...' };
        } catch (error) {
            console.error('[Jadibot] QR Error:', error.message);
            this.pendingConnections.delete(userId);
            return { success: false, message: 'ꕤ Error: ' + error.message };
        }
    }
    stopSubbot(userId) {
        const subbotData = this.subbots.get(userId);
        if (!subbotData) {
            if (this.pendingConnections.has(userId)) {
                this.pendingConnections.delete(userId);
                return { success: true, message: 'ꕥ Vinculación cancelada' };
            }
            return { success: false, message: 'ꕤ No tienes un sub-bot activo' };
        }
        try {
            if (subbotData.bot) {
                subbotData.bot.disconnect?.();
            }
            this.subbots.delete(userId);
            return { success: true, message: 'ꕥ Sub-bot detenido' };
        } catch (error) {
            return { success: false, message: 'ꕤ Error al detener' };
        }
    }
    async loadSessions(mainSock) {
        const sessionsDir = path.join(process.cwd(), 'subbots');
        if (!fs.existsSync(sessionsDir)) return;

        const files = fs.readdirSync(sessionsDir);
        for (const file of files) {
            const userId = `${file}@s.whatsapp.net`;
            if (fs.statSync(path.join(sessionsDir, file)).isDirectory()) {
                console.log(`[Jadibot] Restoring session for ${file}`);
                this.restartSession(userId, mainSock);
            }
        }
    }

    async restartSession(userId, mainSock) {
        if (this.subbots.has(userId)) return;

        const cleanPhone = userId.split('@')[0];
        const sessionPath = path.join(process.cwd(), 'subbots', cleanPhone);

        try {
            const subbotUUID = uuidv4();
            const auth = new LocalAuth(subbotUUID, sessionPath);
            const account = { jid: '', pn: userId, name: '' };
            const subbotInstance = new Bot(subbotUUID, auth, account);

            subbotInstance.on('open', async (acc) => {
                this.subbots.set(userId, {
                    bot: subbotInstance,
                    chatId: null,
                    sessionPath,
                    uuid: subbotUUID
                });
                console.log(`[Jadibot] Session restored for ${cleanPhone}`);
                
                subbotInstance.ws?.ev.on('messages.upsert', async ({ messages }) => {
                    const m = messages[0];
                    if (!m.message || m.key.fromMe) return;
                    if (global.messageHandler) {
                        await global.messageHandler.handleMessage(subbotInstance, m);
                    }
                });
            });

            subbotInstance.on('close', (reason) => {
                 console.log(`[Jadibot] Session closed for ${cleanPhone}:`, reason);
                 const reasonStr = String(reason).toLowerCase();
                 const isFatal = reasonStr.includes('401') || reasonStr.includes('403') || reasonStr.includes('428');
                 
                 this.subbots.delete(userId);

                 if (!isFatal) {
                     console.log(`[Jadibot] Auto-reconnecting ${cleanPhone} in 5s...`);
                     setTimeout(() => this.restartSession(userId, mainSock), 5000);
                 }
            });

            subbotInstance.on('error', (err) => {
                console.error('[Jadibot] Error:', err);
            });

            console.log('[Jadibot] Restarting login for:', cleanPhone);
            await subbotInstance.login('qr'); 

        } catch (error) {
            console.error(`[Jadibot] Failed to restart session for ${userId}:`, error.message);
        }
    }

    getSubbots() {
        return Array.from(this.subbots.entries()).map(([userId, data]) => ({
            userId,
            chatId: data.chatId
        }));
    }
}
export const jadibotManager = new JadibotManager();