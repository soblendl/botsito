import { isOwner, extractMentions, formatNumber, styleText, getCurrencyName } from '../../utils/helpers.js';

export default {
    commands: ['wcoins', 'addcoins',],

    async execute(ctx) {
        if (!isOwner(ctx.sender, global.botOwner)) {
            return await ctx.reply(styleText('✘ Solo el owner puede usar este comando.'));
        }

        const mentioned = extractMentions(ctx);
        const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.participant;

        let targetUser = null;

        if (mentioned.length > 0) {
            targetUser = mentioned[0];
        } else if (quoted) {
            targetUser = quoted;
        }

        // Fix: Resolver LID a Phone JID si es necesario
        if (targetUser && (targetUser.includes('@lid') || !targetUser.includes('@s.whatsapp.net'))) {
            if (ctx.isGroup) {
                try {
                    const groupMetadata = await ctx.bot.groupMetadata(ctx.chatId);
                    const participant = groupMetadata.participants.find(p => p.lid === targetUser || p.id === targetUser);
                    if (participant && participant.id) {
                        targetUser = participant.id;
                    }
                } catch (e) {
                    console.error('Error resolving LID in wcoins:', e);
                }
            }

            // Si después de intentar resolver sigue siendo LID, intentar buscar en store o fallar
            if (targetUser.includes('@lid')) {
                return await ctx.reply(styleText('ꕤ No se pudo verificar el usuario destino. Intenta mencionarlo nuevamente o esperar unos segundos.'));
            }
        }

        if (!targetUser) {
            return await ctx.reply(styleText(
                'ꕣ *WCOINS - Dar Coins (Owner)*\n\n' +
                '> Uso » *#wcoins* @usuario <cantidad>\n' +
                '> O responde a alguien + *#wcoins* <cantidad>\n\n' +
                '> Da coins ilimitadas a cualquier usuario'
            ));
        }

        const amount = parseInt(ctx.args.find(arg => !isNaN(parseInt(arg))));
        if (!amount || amount <= 0) {
            return await ctx.reply(styleText('✘ Especifica una cantidad válida de coins.'));
        }

        const targetData = await ctx.dbService.getUser(targetUser);
        if (!targetData.economy) {
            targetData.economy = { coins: 0 };
        }

        const newBalance = (targetData.economy.coins || 0) + amount;

        await ctx.dbService.updateUser(targetUser, {
            'economy.coins': newBalance
        });

        const targetNumber = targetUser.split('@')[0].split(':')[0];

        const currencyName = await getCurrencyName(ctx);

        await ctx.reply(styleText(
            `ꕣ *Coins Añadidas*\n\n` +
            `> Usuario » @${targetNumber}\n` +
            `> Cantidad » +¥${formatNumber(amount)} ${currencyName}\n` +
            `> Nuevo balance » ¥${formatNumber(newBalance)} ${currencyName}`),
            { mentions: [targetUser] }
        );
    }
};
