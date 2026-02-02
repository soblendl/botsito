import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Redis from 'ioredis';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class DatabaseService {
    constructor(dbFilePath = path.join(__dirname, '../../database/db.data')) {
        this.dbPath = dbFilePath;
        this.db = {
            users: {},
            groups: {},
            waifus: {},
            economy: {},
            gacha: {},
            cooldowns: {},
            guilds: {},
            seasons: [],
            plugins: {}
        };
        this.saveInterval = null;
        this.isDirty = false;
        this.redis = null;
        this.initRedis();
    }
    initRedis() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) return null;
                    return Math.min(times * 200, 2000);
                },
                lazyConnect: true
            });
            this.redis.on('connect', () => {
                console.log('ִ𖤐 Redis conectado - Sistema de caché activo');
            });
            this.redis.on('error', (err) => {
                console.log('ִ𖤐 Redis no disponible, usando modo local:', err.message);
                this.redis = null;
            });
            this.redis.connect().catch(() => {
                console.log('ִ𖤐 Continuando sin Redis - usando solo almacenamiento local');
                this.redis = null;
            });
        } catch (error) {
            console.log('ִ𖤐 Redis no configurado - usando solo almacenamiento local');
            this.redis = null;
        }
    }
    async getCached(key, ttl = 300) {
        if (!this.redis) return null;
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            return null;
        }
    }
    async setCache(key, value, ttl = 300) {
        if (!this.redis) return;
        try {
            await this.redis.setex(key, ttl, JSON.stringify(value));
        } catch (error) {
            console.error('ִ𖤐 Error al guardar en caché:', error.message);
        }
    }
    async invalidateCache(pattern) {
        if (!this.redis) return;
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            console.error('ִ𖤐 Error al invalidar caché:', error.message);
        }
    }
    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf-8');
                this.db = JSON.parse(data);
                console.log('ִ𖤐 Base de datos cargada en RAM');
            } else {
                console.log('ִ𖤐 Base de datos inicializada');
                this.save();
            }
        } catch (error) {
            console.error('ִ𖤐 Error cargando base de datos:', error.message);
            console.log('ִ𖤐 Usando base de datos vacía');
        }
        this.setupAutoSave();
        this.setupShutdownHooks();
        return this.db;
    }
    setupAutoSave() {
        this.saveInterval = setInterval(() => this.save(), 30000);
    }
    setupShutdownHooks() {
        ['SIGINT', 'SIGTERM', 'exit'].forEach(event => {
            process.on(event, () => {
                console.log(`\nִ𖤐 Guardando base de datos antes de cerrar...`);
                this.save();
                if (this.saveInterval) {
                    clearInterval(this.saveInterval);
                }
                if (this.redis) {
                    this.redis.disconnect();
                }
            });
        });
    }
    save() {
        if (!this.isDirty) return;
        try {
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2), 'utf-8');
            this.isDirty = false;
        } catch (error) {
            console.error('ִ𖤐 Error guardando base de datos:', error.message);
        }
    }
    markDirty() {
        this.isDirty = true;
    }
    async getUser(userId) {
        const cacheKey = `user:${userId}`;
        let user = await this.getCached(cacheKey);
        if (user) return user;
        if (!this.db.users[userId]) {
            this.db.users[userId] = {
                economy: {
                    coins: 0,
                    bank: 0,
                    lastDaily: 0,
                    lastWork: 0,
                    lastCrime: 0,
                    lastSlut: 0
                },
                gacha: {
                    characters: [],
                    lastClaim: 0,
                    votes: {}
                },
                stats: {
                    messages: 0,
                    commands: 0
                },
                guild: null,
                season: null,
                monedas: 0,
                antirobo: 0,
                desbloqueo: 0
            };
            this.markDirty();
        }
        user = this.db.users[userId];
        await this.setCache(cacheKey, user);
        return user;
    }
    updateUser(userId, updates) {
        const user = this.db.users[userId];
        if (user) {
            Object.assign(user, updates);
            this.markDirty();
            this.invalidateCache(`user:${userId}`);
        }
        return user;
    }
    async getGroup(groupId) {
        const cacheKey = `group:${groupId}`;
        let group = await this.getCached(cacheKey);
        if (group) return group;
        if (!this.db.groups[groupId]) {
            this.db.groups[groupId] = {
                settings: {
                    antilink: false,
                    welcome: false,
                    economy: true,
                    porn: false,
                    alerts: false,
                    aiModeration: false,
                    moderationLevel: 'medium'
                },
                banned: []
            };
            this.markDirty();
        }
        group = this.db.groups[groupId];
        await this.setCache(cacheKey, group);
        return group;
    }
    updateGroup(groupId, updates) {
        const group = this.db.groups[groupId];
        if (group) {
            Object.assign(group, updates);
            this.markDirty();
            this.invalidateCache(`group:${groupId}`);
        }
        return group;
    }
    async getGuild(guildId) {
        return this.db.guilds[guildId] || null;
    }
    createGuild(guildId, data) {
        this.db.guilds[guildId] = {
            ...data,
            members: [],
            level: 1,
            experience: 0,
            treasury: 0,
            createdAt: Date.now()
        };
        this.markDirty();
        return this.db.guilds[guildId];
    }
    async addTransaction(userId, type, amount, description = '', season = null) {
        if (!this.db.economy.transactions) {
            this.db.economy.transactions = [];
        }
        const transaction = {
            id: Date.now() + Math.random(),
            userId,
            type,
            amount,
            description,
            season,
            timestamp: Date.now()
        };
        this.db.economy.transactions.push(transaction);
        this.markDirty();
        if (this.redis) {
            await this.redis.rpush(`transactions:${userId}`, JSON.stringify(transaction));
        }
        return transaction;
    }
    async getLeaderboard(season = null, limit = 10) {
        const cacheKey = `leaderboard:${season || 'all'}:${limit}`;
        let leaderboard = await this.getCached(cacheKey, 60);
        if (leaderboard) return leaderboard;
        const users = Object.entries(this.db.users)
            .filter(([_, user]) => !season || user.season === season)
            .map(([id, user]) => ({
                id,
                coins: (user.economy?.coins || 0) + (user.economy?.bank || 0),
                level: user.level || 1
            }))
            .sort((a, b) => b.coins - a.coins)
            .slice(0, limit);
        await this.setCache(cacheKey, users, 60);
        return users;
    }
    getCurrentSeason() {
        return this.db.seasons.find(s => s.active) || null;
    }
    createSeason(name, startDate, endDate, rewards) {
        const season = {
            id: Date.now(),
            name,
            startDate,
            endDate,
            active: true,
            rewards
        };
        this.db.seasons.forEach(s => s.active = false);
        this.db.seasons.push(season);
        this.markDirty();
        return season;
    }
}
