import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://Vercel-Admin-soblend-redzmey-spaceworkflow:SOquhfF8HTxqFcTw@soblend-redzmey-spacewo.7aubqkc.mongodb.net/?retryWrites=true&w=majority";

async function getDatabaseSize() {
    try {
        console.log('🔌 Conectando a MongoDB...\n');

        await mongoose.connect(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        });

        console.log('✅ Conectado exitosamente\n');

        // Obtener estadísticas de la base de datos
        const db = mongoose.connection.db;
        const adminDb = db.admin();

        // Función para formatear bytes a formato legible
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
        };

        // Obtener estadísticas usando dbStats
        const stats = await db.command({ dbStats: 1 });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ESTADÍSTICAS DE LA BASE DE DATOS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log(`📁 Nombre de la BD:        ${stats.db}`);
        console.log(`📦 Colecciones:            ${stats.collections}`);
        console.log(`📄 Documentos totales:     ${stats.objects.toLocaleString()}`);
        console.log(`📊 Índices:                ${stats.indexes}`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💾 TAMAÑO DE ALMACENAMIENTO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log(`📏 Tamaño de datos:          ${formatBytes(stats.dataSize)}`);
        console.log(`💿 Tamaño de almacenamiento: ${formatBytes(stats.storageSize)}`);
        console.log(`🗂️  Tamaño de índices:        ${formatBytes(stats.indexSize)}`);
        console.log(`📦 Tamaño total (datos+índices): ${formatBytes(stats.dataSize + stats.indexSize)}`);
        console.log(`🎯 Tamaño total en disco:    ${formatBytes(stats.storageSize + stats.indexSize)}`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 DETALLES POR COLECCIÓN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Obtener lista de colecciones
        const collections = await db.listCollections().toArray();

        let totalDocs = 0;
        let totalSize = 0;

        for (const collection of collections) {
            const collName = collection.name;

            try {
                const collStats = await db.command({ collStats: collName });
                totalDocs += collStats.count;
                totalSize += collStats.size;

                console.log(`📂 ${collName}:`);
                console.log(`   • Documentos: ${collStats.count.toLocaleString()}`);
                console.log(`   • Tamaño: ${formatBytes(collStats.size)}`);
                console.log(`   • Tamaño almacenamiento: ${formatBytes(collStats.storageSize)}`);
                console.log(`   • Índices: ${formatBytes(collStats.totalIndexSize)}`);
                console.log(`   • Tamaño promedio doc: ${formatBytes(collStats.avgObjSize || 0)}`);
                console.log('');
            } catch (err) {
                console.log(`📂 ${collName}: (Error obteniendo stats)`);
                console.log('');
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 RESUMEN FINAL');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(`🎯 TAMAÑO TOTAL DE LA BASE DE DATOS: ${formatBytes(stats.storageSize + stats.indexSize)}`);
        console.log(`📄 Total de documentos: ${totalDocs.toLocaleString()}`);
        console.log(`📦 Total de colecciones: ${collections.length}`);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar el script
getDatabaseSize();
