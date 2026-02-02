import { formatNumber, formatNumberLarge, styleText } from '../lib/utils.js';

export default {
    commands: ['board', 'leaderboard', 'top', 'baltop'],
    async execute(ctx) {
        const { args, isGroup, dbService, bot, chatId, reply, sender, from } = ctx;
        const isGlobal = args[0]?.toLowerCase() === 'global' || args[0]?.toLowerCase() === 'g';

        // Obtener el ID del usuario que ejecuta el comando
        const senderId = sender || from || chatId;

        let users = [];
        let title = '';

        if (isGlobal || !isGroup) {
            // Modo Global
            const allUsers = await dbService.getTopUsers(100);
            
            // DEBUG: Ver datos crudos
            console.log('=== DEBUG GLOBAL ===');
            console.log('Total usuarios obtenidos:', allUsers.length);
            console.log('Tu ID (sender):', sender);
            console.log('Tu ID (from):', from);
            console.log('ChatId:', chatId);
            console.log('Context keys:', Object.keys(ctx));
            
            // Mostrar algunos usuarios de ejemplo
            console.log('Primeros 3 usuarios:', allUsers.slice(0, 3).map(u => ({
                id: u.id,
                economy: u.economy
            })));
            
            users = allUsers
                .map(u => ({
                    id: u.id,
                    name: u.name,
                    coins: u.economy?.coins || 0,
                    bank: u.economy?.bank || 0,
                    total: (u.economy?.coins || 0) + (u.economy?.bank || 0)
                }))
                .filter(u => u.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
            
            console.log('Top 10 procesado:', users.map(u => ({
                id: u.id.split('@')[0],
                coins: u.coins,
                bank: u.bank,
                total: u.total
            })));
            console.log('===================');
            
            title = 'ꕥ Ranking Global de Economía';
        } else {
            // Modo Grupo
            try {
                const groupMetadata = await bot.groupMetadata(chatId);
                const participants = groupMetadata.participants || [];
                
                const participantsMap = new Map();
                const searchIds = [];
                
                participants.forEach(p => {
                    const numero = p.id.split('@')[0].split(':')[0];
                    participantsMap.set(numero, p.id);
                    searchIds.push(p.id);
                    const normalized = `${numero}@s.whatsapp.net`;
                    if (normalized !== p.id) {
                        searchIds.push(normalized);
                    }
                });

                const dbUsers = await dbService.getUsersByIds(searchIds);
                
                // DEBUG: Ver datos del grupo
                console.log('=== DEBUG GRUPO ===');
                console.log('Participantes en grupo:', participants.length);
                console.log('IDs buscados:', searchIds.length);
                console.log('Usuarios encontrados en DB:', dbUsers.length);
                console.log('Tu ID (sender):', sender);
                console.log('Tu ID (from):', from);
                console.log('Context keys:', Object.keys(ctx));
                
                // Mostrar los usuarios encontrados en DB
                console.log('Usuarios en DB:', dbUsers.map(u => ({
                    id: u.id,
                    coins: u.economy?.coins,
                    bank: u.economy?.bank
                })));
                
                const economyMap = new Map();
                dbUsers.forEach(u => {
                    const numero = u.id.split('@')[0].split(':')[0];
                    const coins = u.economy?.coins || 0;
                    const bank = u.economy?.bank || 0;
                    const total = coins + bank;
                    
                    if (!economyMap.has(numero) || economyMap.get(numero).total < total) {
                        economyMap.set(numero, {
                            id: u.id,
                            name: u.name,
                            coins,
                            bank,
                            total
                        });
                    }
                });

                users = Array.from(participantsMap.entries())
                    .map(([numero, jid]) => {
                        const data = economyMap.get(numero);
                        if (data) {
                            return {
                                ...data,
                                realJid: jid
                            };
                        }
                        return null; // Retornar null para usuarios sin datos
                    })
                    .filter(u => u !== null && u.total > 0) // Filtrar nulls y usuarios sin coins
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);

                console.log('Top 10 del grupo:', users.map(u => ({
                    numero: u.realJid.split('@')[0].split(':')[0],
                    coins: u.coins,
                    bank: u.bank,
                    total: u.total
                })));
                console.log('===================');

                title = `ꕥ Ranking del Grupo ${groupMetadata.subject}`;

            } catch (err) {
                console.error('Error fetching group leaderboard:', err);
                return reply('ꕤ Error al obtener el ranking del grupo.');
            }
        }

        if (users.length === 0) {
            return reply('ꕤ No hay usuarios con coins en este ranking.');
        }

        let message = `${title}\n\n`;
        message += '➭ Top 10 Ricachones\n\n';
        
        const mentions = [];
        
        users.forEach((user, i) => {
            const medal = i === 0 ? '❶' : i === 1 ? '❷' : i === 2 ? '❸' : `${i + 1}.`;
            
            const mentionJid = user.realJid || user.id;
            const displayId = mentionJid.split('@')[0].split(':')[0];
            
            mentions.push(mentionJid);
            message += `${medal} @${displayId}\n`;
            message += `> ⛃ Coins » *¥${formatNumberLarge(user.coins)}*\n`;
            message += `> ❖ Banco » *¥${formatNumberLarge(user.bank)}*\n`;
            message += `> ✧ Total » *¥${formatNumberLarge(user.total)}*\n\n`;
        });
        
        message += '💫 _Sigue esforzándote!_';
        
        if (!isGlobal && isGroup) {
            message += '\n\n> Usa *#baltop global* para ver el ranking mundial.';
        }

        await reply(styleText(message), { mentions });
    }
};