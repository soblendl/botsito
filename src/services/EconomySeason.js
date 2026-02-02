import { globalLogger as logger } from '../utils/logger.js';

export class EconomySeason {
    constructor(dbService) {
        this.dbService = dbService;
        this.currentSeason = null;
        this.loadCurrentSeason();
    }

    loadCurrentSeason() {
        this.currentSeason = this.dbService.getCurrentSeason();
        if (!this.currentSeason) {
            this.createDefaultSeason();
        }
    }

    createDefaultSeason() {
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        this.currentSeason = this.dbService.createSeason(
            `Temporada ${now.getMonth() + 1}/${now.getFullYear()}`,
            now.getTime(),
            endDate.getTime(),
            {
                top1: { coins: 100000, badge: '🏆' },
                top2: { coins: 75000, badge: '🥈' },
                top3: { coins: 50000, badge: '🥉' },
                top10: { coins: 25000, badge: '⭐' }
            }
        );
        logger.info(`ִ𖤐 Nueva temporada creada: ${this.currentSeason.name}`);
    }

    async getSeasonLeaderboard(limit = 50) {
        if (!this.currentSeason) return [];
        return await this.dbService.getLeaderboard(this.currentSeason.name, limit);
    }

    async getUserRank(userId) {
        const leaderboard = await this.getSeasonLeaderboard(1000);
        const userIndex = leaderboard.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return {
                rank: null,
                total: leaderboard.length,
                percentile: 0
            };
        }

        return {
            rank: userIndex + 1,
            total: leaderboard.length,
            percentile: ((leaderboard.length - userIndex) / leaderboard.length * 100).toFixed(1)
        };
    }

    async endSeason() {
        if (!this.currentSeason) return null;

        const leaderboard = await this.getSeasonLeaderboard(100);
        const rewards = this.currentSeason.rewards;
        const results = {
            season: this.currentSeason.name,
            endDate: Date.now(),
            winners: []
        };

        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            let reward = null;

            if (i === 0 && rewards.top1) {
                reward = rewards.top1;
            } else if (i === 1 && rewards.top2) {
                reward = rewards.top2;
            } else if (i === 2 && rewards.top3) {
                reward = rewards.top3;
            } else if (i < 10 && rewards.top10) {
                reward = rewards.top10;
            }

            if (reward) {
                const userData = await this.dbService.getUser(user.id);
                userData.economy.coins += reward.coins;

                if (!userData.badges) userData.badges = [];
                userData.badges.push({
                    season: this.currentSeason.name,
                    rank: i + 1,
                    badge: reward.badge
                });

                this.dbService.updateUser(user.id, userData);
                results.winners.push({
                    userId: user.id,
                    rank: i + 1,
                    reward
                });
            }
        }

        this.currentSeason.active = false;
        this.createDefaultSeason();
        return results;
    }

    getTimeRemaining() {
        if (!this.currentSeason) return null;

        const now = Date.now();
        const end = this.currentSeason.endDate;
        const remaining = end - now;

        if (remaining <= 0) {
            return { expired: true };
        }

        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return {
            expired: false,
            days,
            hours,
            total: remaining
        };
    }

    async getSeasonStats() {
        if (!this.currentSeason) return null;

        const leaderboard = await this.getSeasonLeaderboard(1000);
        const totalCoins = leaderboard.reduce((sum, u) => sum + u.coins, 0);

        return {
            name: this.currentSeason.name,
            startDate: this.currentSeason.startDate,
            endDate: this.currentSeason.endDate,
            participants: leaderboard.length,
            totalCoins,
            averageCoins: Math.floor(totalCoins / leaderboard.length),
            timeRemaining: this.getTimeRemaining()
        };
    }
}
