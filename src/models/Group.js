import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    settings: {
        welcome: { type: Boolean, default: false },
        goodbye: { type: Boolean, default: false },
        antilink: { type: Boolean, default: false },
        economy: { type: Boolean, default: true },
        nsfw: { type: Boolean, default: false },
        alerts: { type: Boolean, default: false },
        currencyName: { type: String, default: 'coins' }
    },
    alerts: { type: Array, default: [] },
    stats: {
        messages: { type: Number, default: 0 }
    },
    primaryBot: { type: String, default: null }
}, { strict: false });
GroupSchema.index({ 'settings.welcome': 1 });
GroupSchema.index({ 'settings.alerts': 1 });
export default mongoose.models.Group || mongoose.model('Group', GroupSchema);