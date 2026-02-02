export class PluginMarketplace {
    constructor(dbService) {
        this.dbService = dbService;
        this.revenueShare = 0.7;
    }
    async publishPlugin(authorId, pluginData) {
        const { name, description, code, price = 0 } = pluginData;
        if (!this.dbService.db.plugins) {
            this.dbService.db.plugins = {};
        }
        const existingPlugin = Object.values(this.dbService.db.plugins)
            .find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existingPlugin) {
            throw new Error('ִ𖤐 Ya existe un plugin con ese nombre');
        }
        const pluginId = Date.now() + Math.random();
        const plugin = {
            id: pluginId,
            name,
            description,
            authorId,
            price,
            code,
            downloads: 0,
            rating: 0,
            ratings: [],
            enabled: true,
            createdAt: Date.now(),
            revenue: 0
        };
        this.dbService.db.plugins[pluginId] = plugin;
        this.dbService.markDirty();
        return {
            success: true,
            pluginId,
            message: 'ִ𖤐 Plugin publicado exitosamente en el marketplace'
        };
    }
    async purchasePlugin(userId, pluginId) {
        const plugin = this.dbService.db.plugins[pluginId];
        if (!plugin || !plugin.enabled) {
            throw new Error('ִ𖤐 Plugin no encontrado o no disponible');
        }
        const user = await this.dbService.getUser(userId);
        if (user.economy.coins < plugin.price) {
            throw new Error(`ִ𖤐 Necesitas ${plugin.price} monedas. Tienes ${user.economy.coins}`);
        }
        if (!user.purchasedPlugins) {
            user.purchasedPlugins = [];
        }
        if (user.purchasedPlugins.includes(pluginId)) {
            throw new Error('ִ𖤐 Ya has comprado este plugin');
        }
        user.economy.coins -= plugin.price;
        user.purchasedPlugins.push(pluginId);
        this.dbService.updateUser(userId, user);
        plugin.downloads++;
        const authorRevenue = Math.floor(plugin.price * this.revenueShare);
        plugin.revenue += authorRevenue;
        const author = await this.dbService.getUser(plugin.authorId);
        author.economy.coins += authorRevenue;
        this.dbService.updateUser(plugin.authorId, author);
        await this.dbService.addTransaction(
            userId,
            'plugin_purchase',
            -plugin.price,
            `Compra de plugin: ${plugin.name}`
        );
        await this.dbService.addTransaction(
            plugin.authorId,
            'plugin_revenue',
            authorRevenue,
            `Venta de plugin: ${plugin.name}`
        );
        this.dbService.markDirty();
        return {
            success: true,
            plugin: {
                id: plugin.id,
                name: plugin.name,
                description: plugin.description
            },
            message: `Plugin "${plugin.name}" comprado exitosamente`
        };
    }
    async ratePlugin(userId, pluginId, rating, comment = '') {
        if (rating < 1 || rating > 5) {
            throw new Error('La calificación debe estar entre 1 y 5');
        }
        const plugin = this.dbService.db.plugins[pluginId];
        if (!plugin) {
            throw new Error('Plugin no encontrado');
        }
        const user = await this.dbService.getUser(userId);
        if (!user.purchasedPlugins || !user.purchasedPlugins.includes(pluginId)) {
            throw new Error('Debes comprar el plugin antes de calificarlo');
        }
        if (!plugin.ratings) plugin.ratings = [];
        const existingRating = plugin.ratings.find(r => r.userId === userId);
        if (existingRating) {
            existingRating.rating = rating;
            existingRating.comment = comment;
            existingRating.updatedAt = Date.now();
        } else {
            plugin.ratings.push({
                userId,
                rating,
                comment,
                createdAt: Date.now()
            });
        }
        const totalRating = plugin.ratings.reduce((sum, r) => sum + r.rating, 0);
        plugin.rating = (totalRating / plugin.ratings.length).toFixed(2);
        this.dbService.markDirty();
        return {
            success: true,
            newRating: plugin.rating,
            message: 'Calificación registrada'
        };
    }
    async searchPlugins(query = '', sortBy = 'downloads') {
        const plugins = Object.values(this.dbService.db.plugins || {})
            .filter(p => p.enabled)
            .filter(p => {
                if (!query) return true;
                return p.name.toLowerCase().includes(query.toLowerCase()) ||
                    p.description.toLowerCase().includes(query.toLowerCase());
            });
        const sortFunctions = {
            downloads: (a, b) => b.downloads - a.downloads,
            rating: (a, b) => b.rating - a.rating,
            price: (a, b) => a.price - b.price,
            newest: (a, b) => b.createdAt - a.createdAt
        };
        plugins.sort(sortFunctions[sortBy] || sortFunctions.downloads);
        return plugins.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            downloads: p.downloads,
            rating: p.rating,
            createdAt: p.createdAt
        }));
    }
    async getPluginDetails(pluginId) {
        const plugin = this.dbService.db.plugins[pluginId];
        if (!plugin || !plugin.enabled) {
            throw new Error('Plugin no encontrado');
        }
        const author = await this.dbService.getUser(plugin.authorId);
        return {
            ...plugin,
            author: {
                id: plugin.authorId,
                totalPlugins: Object.values(this.dbService.db.plugins)
                    .filter(p => p.authorId === plugin.authorId && p.enabled).length
            },
            recentRatings: (plugin.ratings || [])
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5)
        };
    }
    async getUserPlugins(userId) {
        const user = await this.dbService.getUser(userId);
        const purchased = (user.purchasedPlugins || [])
            .map(id => this.dbService.db.plugins[id])
            .filter(p => p);
        const published = Object.values(this.dbService.db.plugins || {})
            .filter(p => p.authorId === userId);
        return {
            purchased,
            published,
            totalRevenue: published.reduce((sum, p) => sum + (p.revenue || 0), 0)
        };
    }
    async updatePlugin(authorId, pluginId, updates) {
        const plugin = this.dbService.db.plugins[pluginId];
        if (!plugin) {
            throw new Error('Plugin no encontrado');
        }
        if (plugin.authorId !== authorId) {
            throw new Error('No tienes permiso para actualizar este plugin');
        }
        const allowedUpdates = ['description', 'price', 'code'];
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                plugin[key] = updates[key];
            }
        }
        plugin.updatedAt = Date.now();
        this.dbService.markDirty();
        return {
            success: true,
            message: 'Plugin actualizado exitosamente'
        };
    }
}
