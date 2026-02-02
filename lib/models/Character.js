import mongoose from 'mongoose';

const CharacterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    owner: { type: String, default: null },
    claimedAt: { type: Number, default: 0 },
    transferredAt: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 }
}, { strict: false });

export default mongoose.model('Character', CharacterSchema);
