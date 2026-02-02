import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TokenService {
    constructor() {
        this.tokensPath = path.join(__dirname, '..', 'database', 'tokens.json');
        this.data = { tokens: [], prembots: [], payments: [] };
        this.isDirty = false;
        this.saveInterval = null;
        this.paypal = {
            clientId: process.env.PAYPAL_CLIENT_ID || 'Aakv2h-LZrrB4V6yXFdkODvL5g0tm_oyrkGVPq0u_yXdYhyYkUUGQvW1eKalLqgQ5rozuwSPIzvcDtfS',
            clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'ED6A_iSndfK2BatcojUs12iNsbjHWVUyodsqe6eiVfYYtnxcJxgbPBzTqa3P6KMdWXoSd_Ul4G0p1MFm',
            mode: 'sandbox', // 'sandbox' or 'live'
            baseUrl: 'https://api-m.sandbox.paypal.com',
            price: 13.00,
            currency: 'USD'
        };
    }
    async load() {
        try {
            if (fs.existsSync(this.tokensPath)) {
                const content = fs.readFileSync(this.tokensPath, 'utf8');
                this.data = JSON.parse(content);
            }
            this.startAutoSave();
            console.log('🎫 TokenService cargado');
        } catch (error) {
            console.error('🎫 Error cargando tokens:', error.message);
        }
    }
    startAutoSave() {
        this.saveInterval = setInterval(() => {
            if (this.isDirty) {
                this.save();
            }
        }, 10000);
    }
    save() {
        try {
            fs.writeFileSync(this.tokensPath, JSON.stringify(this.data, null, 2));
            this.isDirty = false;
        } catch (error) {
            console.error('🎫 Error guardando tokens:', error.message);
        }
    }
    markDirty() {
        this.isDirty = true;
    }
    generateTokenId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `TOKEN-${segment()}-${segment()}-${segment()}`;
    }
    createToken(userId, duration = '30d') {
        const durationMs = this.parseDuration(duration);
        const token = {
            id: this.generateTokenId(),
            userId: userId,
            createdAt: Date.now(),
            expiresAt: Date.now() + durationMs,
            duration: duration,
            used: false,
            usedBy: null,
            usedAt: null
        };
        this.data.tokens.push(token);
        this.markDirty();
        return token;
    }
    parseDuration(duration) {
        const match = duration.match(/^(\d+)(d|h|m)$/);
        if (!match) return 30 * 24 * 60 * 60 * 1000;
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            default: return 30 * 24 * 60 * 60 * 1000;
        }
    }
    validateToken(tokenId) {
        const token = this.data.tokens.find(t => t.id === tokenId);
        if (!token) {
            return { valid: false, error: 'Token no encontrado' };
        }
        if (token.used) {
            return { valid: false, error: 'Token ya fue usado' };
        }
        if (Date.now() > token.expiresAt) {
            return { valid: false, error: 'Token expirado' };
        }

        return { valid: true, token };
    }
    useToken(tokenId, userId) {
        const validation = this.validateToken(tokenId);
        if (!validation.valid) return validation;
        const token = validation.token;
        token.used = true;
        token.usedBy = userId;
        token.usedAt = Date.now();
        this.markDirty();
        return { valid: true, token };
    }
    registerPrembot(userId, tokenId) {
        // Get the token to determine duration
        const token = this.data.tokens.find(t => t.id === tokenId);
        // Calculate expiry from NOW + token duration (not from token creation time)
        const durationMs = token ? this.parseDuration(token.duration) : (30 * 24 * 60 * 60 * 1000);
        const newExpiresAt = Date.now() + durationMs;
        
        const existing = this.data.prembots.find(p => p.userId === userId);
        if (existing) {
            existing.tokenId = tokenId;
            existing.connectedAt = Date.now();
            existing.expiresAt = newExpiresAt; // Update expiry on new token
            existing.banned = false;
        } else {
            this.data.prembots.push({
                userId: userId,
                tokenId: tokenId,
                connectedAt: Date.now(),
                expiresAt: newExpiresAt,
                stats: { messages: 0, commands: 0, groups: 0 },
                limits: { groups: 50, chats: 200, commandsPerMin: 30 },
                commandHistory: [],
                banned: false,
                banReason: null,
                // Campos de personalización
                customName: null,
                customImage: null
            });
        }
        this.markDirty();
    }

    // Métodos de personalización
    setPrembotName(userId, name) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return { success: false, error: 'Prembot no encontrado' };
        prembot.customName = name;
        this.markDirty();
        return { success: true };
    }

    setPrembotImage(userId, imagePath) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return { success: false, error: 'Prembot no encontrado' };
        prembot.customImage = imagePath;
        this.markDirty();
        return { success: true };
    }

    getPrembotConfig(userId) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return null;
        return {
            customName: prembot.customName,
            customImage: prembot.customImage
        };
    }
    getTokenExpiry(tokenId) {
        const token = this.data.tokens.find(t => t.id === tokenId);
        return token ? token.expiresAt : Date.now();
    }
    getPrembot(userId) {
        return this.data.prembots.find(p => p.userId === userId);
    }
    isPrembotActive(userId) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return false;
        if (prembot.banned) return false;
        if (Date.now() > prembot.expiresAt) return false;
        return true;
    }
    banPrembot(userId, reason = 'Comportamiento tóxico') {
        const prembot = this.getPrembot(userId);
        if (!prembot) return false;

        prembot.banned = true;
        prembot.banReason = reason;
        this.markDirty();
        return true;
    }
    unbanPrembot(userId) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return false;
        prembot.banned = false;
        prembot.banReason = null;
        this.markDirty();
        return true;
    }
    updateStats(userId, field) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return;
        prembot.stats[field] = (prembot.stats[field] || 0) + 1;
        this.markDirty();
    }
    checkRateLimit(userId) {
        const prembot = this.getPrembot(userId);
        if (!prembot) return { allowed: false, error: 'Prembot no encontrado' };
        const now = Date.now();
        const oneMinAgo = now - 60000;
        prembot.commandHistory = prembot.commandHistory.filter(t => t > oneMinAgo);
        if (prembot.commandHistory.length >= prembot.limits.commandsPerMin) {
            return { allowed: false, error: 'Rate limit excedido (30 comandos/min)' };
        }
        prembot.commandHistory.push(now);
        this.markDirty();
        return { allowed: true };
    }
    getAllPrembots() {
        return this.data.prembots.map(p => ({
            userId: p.userId,
            connectedAt: p.connectedAt,
            expiresAt: p.expiresAt,
            stats: p.stats,
            banned: p.banned,
            daysRemaining: Math.max(0, Math.ceil((p.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
        }));
    }
    async getPayPalAccessToken() {
        if (!this.paypal.clientId || !this.paypal.clientSecret) {
            throw new Error('PayPal credentials not configured');
        }
        const auth = Buffer.from(`${this.paypal.clientId}:${this.paypal.clientSecret}`).toString('base64');
        const response = await fetch(`${this.paypal.baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const data = await response.json();
        return data.access_token;
    }
    async createPayPalOrder(userId) {
        try {
            const accessToken = await this.getPayPalAccessToken();
            const response = await fetch(`${this.paypal.baseUrl}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: this.paypal.currency,
                            value: this.paypal.price.toFixed(2)
                        },
                        description: 'Prembot Token - 30 días',
                        custom_id: userId
                    }],
                    application_context: {
                        brand_name: 'Kaoruko Waguri Bot',
                        landing_page: 'BILLING',
                        user_action: 'PAY_NOW',
                        return_url: 'https://example.com/success',
                        cancel_url: 'https://example.com/cancel'
                    }
                })
            });
            const order = await response.json();
            this.data.payments.push({
                orderId: order.id,
                userId: userId,
                status: 'CREATED',
                createdAt: Date.now(),
                amount: this.paypal.price
            });
            this.markDirty();

            const approvalUrl = order.links?.find(l => l.rel === 'approve')?.href;
            return { success: true, orderId: order.id, approvalUrl };

        } catch (error) {
            console.error('PayPal Error:', error);
            return { success: false, error: error.message };
        }
    }
    async capturePayPalOrder(orderId) {
        try {
            const accessToken = await this.getPayPalAccessToken();
            const response = await fetch(`${this.paypal.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const capture = await response.json();
            const payment = this.data.payments.find(p => p.orderId === orderId);
            if (payment) {
                payment.status = capture.status;
                payment.capturedAt = Date.now();
                if (capture.status === 'COMPLETED') {
                    const token = this.createToken(payment.userId, '30d');
                    payment.tokenId = token.id;
                }
                this.markDirty();
            }
            return { success: capture.status === 'COMPLETED', capture };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    getPayment(orderId) {
        return this.data.payments.find(p => p.orderId === orderId);
    }
    async gracefulShutdown() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        this.save();
    }
}
export default TokenService