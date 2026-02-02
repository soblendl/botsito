import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    economy: {
        coins: { type: Number, default: 0 },
        bank: { type: Number, default: 0 },
        lastDaily: { type: Number, default: 0 },
        lastWork: { type: Number, default: 0 },
        lastCrime: { type: Number, default: 0 },
        lastSlut: { type: Number, default: 0 }
    },
    gacha: {
        characters: { type: Array, default: [] },
        lastClaim: { type: Number, default: 0 },
        votes: { type: Object, default: {} },
        rolled: { type: String, default: null },
        lastRoll: { type: Number, default: 0 }
    },
    stats: {
        messages: { type: Number, default: 0 },
        commands: { type: Number, default: 0 }
    },
    level: {
        xp: { type: Number, default: 0 },
        lvl: { type: Number, default: 1 },
        lastXp: { type: Number, default: 0 }
    },
    inventory: { type: Array, default: [] },
    createdAt: { type: Number, default: Date.now },
    monedas: { type: Number, default: 0 },
    antirobo: { type: Number, default: 0 },
    desbloqueo: { type: Number, default: 0 }
}, { strict: false });

// Índices para mejor rendimiento
UserSchema.index({ id: 1 }, { unique: true });
UserSchema.index({ 'economy.coins': -1 });
UserSchema.index({ 'economy.bank': -1 });
UserSchema.index({ 'level.xp': -1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);