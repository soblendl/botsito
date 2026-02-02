import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { LocalDB } from '@imjxsx/localdb'; // Keep for migration
import User from '../lib/models/User.js';
import Group from '../lib/models/Group.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = "mongodb+srv://Vercel-Admin-soblend-redzmey-spaceworkflow:SOquhfF8HTxqFcTw@soblend-redzmey-spacewo.7aubqkc.mongodb.net/?retryWrites=true&w=majority";

class DatabaseService {
    constructor() {
        this.isConnected = false;
        // Keep these for migration purposes
        this.localDB = null; 
        this.localUsers = null;
        this.localGroups = null;
    }

    async load() {
        try {
            // Connect to MongoDB
            await mongoose.connect(MONGODB_URI);
            this.isConnected = true;
            console.log('𖤐 Conectado a MongoDB');

            // Check if migration is needed (if MongoDB is empty but LocalDB exists)
            await this.checkAndMigrate();

            return this;
        } catch (error) {
            console.error('𖤐 Error conectando a MongoDB:', error.message);
            throw error;
        }
    }

    async checkAndMigrate() {
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log('𖤐 MongoDB vacía. Iniciando migración desde LocalDB...');
            await this.migrateData();
        }
    }

    async migrateData() {
        try {
            const dbPath = path.join(__dirname, '..', 'database');
            this.localDB = new LocalDB(dbPath).db('bot');
            await this.localDB.load();
            this.localUsers = this.localDB.collection('users');
            this.localGroups = this.localDB.collection('groups');

            const users = this.localUsers.find() || [];
            const groups = this.localGroups.find() || [];

            console.log(`✨ Migrando ${users.length} usuarios y ${groups.length} grupos...`);

            if (users.length > 0) {
                // Bulk insert users
                // Filter out invalid entries if any
                const validUsers = users.filter(u => u.id && !u.id.includes('undefined'));
                if (validUsers.length > 0) {
                     // Use insertMany with ordered: false to continue if duplicates exist
                    await User.insertMany(validUsers, { ordered: false }).catch(e => console.log('Partial user migration error:', e.message));
                }
            }

            if (groups.length > 0) {
                // Bulk insert groups
                const validGroups = groups.filter(g => g.id);
                if (validGroups.length > 0) {
                     await Group.insertMany(validGroups, { ordered: false }).catch(e => console.log('Partial group migration error:', e.message));
                }
            }

            console.log('✅ Migración completada.');
        } catch (error) {
            console.error('⚠️ Error durante la migración:', error);
        }
    }

    async save() {
        // No-op for MongoDB as it saves immediately
        return true;
    }

    async getUser(userId, aliasId = null) {
        let user = await User.findOne({ id: userId });

        // Migration from alias (LID) logic
        if (!user && aliasId) {
            let aliasUser = await User.findOne({ id: aliasId });
            
            // Try correcting domain if not found
             if (!aliasUser && aliasId.includes('@lid')) {
                const lidAsSwa = aliasId.replace('@lid', '@s.whatsapp.net');
                aliasUser = await User.findOne({ id: lidAsSwa });
            }

            if (aliasUser) {
                console.log(`✨ Migrating user data from ${aliasUser.id} to ${userId}`);
                await User.deleteOne({ id: aliasUser.id });
                
                // Create new user with old data
                const userData = aliasUser.toObject();
                delete userData._id;
                delete userData.__v;
                userData.id = userId;
                
                user = await User.create(userData);
                return user;
            }
        }

        if (!user) {
            user = await User.create({
                id: userId,
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
                level: {
                    xp: 0,
                    lvl: 1,
                    lastXp: 0
                },
                inventory: [],
                createdAt: Date.now(),
                monedas: 0,
                antirobo: 0,
                desbloqueo: 0
            });
        }
        return user;
    }

    async updateUser(userId, updates) {
        // console.log(`🔧 Updating user ${userId}:`, updates);
        
        // MongoDB handles dot notation in updates automatically if passed correctly,
        // but often we pass objects. Flattening might be needed if updates is a nested partial.
        // For simplicity and safety with existing code style, we can use $set.
        
        // If updates contains dot notation keys (e.g. 'economy.coins'), Mongoose handles it.
        // If it contains nested objects that should be merged, we might need to be careful not to overwrite.
        // However, looking at previous code, it manually applied updates.
        // Mongoose set options: { new: true } returns the updated doc.

        try {
            const result = await User.findOneAndUpdate(
                { id: userId },
                { $set: updates },
                { new: true, upsert: true } // upsert just in case
            );
            return result;
        } catch (error) {
            console.error(`⚠️ Failed to update user ${userId}:`, error.message);
            return null;
        }
    }

    async getUserCount() {
        return await User.countDocuments();
    }

    async getGroup(groupId) {
        let group = await Group.findOne({ id: groupId });

        if (!group) {
            group = await Group.create({
                id: groupId,
                settings: {
                    welcome: false,
                    goodbye: false,
                    antilink: false,
                    economy: true,
                    nsfw: false
                },
                alerts: [],
                stats: {
                    messages: 0
                }
            });
        }
        return group;
    }

    async updateGroup(groupId, updates) {
         try {
            const result = await Group.findOneAndUpdate(
                { id: groupId },
                { $set: updates },
                { new: true, upsert: true }
            );
            return result;
        } catch (error) {
            console.error(`⚠️ Failed to update group ${groupId}:`, error.message);
            return null;
        }
    }

    async getTopUsers(limit = 10) {
        try {
            // Fetch users sorted by total wealth (coins + bank)
            // Note: MongoDB aggregation might be better for summing, but JS sort is fine for small/medium datasets.
            // For better performance with large datasets, use:
            // return await User.aggregate([
            //   { $addFields: { total: { $add: ["$economy.coins", "$economy.bank"] } } },
            //   { $sort: { total: -1 } },
            //   { $limit: limit }
            // ]);
            
            // Simple JS approach for now to match logic:
            const users = await User.find({});
            return users
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    coins: u.economy?.coins || 0,
                    bank: u.economy?.bank || 0,
                    total: (u.economy?.coins || 0) + (u.economy?.bank || 0)
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top users:', error);
            return [];
        }
    }

    async getUsersByIds(ids) {
        try {
            const users = await User.find({ id: { $in: ids } });
            return users;
        } catch (error) {
            console.error('Error getting users by ids:', error);
            return [];
        }
    }

    async getUserEconomyRank(userId) {
        try {
            // Simple JS approach: fetch all, sort, find index
            // Ideally use aggregation $rank with window fields in newer Mongo versions, 
            // or count documents with greater wealth.
            
            const users = await User.find({}, { id: 1, economy: 1 }); // Projection to save memory
            
            const sorted = users
                .map(u => ({
                    id: u.id,
                    total: (u.economy?.coins || 0) + (u.economy?.bank || 0)
                }))
                .sort((a, b) => b.total - a.total);

            const rank = sorted.findIndex(u => u.id === userId) + 1;
            return rank > 0 ? rank : sorted.length + 1; // Fallback
        } catch (error) {
            console.error('Error getting user rank:', error);
            return 0;
        }
    }

    markDirty() {
        // No-op for MongoDB
    }

    async gracefulShutdown() {
        console.log('𖤐 Cerrando conexión a MongoDB...');
        await mongoose.connection.close();
        console.log('𖤐 MongoDB desconectado');
    }
}

export default DatabaseService;