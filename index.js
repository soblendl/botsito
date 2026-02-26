import { Bot } from './src/core/Bot.js';
import { globalLogger as logger } from './src/utils/logger.js';

process.on('uncaughtException', (err) =>
    logger.error('🔥 Uncaught Exception:', err)
);

process.on('unhandledRejection', (reason, promise) =>
    logger.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason)
);

const config = {
    uuid: '1f1332f4-7c2a-4b88-b4ca-bd56d07ed713',
    sessionsDir: 'sessions',
    ownerJid: '639972367773@s.whatsapp.net',
    prefix: '#',
};

const nodeRole = process.env.NODE_ROLE || 'main';
const bot = new Bot(config);

if (nodeRole === 'worker') {
    logger.info('✿ Kaoruko Bot - Modo WORKER');
    await bot.initializeWorker();
    logger.info('✿ Worker iniciado exitosamente');
} else {
    logger.info('✿ Kaoruko Bot - Iniciando...');
    await bot.initialize();
    await bot.start();

    try {
        const { CLUSTER_CONFIG } = await import('./src/config/nodes.js');
        const { WorkerServer } = await import('./src/services/cluster/WorkerServer.js');
        const worker = new WorkerServer();
        await worker.start(CLUSTER_CONFIG.port);
    } catch (e) {
        logger.warn('⚠ WorkerServer not started on main:', e);
    }

    try {
        const { NodeManager } = await import('./src/services/cluster/NodeManager.js');
        const nodeManager = new NodeManager();
        global.nodeManager = nodeManager;
        nodeManager.start();
        logger.info('✿ NodeManager iniciado');
    } catch (e) {
        logger.warn('⚠ NodeManager not started:', e);
    }

    logger.info('✿ Bot iniciado exitosamente');
}