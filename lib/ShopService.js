import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ShopService {
    constructor(dbService) {
        this.dbService = dbService;
        this.items = new Map();
        this.stock = new Map();
        this.stockInterval = null;
        this.CATEGORIES = {
            CONSUMABLE: 'Consumible',
            TOOL: 'Herramienta',
            COLLECTIBLE: 'Coleccionable',
            POWERUP: 'Potenciador',
            SPECIAL: 'Especial'
        };

        this.initializeItems();
        this.startStockRotation();
    }

    initializeItems() {
        // Generar 200 items
        // 1-50: Consumibles (Pociones, Comida)
        // 51-100: Herramientas (Picos, Cañas)
        // 101-150: Coleccionables (Figuras, Cartas)
        // 151-180: Potenciadores (Multiplicadores)
        // 181-200: Especiales (Pases, Tickets)

        const add = (id, name, price, desc, category, effect = {}) => {
            this.items.set(id, { id, name, price, desc, category, effect });
        };

        // --- Consumibles ---
        const potions = ['Vida', 'Maná', 'Energía', 'Suerte', 'Rapidez'];
        const potionLevels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

        let idCounter = 1;

        potions.forEach(type => {
            potionLevels.forEach((lvl, idx) => {
                const power = (idx + 1) * 10;
                add(
                    `pot_${type.toLowerCase()}_${idx + 1}`,
                    `Poción de ${type} ${lvl}`,
                    100 * (idx + 1),
                    `Resturara ${power}% de ${type.toLowerCase()}`,
                    this.CATEGORIES.CONSUMABLE,
                    { type: 'restore', stat: type.toLowerCase(), amount: power }
                );
            });
        });

        // Comida variada
        const foods = ['Manzana', 'Pan', 'Carne', 'Pescado', 'Pastel', 'Sushi', 'Pizza', 'Hamburguesa', 'Taco', 'Helado'];
        foods.forEach((food, idx) => {
            add(`food_${idx}`, food, 50 * (idx + 1), `Delicioso ${food}`, this.CATEGORIES.CONSUMABLE);
        });

        // --- Herramientas ---
        const materials = ['Madera', 'Piedra', 'Hierro', 'Oro', 'Diamante', 'Obsidiana', 'Esmeralda', 'Rubí', 'Zafiro', 'Netherite'];
        const tools = ['Pico', 'Hacha', 'Espada', 'Pala', 'Azada'];

        materials.forEach((mat, mIdx) => {
            tools.forEach((tool, tIdx) => {
                add(
                    `tool_${mat.toLowerCase()}_${tool.toLowerCase()}`,
                    `${tool} de ${mat}`,
                    500 * (mIdx + 1),
                    `Herramienta de nivel ${mIdx + 1}`,
                    this.CATEGORIES.TOOL,
                    { type: 'tool', level: mIdx + 1 }
                );
            });
        });

        // --- Coleccionables ---
        for (let i = 1; i <= 50; i++) {
            add(`figura_${i}`, `Figura Coleccionable #${i}`, 1000 * i, `Figura rara número ${i}`, this.CATEGORIES.COLLECTIBLE);
        }

        // --- Potenciadores ---
        for (let i = 1; i <= 30; i++) {
            add(
                `xp_boost_${i}`,
                `Potenciador de XP x${(1 + i * 0.1).toFixed(1)}`,
                2000 * i,
                `Multiplica tu XP por ${(1 + i * 0.1).toFixed(1)} durante 30m`,
                this.CATEGORIES.POWERUP,
                { type: 'multiplier', stat: 'xp', value: 1 + i * 0.1, duration: 1800 }
            );
        }

        // --- Especiales ---
        const specials = [
            { name: 'Ticket Gacha', price: 5000 },
            { name: 'Pase VIP (1d)', price: 10000 },
            { name: 'Pase VIP (7d)', price: 50000 },
            { name: 'Cambio de Nombre', price: 2000 },
            { name: 'Reset Stats', price: 50000 },
            { name: 'Caja Misteriosa', price: 1500 },
            { name: 'Llave Maestra', price: 8000 },
            { name: 'Piedra Filosofal', price: 100000 },
            { name: 'Anillo Unico', price: 500000 },
            { name: 'Estrella Fugaz', price: 25000 }
        ];

        specials.forEach((s, idx) => {
            add(`special_${idx}`, s.name, s.price, 'Objeto especial muy raro', this.CATEGORIES.SPECIAL);
        });

        console.log(`🛒 ShopService: ${this.items.size} ítems cargados.`);
    }

    startStockRotation() {
        this.rotateStock(); // Initial rotation

        // Rotar cada 5 minutos
        this.stockInterval = setInterval(() => {
            this.rotateStock();
        }, 5 * 60 * 1000);
    }

    rotateStock() {
        this.stock.clear();
        console.log('🔄 Rotando stock de la tienda...');

        // Seleccionar aleatoriamente el 50% de los items para tener stock
        for (const [id, item] of this.items) {
            if (Math.random() > 0.3) { // 70% de probabilidad de tener stock
                const quantity = Math.floor(Math.random() * 50) + 1; // 1-50 unidades
                this.stock.set(id, quantity);
            }
        }
    }

    getItems(page = 1, limit = 10, category = null) {
        let allItems = Array.from(this.items.values());

        if (category) {
            allItems = allItems.filter(i => i.category === category);
        }

        const start = (page - 1) * limit;
        const end = start + limit;
        const pageItems = allItems.slice(start, end);

        return {
            items: pageItems.map(i => ({
                ...i,
                stock: this.stock.get(i.id) || 0
            })),
            total: allItems.length,
            totalPages: Math.ceil(allItems.length / limit),
            currentPage: page
        };
    }

    getItem(id) {
        const item = this.items.get(id);
        if (!item) return null;
        return {
            ...item,
            stock: this.stock.get(id) || 0
        };
    }

    async buyItem(userId, itemId, quantity = 1) {
        const item = this.items.get(itemId);
        if (!item) return { success: false, error: 'Item no encontrado' };

        const currentStock = this.stock.get(itemId) || 0;
        if (currentStock < quantity) return { success: false, error: `Stock insuficiente (Disponible: ${currentStock})` };

        const user = await this.dbService.getUser(userId);
        const totalCost = item.price * quantity;

        if ((user.economy?.coins || 0) < totalCost) {
            return { success: false, error: `Fondos insuficientes. Necesitas ${totalCost} coins.` };
        }

        // Procesar compra
        // 1. Reducir dinero
        await this.dbService.updateUser(userId, {
            'economy.coins': user.economy.coins - totalCost
        });

        // 2. Añadir al inventario
        // Buscar si ya tiene el item
        if (!user.inventory) user.inventory = [];

        const existingItemIndex = user.inventory.findIndex(i => i.id === itemId);

        if (existingItemIndex >= 0) {
            user.inventory[existingItemIndex].count += quantity;
        } else {
            user.inventory.push({ id: itemId, count: quantity, acquiredAt: Date.now() });
        }

        await this.dbService.updateUser(userId, { inventory: user.inventory });

        // 3. Reducir stock
        this.stock.set(itemId, currentStock - quantity);

        return { success: true, item, remainingBalance: user.economy.coins - totalCost };
    }

    async getInventory(userId) {
        const user = await this.dbService.getUser(userId);
        if (!user.inventory) return [];

        return user.inventory.map(slot => {
            const itemDef = this.items.get(slot.id);
            return {
                ...slot,
                name: itemDef ? itemDef.name : 'Item Desconocido',
                desc: itemDef ? itemDef.desc : '',
                category: itemDef ? itemDef.category : 'Otros'
            };
        });
    }

    gracefulShutdown() {
        if (this.stockInterval) clearInterval(this.stockInterval);
    }
}
