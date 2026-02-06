import { Bot as WapiBot, LocalAuth } from '@imjxsx/wapi';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import { PluginLoader } from './PluginLoader.js';
import DatabaseService from '../services/database/DatabaseService.js';
import GachaService from '../services/gacha/GachaService.js';


import CacheManager from '../utils/CacheManager.js';
import TokenService from '../services/auth/TokenService.js';
import PrembotManager from '../services/auth/PrembotManager.js';
import { ShopService } from '../services/economy/ShopService.js';
import { LevelService } from '../services/economy/LevelService.js';
import { EconomySeasonService } from '../services/economy/EconomySeasonService.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { WelcomeHandler } from '../handlers/WelcomeHandler.js';
import { AlertHandler } from '../handlers/AlertHandler.js';

import memoryManager from '../utils/MemoryManager.js';
import { jadibotManager } from '../services/external/jadibot.js';
import * as SafeDownloader from '../services/media/SafeDownloader.js';
import { globalLogger as logger } from '../utils/logger.js';
import { clearPermissionCache } from '../utils/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Bot {
    constructor(config = {}) {
        this.config = {
            uuid: config.uuid || '1f1332f4-7c2a-4b88-b4ca-bd56d07ed713',
            sessionsDir: config.sessionsDir || 'sessions',
            commandsDir: config.commandsDir || path.join(__dirname, '..', 'commands'),
            ownerJid: config.ownerJid || '639972367773@s.whatsapp.net',
            prefix: config.prefix || '#',
            ...config
        };
        this.services = {};
        this.bot = null;
        this.pluginLoader = new PluginLoader();
        this.logger = { level: 'info' };
    }

    async initializeServices() {
        logger.info('ꕢ Inicializando servicios...');
        this.services.dbService = new DatabaseService();
        this.services.gachaService = new GachaService();

        this.services.cacheManager = new CacheManager();
        this.services.tokenService = new TokenService();
        this.services.prembotManager = new PrembotManager(this.services.tokenService);
        this.services.shopService = new ShopService(this.services.dbService);
        this.services.levelService = new LevelService(this.services.dbService);
        this.services.economySeasonService = new EconomySeasonService(this.services.dbService);

        global.db = await this.services.dbService.load();

        Object.assign(global, {
            dbService: this.services.dbService,
            gachaService: this.services.gachaService,

            cacheManager: this.services.cacheManager,
            tokenService: this.services.tokenService,
            prembotManager: this.services.prembotManager,
            shopService: this.services.shopService,
            levelService: this.services.levelService,
            economySeasonService: this.services.economySeasonService,
            memoryManager: memoryManager,
            SafeDownloader: SafeDownloader
        });

        memoryManager.on('critical', () => {
            logger.warn('✿ [System] Memoria crítica detectada - Purgando archivos temporales');
            SafeDownloader.purgeAllTempFiles();
        });

        memoryManager.on('cleanup', () => {
            SafeDownloader.cleanupTempFiles();
        });

        SafeDownloader.purgeAllTempFiles();

        logger.info('ꕢ Loading GachaService...');
        await this.services.gachaService.load();
        logger.info('ꕣ GachaService loaded');

        logger.info('ꕢ Loading TokenService...');
        await this.services.tokenService.load();
        logger.info('ꕣ TokenService loaded');

        logger.info('ꕣ Servicios inicializados');
    }

    async loadCommands() {
        const { commandMap, beforeHandlers } = await this.pluginLoader.loadCommands(this.config.commandsDir);
        global.commandMap = commandMap;
        global.beforeHandlers = beforeHandlers;
        return { commandMap, beforeHandlers };
    }

    async initializeBot() {
        logger.info('ꕢ Inicializando bot de WhatsApp...');
        const auth = new LocalAuth(this.config.uuid, this.config.sessionsDir);
        const account = { jid: '', pn: '', name: '' };

        this.bot = new WapiBot(this.config.uuid, auth, account);

        this.bot.logger.level = this.logger.level || 'error';

        const messageHandler = new MessageHandler(
            this.services.dbService,
            this.services.gachaService,
            null,
            null,
            this.services.cacheManager,
            this.services.shopService,
            this.services.levelService,
            this.services.economySeasonService
        );

        const welcomeHandler = new WelcomeHandler(this.services.dbService);
        const alertHandler = new AlertHandler(this.services.dbService);

        global.messageHandler = messageHandler;
        this.setupEventHandlers(messageHandler, welcomeHandler, alertHandler);
        logger.info('ꕣ Bot inicializado');
    }

    setupEventHandlers(messageHandler, welcomeHandler, alertHandler) {
        this.bot.on('qr', async (qr) => {
            logger.info('\n∘ Escanea este código QR con WhatsApp\n');
            const qrString = await QRCode.toString(qr, { type: 'terminal', small: true });
            console.log(qrString);
        });

        this.bot.on('open', (account) => {
            logger.info('✿ EVENTO OPEN DISPARADO!');
            logger.info('✿ Conexión exitosa!');
            logger.info(`✿ Bot conectado » ${account.name || 'Shoko Nishimiya'}`);
            logger.info('✿ Iniciando subbots y prembots guardados...');

            this.services.prembotManager.loadSessions(this.bot).catch(e =>
                logger.error('Error loading prembots:', e)
            );
            jadibotManager.loadSessions(this.bot).catch(e =>
                logger.error('Error loading subbots:', e)
            );

            this.bot.ws.ev.on('messages.upsert', ({ messages, type }) => {
                logger.info(`📨 Mensaje recibido (upsert): ${type} ${messages.length}`);
                for (const m of messages) {
                    messageHandler.handleMessage(this.bot, m).catch(err => {
                        logger.error('Error processing message:', err);
                    });
                }
            });

            this.bot.ws.ev.on('group-participants.update', (event) => {
                // Clear permission cache to prevent stale admin status
                clearPermissionCache(event.id);

                welcomeHandler.handle(this.bot, event).catch(err => {
                    logger.error('Error in welcome handler:', err);
                });
                alertHandler.handle(this.bot, event).catch(err => {
                    logger.error('Error in alert handler:', err);
                });
            });
        });

        this.bot.on('close', (reason) => {
            logger.info(`ꕢ Conexión cerrada: ${reason}`);
        });

        this.bot.on('error', (err) => {
            logger.error('ꕢ Error del bot:', err);
        });
    }

    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger.info(`\n${signal} recibido. Cerrando gracefully...`);
            memoryManager.stop();
            SafeDownloader.cleanupTempFiles();
            await this.services.dbService.gracefulShutdown();
            await this.services.gachaService.gracefulShutdown();
            await this.services.tokenService.gracefulShutdown();
            process.exit(0);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        process.on('uncaughtException', async (err) => {
            logger.error('ꕢ Uncaught Exception:', err);
            if (err.code === 'ENOSPC' || err.message?.includes('ENOSPC')) {
                logger.warn('» ENOSPC detectado - Purgando temporales...');
                SafeDownloader.purgeAllTempFiles();
                memoryManager?.forceCleanup();
            }
        });

        process.on('unhandledRejection', async (reason, promise) => {
            logger.error('ꕢ Unhandled Rejection at:', promise, 'reason:', reason);
            if (reason?.code === 'ENOSPC' || reason?.message?.includes('ENOSPC')) {
                logger.warn('» ENOSPC detectado - Purgando temporales...');
                SafeDownloader.purgeAllTempFiles();
                memoryManager?.forceCleanup();
            }
        });
    }

    async start() {
        logger.info('✿ Iniciando bot con @imjxsx/wapi...');
        await this.bot.login('qr');

    }

    async initialize() {
        await this.initializeServices();
        await this.loadCommands();
        await this.initializeBot();
        this.setupGracefulShutdown();
    }
}
