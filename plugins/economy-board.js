import { formatNumber, formatNumberLarge, styleText, getName } from '../lib/utils.js';

export default {
    commands: ['board', 'leaderboard', 'top', 'baltop'],
    async execute(ctx) {
        const { dbService, reply, bot, chatId, isGroup } = ctx;

        const users = await dbService.getTopUsers(10);

        if (users.length === 0) {
            return reply('ꕤ No hay usuarios con coins en este ranking.');
        }

        let message = 'ꕥ Ranking Global de Economía\n\n';
        message += '➭ Top 10 Ricachones\n\n';
        
        // Obtener metadatos del grupo si estamos en un grupo
        let groupMetadata = null;
        if (isGroup && chatId) {
            try {
                groupMetadata = await bot.groupMetadata(chatId);
            } catch (e) {
                console.log('No se pudo obtener metadata del grupo:', e);
            }
        }

        // Resolver nombres de usuarios
        const usersWithNames = await Promise.all(users.map(async (user) => {
            let displayName = user.name;
            
            // Si no tiene nombre o es genérico, intentar obtenerlo
            if (!displayName || displayName === 'Usuario') {
                try {
                    // Opción 1: Usar getName si está disponible
                    if (chatId) {
                        displayName = await getName(bot, chatId, user.id);
                    }
                    
                    // Opción 2: Buscar en metadata del grupo
                    if ((!displayName || displayName === 'Usuario') && groupMetadata) {
                        const participant = groupMetadata.participants.find(p => p.id === user.id);
                        if (participant) {
                            displayName = participant.notify || participant.name || participant.verifiedName;
                        }
                    }
                    
                    // Opción 3: Intentar obtener info del contacto
                    if (!displayName || displayName === 'Usuario') {
                        const contact = await bot.getContact(user.id);
                        displayName = contact.notify || contact.name || contact.verifiedName || contact.pushname;
                    }
                } catch (e) {
                    console.log(`Error obteniendo nombre para ${user.id}:`, e);
                }
            }
            
            // Si aún no hay nombre, usar número formateado
            if (!displayName || displayName === 'Usuario') {
                displayName = user.id.split('@')[0]; // Extraer solo el número
            }
            
            return { ...user, displayName };
        }));

        usersWithNames.forEach((user, i) => {
            const medal = i === 0 ? '❶' : i === 1 ? '❷' : i === 2 ? '❸' : `${i + 1}.`;
            const name = user.displayName;
            
            message += `${medal} \`${name}\`\n`;
            message += `> ⛃ Coins » *¥${formatNumberLarge(user.coins)}*\n`;
            message += `> ❖ Banco » *¥${formatNumberLarge(user.bank)}*\n`;
            message += `> ✧ Total » *¥${formatNumberLarge(user.total)}*\n\n`;
        });
        
        message += '💫 _Sigue esforzándote!_';

        await reply(styleText(message));
    }
};