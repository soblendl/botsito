import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { LocalDB } from '@imjxsx/localdb';
import User from '../../models/User.js';
import Group from '../../models/Group.js';

import { globalLogger as logger } from '../../utils/logger.js';


const userCache = new Map();
const groupCache = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MONGODB_URI = "mongodb+srv://Vercel-Admin-soblend-redzmey-spaceworkflow:SOquhfF8HTxqFcTw@soblend-redzmey-spacewo.7aubqkc.mongodb.net/?retryWrites=true&w=majority";
class DatabaseService {
    constructor() {
        this.isConnected = false;
        this.localDB = null;
        this.localUsers = null;
        this.localGroups = null;
    }
    async load() {
        try {
            await mongoose.connect(MONGODB_URI, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                family: 4
            });
            this.isConnected = true;
            logger.info('𖤐 Conectado a MongoDB (Pool: 10 conexiones)');
            await this.checkAndMigrate();
            return this;
        } catch (error) {
            logger.error('𖤐 Error conectando a MongoDB:', error.message);
            throw error;
        }
    }
    async checkAndMigrate() {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            logger.info('𖤐 MongoDB vacía. Iniciando migración desde LocalDB...');
            await this.migrateData();
        }
    }
    async migrateData() {
        try {
            const dbPath = path.join(__dirname, '..', '..', 'data');
            this.localDB = new LocalDB(dbPath).db('bot');
            await this.localDB.load();
            this.localUsers = this.localDB.collection('users');
            this.localGroups = this.localDB.collection('groups');
            const users = this.localUsers.find() || [];
            const groups = this.localGroups.find() || [];
            logger.info(`✨ Migrando ${users.length} usuarios y ${groups.length} grupos...`);
            if (users.length > 0) {
                const validUsers = users.filter(u => u.id && !u.id.includes('undefined'));
                if (validUsers.length > 0) {
                    await User.insertMany(validUsers, { ordered: false }).catch(e => logger.warn('Partial user migration error:', e.message));
                }
            }
            if (groups.length > 0) {
                const validGroups = groups.filter(g => g.id);
                if (validGroups.length > 0) {
                    await Group.insertMany(validGroups, { ordered: false }).catch(e => logger.warn('Partial group migration error:', e.message));
                }
            }
            logger.info('✅ Migración completada.');
        } catch (error) {
            logger.error('⚠️ Error durante la migración:', error);
        }
    }
    async save() {
        return true;
    }
    async getUser(userId, aliasId = null) {
        const cached = userCache.get(userId);
        if (cached) return cached;
        let user = await User.findOne({ id: userId }).lean();
        if (!user && aliasId) {
            let aliasUser = await User.findOne({ id: aliasId });
            if (!aliasUser && aliasId.includes('@lid')) {
                const lidAsSwa = aliasId.replace('@lid', '@s.whatsapp.net');
                aliasUser = await User.findOne({ id: lidAsSwa });
            }
            if (aliasUser) {
                logger.info(`✨ Migrating user data from ${aliasUser.id} to ${userId}`);
                await User.deleteOne({ id: aliasUser.id });
                const userData = aliasUser.toObject();
                delete userData._id;
                delete userData.__v;
                userData.id = userId;
                user = await User.create(userData);
                userCache.set(userId, user);
                return user;
            }
        }
        if (!user) {
            user = await User.create({
                id: userId,
                economy: { coins: 0, bank: 0, lastDaily: 0, lastWork: 0, lastCrime: 0, lastSlut: 0 },
                gacha: { characters: [], lastClaim: 0, votes: {} },
                stats: { messages: 0, commands: 0 },
                level: { xp: 0, lvl: 1, lastXp: 0 },
                inventory: [],
                createdAt: Date.now(),
                monedas: 0,
                antirobo: 0,
                desbloqueo: 0
            });
        }
        userCache.set(userId, user);
        return user;
    }
    async updateUser(userId, updates) {
        userCache.delete(userId);
        const result = await User.findOneAndUpdate(
            { id: userId },
            { $set: updates },
            { upsert: true, new: true }
        ).lean();
        userCache.set(userId, result);
        return result;
    }
    async getUserEconomyRank(userId) {
        const user = await this.getUser(userId);
        if (!user) return -1;
        const totalCoins = (user.economy?.coins || 0) + (user.economy?.bank || 0);
        const rank = await User.countDocuments({
            $expr: {
                $gt: [
                    { $add: ['$economy.coins', '$economy.bank'] },
                    totalCoins
                ]
            }
        });
        return rank + 1;
    }
    async getLeaderboard(limit = 10) {
        return User.aggregate([
            { $addFields: { totalCoins: { $add: ['$economy.coins', '$economy.bank'] } } },
            { $sort: { totalCoins: -1 } },
            { $limit: limit }
        ]);
    }
    async getGroup(groupId) {
        const cached = groupCache.get(groupId);
        if (cached) return cached;
        let group = await Group.findOne({ id: groupId }).lean();
        if (!group) {
            group = await Group.create({
                id: groupId,
                settings: {
                    welcome: false,
                    goodbye: false,
                    antilink: false,
                    economy: true,
                    nsfw: false,
                    alerts: false
                },
                alerts: [],
                stats: { messages: 0 },
                primaryBot: null
            });
        }
        groupCache.set(groupId, group);
        return group;
    }
    async updateGroup(groupId, updates) {
        groupCache.delete(groupId);
        const result = await Group.findOneAndUpdate(
            { id: groupId },
            { $set: updates },
            { upsert: true, new: true }
        ).lean();
        groupCache.set(groupId, result);
        return result;
    }
    async getAllGroups() {
        return Group.find({}).lean();
    }
    async deleteUser(userId) {
        userCache.delete(userId);
        return User.deleteOne({ id: userId });
    }
    async deleteGroup(groupId) {
        groupCache.delete(groupId);
        return Group.deleteOne({ id: groupId });
    }
    async getCacheStats() {
        return {
            users: { size: userCache.size },
            groups: { size: groupCache.size }
        };
    }
    async getUserCount() {
        return User.countDocuments();
    }

    async getStats() {
        const [userCount, groupCount] = await Promise.all([
            User.countDocuments(),
            Group.countDocuments()
        ]);
        return { users: userCount, groups: groupCount };
    }
    async gracefulShutdown() {
        userCache.clear();
        groupCache.clear();
        await mongoose.disconnect();
        logger.info('𖤐 Desconectado de MongoDB');
    }

    markDirty() {
        // No-op for MongoDB adaptation
        return true;
    }

    async getTopUsers(limit = 10) {
        try {
            const users = await User.find({})
                .select('id name economy')
                .lean()
                .exec();

            // Calculate total and sort
            const usersWithTotal = users.map(user => {
                const coins = user.economy?.coins || 0;
                const bank = user.economy?.bank || 0;
                return {
                    id: user.id,
                    name: user.name || 'Usuario',
                    coins: coins,
                    bank: bank,
                    total: coins + bank
                };
            });

            // Sort by total descending
            usersWithTotal.sort((a, b) => b.total - a.total);

            // Return top N
            return usersWithTotal.slice(0, limit);
        } catch (error) {
            logger.error('[DatabaseService] Error getting top users:', error);
            return [];
        }
    }
}
export default DatabaseService;
