import { styleText } from '../lib/utils.js';

const mathGames = new Map();

export default {
    commands: ['math', 'mates'],
    tags: ['game'],
    help: ['math'],

    async before(ctx) {
        const { chatId, body, sender, dbService } = ctx;
        if (!mathGames.has(chatId)) return
        const game = mathGames.get(chatId)
        const answer = parseInt(body)
        if (!isNaN(answer) && answer === game.answer) {
            const userData = dbService.getUser(sender)
            const reward = Math.floor(Math.random() * 2000) + 1000
            userData.coins += reward
            dbService.markDirty()
            clearTimeout(game.timer)
            mathGames.delete(chatId)
            await ctx.reply(styleText(`ꕥ *¡Correcto!* @${sender.split('@')[0]} ganó *${reward}* coins.`), { mentions: [sender] })
        }
    },

    async execute(ctx) {
        const { chatId } = ctx
        if (mathGames.has(chatId)) {
            return await ctx.reply(styleText('ꕤ Ya hay un juego de matemáticas en curso.'))
        }

        const operations = ['+', '-', '*', '/']
        const op = operations[Math.floor(Math.random() * operations.length)]
        let a, b, answer
        if (op === '+') {
            a = Math.floor(Math.random() * 50);
            b = Math.floor(Math.random() * 50);
            answer = a + b;
        } else if (op === '-') {
            a = Math.floor(Math.random() * 50) + 20;
            b = Math.floor(Math.random() * 20);
            answer = a - b;
        } else if (op === '*') {
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            answer = a * b;
        } else if (op === '/') {
            b = Math.floor(Math.random() * 10) + 1;
            answer = Math.floor(Math.random() * 10) + 1;
            a = answer * b;
        }

        const timer = setTimeout(() => {
            if (mathGames.has(chatId)) {
                ctx.reply(styleText(`ꕤ *Tiempo agotado* La respuesta era: ${answer}`));
                mathGames.delete(chatId);
            }
        }, 30000);

        mathGames.set(chatId, {
            answer,
            timer
        });

        await ctx.reply(styleText(`ꕤ *Math Game*\n\n> Resuelve: *${a} ${op} ${b}*`));
    }
}
