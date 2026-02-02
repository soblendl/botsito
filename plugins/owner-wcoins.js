import { isOwner, extractMentions, formatNumber, styleText } from '../lib/utils.js';

export default {
    commands: ['wcoins', 'addcoins', 'setcoins'],

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

        if (!targetUser) {
            return await ctx.reply(styleText(
                'ꕥ *WCOINS - Dar Coins (Owner)*\n\n' +
                '> Uso » *#wcoins* @usuario <cantidad>\n' +
                '> O responde a alguien + *#wcoins* <cantidad>\n\n' +
                '> Da coins ilimitadas a cualquier usuario'
            ));
        }

        const amount = parseInt(ctx.args.find(arg => !isNaN(parseInt(arg))));
        if (!amount || amount <= 0) {
            return await ctx.reply(styleText('✘ Especifica una cantidad válida de coins.'));
        }
        const targetData = ctx.dbService.getUser(targetUser);
        if (!targetData.economy) {
            targetData.economy = { coins: 0 };
        }
        const newBalance = targetData.economy.coins + amount;
        ctx.dbService.updateUser(targetUser, {
            'economy.coins': newBalance
        });
        const targetNumber = targetUser.split('@')[0].split(':')[0];
        await ctx.reply(styleText(
            `ꕥ *Coins Añadidas*\n\n` +
            `> Usuario » @${targetNumber}\n` +
            `> Cantidad » +¥${formatNumber(amount)}\n` +
            `> Nuevo balance » ¥${formatNumber(newBalance)}`),
            { mentions: [targetUser] }
        );
    }
};
