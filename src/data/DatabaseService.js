import { LocalDB } from '@imjxsx/localdb';
import path from 'path';
import { fileURLToPath } from 'url';
import WorkerManager from './WorkerManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class DatabaseService {
    constructor() {
        this.localDB = null;
        this.db = null;
        this.users = null;
        this.groups = null;
        this.isDirty = false;
        this.saveInterval = null;
        this.workerManager = new WorkerManager();
        this.dbWorker = null;
    }
    async load() {
        try {
            const dbPath = path.join(__dirname, '..', 'database');
            this.localDB = new LocalDB(dbPath).db('bot');
            await this.localDB.load();
            this.users = this.localDB.collection('users');
            this.groups = this.localDB.collection('groups');
            this.db = this.localDB;
            this.dbWorker = this.workerManager.getWorker('db', 'workers/dbWorker.js');
            console.log('𖤐 Base de datos cargada');
            this.startAutoSave();
            return this.db;
        } catch (error) {
            console.error('𖤐 Error cargando base de datos:', error.message);
            throw error;
        }
    }
    async save() {
        if (!this.dbWorker) return;
        try {
            const collections = {
                users: this.users.find(),
                groups: this.groups.find()
            };
            const dbPath = path.join(__dirname, '..', 'database');
            this.dbWorker.postMessage({
                type: 'save',
                id: Date.now(),
                data: {
                    dbPath,
                    collections
                }
            });
            this.isDirty = false;
        } catch (error) {
            console.error('𖤐 Error enviando datos al worker:', error.message);
        }
    }
    saveSync() {
        console.log('𖤐 Guardado síncrono no soportado por LocalDB (se confía en auto-save)');
    }
    startAutoSave() {
        this.saveInterval = setInterval(async () => {
            if (this.isDirty) {
                await this.save();
            }
        }, 10000);
    }
    markDirty() {
        this.isDirty = true;
    }
    getUser(userId, aliasId = null) {
        let user = this.users.findOne({ id: userId });
        if (!user && aliasId) {
            let aliasUser = this.users.findOne({ id: aliasId });
            if (!aliasUser && aliasId.includes('@lid')) {
                const lidAsSwa = aliasId.replace('@lid', '@s.whatsapp.net');
                aliasUser = this.users.findOne({ id: lidAsSwa });
            }
            if (aliasUser) {
                console.log(`✨ Migrating user data from ${aliasUser.id} to ${userId}`);
                this.users.deleteOne({ id: aliasUser.id });
                user = { ...aliasUser, id: userId };
                if (user.$set) {
                    console.log(`🔧 Fixing corrupted data for ${userId}`);
                    const applyNested = (obj, key, val) => {
                        if (key.includes('.')) {
                            const parts = key.split('.');
                            let current = obj;
                            for (let i = 0; i < parts.length - 1; i++) {
                                if (!current[parts[i]]) current[parts[i]] = {};
                                current = current[parts[i]];
                            }
                            current[parts[parts.length - 1]] = val;
                        } else {
                            obj[key] = val;
                        }
                    };
                    for (const [key, val] of Object.entries(user.$set)) {
                        applyNested(user, key, val);
                    }
                    delete user.$set;
                }
                this.users.insertOne(user);
                this.markDirty();
                return user;
            }
        }
        if (!user) {
            user = {
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
            };
            this.users.insertOne(user);
            this.markDirty();
        } else {
            if (user.$set) {
                console.log(`🔧 Fixing corrupted data for existing user ${userId}`);
                const applyNested = (obj, key, val) => {
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = obj;
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) current[parts[i]] = {};
                            current = current[parts[i]];
                        }
                        current[parts[parts.length - 1]] = val;
                    } else {
                        obj[key] = val;
                    }
                };
                for (const [key, val] of Object.entries(user.$set)) {
                    applyNested(user, key, val);
                }
                delete user.$set;
                this.users.updateOne({ id: userId }, user); 
                this.markDirty();
            }
        }
        return user;
    }
    updateUser(userId, updates) {
        const user = this.getUser(userId);
        for (const [key, value] of Object.entries(updates)) {
            if (key.includes('.')) {
                const parts = key.split('.');
                let current = user;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            } else {
                user[key] = value;
            }
        }
        const result = this.users.updateOne(
            { id: userId },
            { $set: user }
        );
        if (result) {
            this.markDirty();
            console.log(`✅ User ${userId} updated. New Balance: ${user.economy?.coins}`);
        } else {
            console.log(`⚠️ Failed to update user ${userId}`);
        }
        return result;
    }
    getUserCount() {
        return this.users.count ? this.users.count() : (this.users.find ? this.users.find().length : 0);
    }
    getGroup(groupId) {
        let group = this.groups.findOne({ id: groupId });
        if (!group) {
            group = {
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
            };
            this.groups.insertOne(group);
            this.markDirty();
        } else {
            let changed = false;
            if (group.settings.goodbye === undefined) {
                group.settings.goodbye = false;
                changed = true;
            }
            if (changed) {
                this.groups.updateOne({ id: groupId }, { $set: group });
                this.markDirty();
            }
        }
        return group;
    }
    updateGroup(groupId, updates) {
        const group = this.getGroup(groupId);
        for (const [key, value] of Object.entries(updates)) {
            if (key.includes('.')) {
                const parts = key.split('.');
                let current = group;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            } else {
                group[key] = value;
            }
        }
        const result = this.groups.updateOne(
            { id: groupId },
            { $set: group }
        );
        if (result) {
            this.markDirty();
        } else {
            console.log(`⚠️ Failed to update group ${groupId}`);
        }
        return result;
    }
    async gracefulShutdown() {
        console.log('𖤐 Cerrando bot...');
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        await this.save();
        console.log('𖤐 Base de datos guardada');
    }
}
export default DatabaseService;
