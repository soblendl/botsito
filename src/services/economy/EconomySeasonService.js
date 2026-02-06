import { DATA_PATHS } from '../../config/data.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { globalLogger as logger } from '../../utils/logger.js';

export class EconomySeasonService {
    constructor(dbService) {
        this.dbService = dbService;
        this.seasonPath = DATA_PATHS.SEASON || 'src/data/season.json';
        this.seasonData = {
            name: 'Temporada Beta',
            active: true,
            startDate: Date.now(),
            endDate: Date.now() + (30 * 24 * 60 * 60 * 1000), 
            participants: []
        };
    }

    async load() {
        try {
            if (existsSync(this.seasonPath)) {
                const data = await fs.readFile(this.seasonPath, 'utf8');
                this.seasonData = JSON.parse(data);
            } else {
                await this.save();
            }
            logger.info('ꕣ EconomySeasonService cargado');
        } catch (error) {
            logger.error('Error loading season data:', error);
        }
    }

    async save() {
        try {
            await fs.writeFile(this.seasonPath, JSON.stringify(this.seasonData, null, 2));
        } catch (error) {
            logger.error('Error saving season data:', error);
        }
    }

    async getSeasonLeaderboard(limit = 10) {
        
        
        const users = await this.dbService.getAllUsers();
        return users
            .sort((a, b) => (b.economy?.coins || 0) - (a.economy?.coins || 0))
            .slice(0, limit)
            .map(u => ({
                id: u.id,
                coins: u.economy?.coins || 0
            }));
    }

    async getUserRank(userId) {
        const users = await this.dbService.getAllUsers();
        const sorted = users.sort((a, b) => (b.economy?.coins || 0) - (a.economy?.coins || 0));
        const index = sorted.findIndex(u => u.id === userId);

        if (index === -1) return { rank: null, percentile: null };

        const rank = index + 1;
        const percentile = Math.floor((rank / users.length) * 100);
        return { rank, percentile };
    }

    async getSeasonStats() {
        const now = Date.now();
        const timeLeft = Math.max(0, this.seasonData.endDate - now);

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        const users = await this.dbService.getAllUsers();
        const totalCoins = users.reduce((acc, u) => acc + (u.economy?.coins || 0), 0);
        const activeParticipants = users.filter(u => (u.economy?.coins || 0) > 0).length;

        return {
            name: this.seasonData.name,
            timeRemaining: {
                expired: timeLeft === 0,
                days,
                hours
            },
            participants: activeParticipants,
            totalCoins,
            averageCoins: activeParticipants > 0 ? Math.floor(totalCoins / activeParticipants) : 0
        };
    }
}
