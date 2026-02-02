import { styleText } from '../lib/utils.js';

export default {
    commands: ['inventory', 'inv', 'bag', 'use', 'usar'],

    async execute(ctx) {
        const { shopService, command, args, dbService } = ctx;

        // --- Ver Inventario ---
        if (['inventory', 'inv', 'bag'].includes(command)) {
            const inventory = await shopService.getInventory(ctx.sender);

            if (inventory.length === 0) {
                return await ctx.reply(styleText(`🎒 *Tu inventario está vacío.*\n> Ve a la #shop para comprar cosas.`));
            }

            let text = `🎒 *INVENTARIO DE ${ctx.from.name.toUpperCase()}*\n\n`;

            // Agrupar por categoría visualmente? No, lista simple por ahora
            for (const item of inventory) {
                if (item.count > 0) {
                    text += `▪️ *${item.name}* (x${item.count})\n`;
                    text += `> ID: ${item.id}\n`;
                }
            }

            text += `\n> Usa *#use <id>* para usar un objeto.`;
            return await ctx.reply(styleText(text));
        }

        // --- Usar Objeto ---
        if (['use', 'usar'].includes(command)) {
            const itemId = args[0];
            if (!itemId) return await ctx.reply(styleText(`❌ Ingresa el ID del objeto a usar.`));

            // Lógica de uso básica (Consumibles de XP/Coins)
            // Esto idealmente iría en ShopService o un ItemUseService,
            // pero lo implementaremos aquí por simplicidad inicial.

            const user = await dbService.getUser(ctx.sender);
            const inventory = user.inventory || [];
            const itemIndex = inventory.findIndex(i => i.id === itemId);

            if (itemIndex === -1 || inventory[itemIndex].count < 1) {
                return await ctx.reply(styleText(`ꕤ No tienes este objeto.`));
            }

            const itemDef = shopService.items.get(itemId);
            if (!itemDef) return await ctx.reply(styleText(`ꕤ Error de datos del objeto.`));

            if (itemDef.category !== 'Consumible' && itemDef.category !== 'Potenciador') {
                return await ctx.reply(styleText(`ꕤ Este objeto no se puede "usar" directamente.`));
            }

            // Consumir
            inventory[itemIndex].count -= 1;
            if (inventory[itemIndex].count <= 0) {
                inventory.splice(itemIndex, 1);
            }

            // Efectos
            let msg = `ꕤ Usaste *${itemDef.name}*.\n\n`;

            if (itemDef.effect) {
                if (itemDef.effect.type === 'restore') {
                    // Simular restauración (no hay HP real, así que damos coins o xp como placeholder)
                    msg += `> Te sientes renovado (Efecto visual).`;
                }
                else if (itemDef.effect.type === 'multiplier') {
                    // Guardar en DB el boost
                    // TODO: Implementar estructura de active_effects en user db
                    msg += `> ¡Potenciador activado! (WIP: Efecto real pendiente)`;
                }
            } else {
                msg += `> No pasó nada interesante.`;
            }

            await dbService.updateUser(ctx.sender, { inventory });
            return await ctx.reply(styleText(msg));
        }
    }
};
