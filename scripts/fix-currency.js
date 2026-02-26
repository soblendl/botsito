// Script temporal para limpiar el caché del grupo
// Ejecuta esto y luego reinicia el bot

import mongoose from 'mongoose';
import Group from '../src/models/Group.js';

const MONGODB_URI = "mongodb+srv://Vercel-Admin-soblend-redzmey-spaceworkflow:SOquhfF8HTxqFcTw@soblend-redzmey-spacewo.7aubqkc.mongodb.net/?retryWrites=true&w=majority";

async function fixCurrency() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado\n');

        // Actualizar TODOS los grupos que no tienen currencyName
        const result = await Group.updateMany(
            { 'settings.currencyName': { $exists: false } },
            { $set: { 'settings.currencyName': 'coins' } }
        );

        console.log(`✅ Grupos actualizados: ${result.modifiedCount}`);

        // Mostrar todos los grupos con su currency
        const groups = await Group.find({});
        console.log(`\n📊 Total grupos: ${groups.length}\n`);

        for (const group of groups) {
            console.log(`📂 ${group.id}`);
            console.log(`   💰 ${group.settings?.currencyName || 'NO CONFIGURADO'}\n`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado');
        process.exit(0);
    }
}

fixCurrency();
