import mongoose from 'mongoose';
import User from '../src/models/User.js';
import fs from 'fs/promises';

const MONGODB_URI = "mongodb+srv://Vercel-Admin-soblend-redzmey-spaceworkflow:SOquhfF8HTxqFcTw@soblend-redzmey-spacewo.7aubqkc.mongodb.net/?retryWrites=true&w=majority";

async function dumpUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({}).lean();
        console.log(`📊 Found ${users.length} users`);

        await fs.writeFile('users_dump.json', JSON.stringify(users, null, 2));
        console.log('✅ Users dumped to users_dump.json');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected');
        process.exit(0);
    }
}

dumpUsers();
