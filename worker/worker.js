import express from 'express';
import { Bot, LocalAuth } from '@imjxsx/wapi';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const NODE_ID = process.env.NODE_ID || 'worker-1';
const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '3001');
const SECRET = process.env.CLUSTER_SECRET || 'kaoruko-cluster-2026';
const MAIN_SERVER = process.env.MAIN_SERVER || 'http://64.20.54.50:30074';

const subbots = new Map();
const pendingConnections = new Map();
const app = express();
app.use(express.json());

app.use((req, res, next) => {
    if (req.path === '/health') return next();
    if (req.headers['x-cluster-secret'] !== SECRET) return res.status(403).json({ error: 'Unauthorized' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', nodeId: NODE_ID }));

app.get('/worker/health', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
        nodeId: NODE_ID, role: 'worker',
        sessions: subbots.size,
        pending: pendingConnections.size,
        memory: {
            used: Math.round(mem.heapUsed / 1024 / 1024),
            total: Math.round(mem.heapTotal / 1024 / 1024),
            rss: Math.round(mem.rss / 1024 / 1024)
        },
        uptime: Math.round(process.uptime())
    });
});

app.get('/worker/sessions', (req, res) => {
    const sessions = Array.from(subbots.keys()).map(userId => ({ userId, nodeId: NODE_ID }));
    res.json({ sessions, count: sessions.length });
});

app.post('/worker/session/start', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone required' });
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const userId = `${cleanPhone}@s.whatsapp.net`;
    if (subbots.has(userId)) return res.json({ success: false, message: 'Ya tiene un sub-bot activo' });
    if (pendingConnections.has(userId)) return res.json({ success: false, message: 'Conexión en proceso' });
    pendingConnections.set(userId, { startTime: Date.now() });
    try {
        const sessionPath = path.join(process.cwd(), 'subbots', cleanPhone);
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
        fs.mkdirSync(sessionPath, { recursive: true });
        const botUUID = uuidv4();
        const auth = new LocalAuth(botUUID, sessionPath);
        const account = { jid: '', pn: `${cleanPhone}@s.whatsapp.net`, name: '' };
        const botInstance = new Bot(botUUID, auth, account);
        const result = await new Promise((resolve) => {
            let resolved = false, isConnected = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    pendingConnections.delete(userId);
                    botInstance.disconnect?.();
                    resolve({ success: false, message: 'Tiempo agotado' });
                }
            }, 90000);
            botInstance.on('otp', (otpCode) => {
                if (!resolved) {
                    resolved = true;
                    console.log(`[Worker] OTP for ${cleanPhone}: ${otpCode}`);
                    resolve({ success: true, otp: otpCode, nodeId: NODE_ID });
                }
            });
            botInstance.on('open', async () => {
                clearTimeout(timeout);
                isConnected = true;
                pendingConnections.delete(userId);
                subbots.set(userId, { bot: botInstance, sessionPath, uuid: botUUID });
                console.log(`[Worker] Subbot connected: ${cleanPhone}`);
                setupMessageRelay(botInstance, userId);
            });
            botInstance.on('close', (reason) => {
                clearTimeout(timeout);
                if (!isConnected) {
                    pendingConnections.delete(userId);
                    if (!resolved) { resolved = true; resolve({ success: false, message: 'No se pudo conectar' }); }
                } else {
                    const r = String(reason).toLowerCase();
                    const fatal = r.includes('401') || r.includes('403') || r.includes('428');
                    subbots.delete(userId);
                    if (!fatal) {
                        console.log(`[Worker] Reconnecting ${cleanPhone} in 5s...`);
                        setTimeout(() => restartSession(userId), 5000);
                    }
                }
            });
            botInstance.on('error', (err) => console.error('[Worker] Error:', err));
            console.log(`[Worker] Starting OTP for: ${cleanPhone}`);
            botInstance.login('otp').catch(err => {
                if (!resolved) { resolved = true; pendingConnections.delete(userId); resolve({ success: false, message: err.message }); }
            });
        });
        res.json(result);
    } catch (err) {
        pendingConnections.delete(userId);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/worker/session/stop', (req, res) => {
    const { userId } = req.body;
    const data = subbots.get(userId);
    if (!data) return res.json({ success: false, message: 'No hay sub-bot activo' });
    data.bot.disconnect?.();
    subbots.delete(userId);
    res.json({ success: true, message: 'Sub-bot detenido' });
});

function setupMessageRelay(botInstance, ownerId) {
    botInstance.ws?.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            if (!m.message || m.key.fromMe) continue;
            const text = m.message.conversation ||
                m.message.extendedTextMessage?.text ||
                m.message.imageMessage?.caption ||
                m.message.videoMessage?.caption || '';
            if (!text.startsWith('#') && !text.startsWith('/') && !text.startsWith('!')) continue;
            const chatId = m.key.remoteJid;
            const sender = m.key.participant || m.key.remoteJid;
            const senderPhone = sender.split(':')[0].split('@')[0];
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000);
                const response = await fetch(`${MAIN_SERVER}/relay/process`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-cluster-secret': SECRET },
                    body: JSON.stringify({
                        text, chatId, sender, senderPhone,
                        pushName: m.pushName || 'Usuario',
                        isGroup: chatId.endsWith('@g.us'),
                        nodeId: NODE_ID, subbotUserId: ownerId
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                const result = await response.json();
                if (result.replies) {
                    for (const reply of result.replies) {
                        await botInstance.ws.sendMessage(chatId, reply, { quoted: m });
                    }
                }
            } catch (err) {
                console.error('[Worker] Relay error:', err.message);
            }
        }
    });
}

async function restartSession(userId) {
    if (subbots.has(userId)) return;
    const cleanPhone = userId.split('@')[0];
    const sessionPath = path.join(process.cwd(), 'subbots', cleanPhone);
    if (!fs.existsSync(sessionPath)) return;
    try {
        const botUUID = uuidv4();
        const auth = new LocalAuth(botUUID, sessionPath);
        const account = { jid: '', pn: userId, name: '' };
        const botInstance = new Bot(botUUID, auth, account);
        botInstance.on('open', () => {
            subbots.set(userId, { bot: botInstance, sessionPath, uuid: botUUID });
            console.log(`[Worker] Session restored: ${cleanPhone}`);
            setupMessageRelay(botInstance, userId);
        });
        botInstance.on('close', (reason) => {
            const r = String(reason).toLowerCase();
            const fatal = r.includes('401') || r.includes('403') || r.includes('428');
            subbots.delete(userId);
            if (!fatal) setTimeout(() => restartSession(userId), 5000);
        });
        botInstance.on('error', (err) => console.error('[Worker] Error:', err));
        await botInstance.login('qr');
    } catch (err) {
        console.error(`[Worker] Failed to restart ${userId}:`, err.message);
    }
}

function loadSessions() {
    const dir = path.join(process.cwd(), 'subbots');
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            console.log(`[Worker] Restoring: ${file}`);
            restartSession(`${file}@s.whatsapp.net`);
        }
    }
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✿ Worker ${NODE_ID} corriendo en puerto ${PORT}`);
    console.log(`✿ Main server: ${MAIN_SERVER}`);
    loadSessions();
});
