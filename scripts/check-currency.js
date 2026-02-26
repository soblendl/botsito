import mongoose from 'mongoose';
import Group from './src/models/Group.js';

const MONGODB_URI = "mongodb+srv://Vercel-Admin-soblend-redzmey-spaceworkflow:SOquhfF8HTxqFcTw@soblend-redzmey-spacewo.7aubqkc.mongodb.net/?retryWrites=true&w=majority";

async function checkCurrency() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar todos los grupos con currencyName configurado
        const groups = await Group.find({ 'settings.currencyName': { $exists: true } });

        console.log(`📊 Grupos con currencyName configurado: ${groups.length}\n`);

        for (const group of groups) {
            console.log(`📂 Grupo: ${group.id}`);
            console.log(`   💰 Moneda: ${group.settings.currencyName || 'coins (default)'}`);
            console.log('');
        }

        // Mostrar todos los grupos
        const allGroups = await Group.find({});
        console.log(`\n📊 Total de grupos en BD: ${allGroups.length}\n`);

        for (const group of allGroups) {
            console.log(`📂 ${group.id} → ${group.settings?.currencyName || 'coins (default)'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado');
        process.exit(0);
    }
}

checkCurrency();
