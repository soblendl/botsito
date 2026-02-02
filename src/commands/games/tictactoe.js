import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

const tttGames = new Map();

export default {
    commands: ['tictactoe', 'ttt', 'gato'],
    tags: ['game'],
    help: ['tictactoe @user'],
    async before(ctx) {
        const { chatId, sender, msg } = ctx;
        if (!tttGames.has(chatId)) return;
        if (ctx.isCmd) return;

        const game = tttGames.get(chatId);
        let text = ctx.body ||
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';
        text = text.trim();

        const isNumber = /^[1-9]$/.test(text);
        if (!isNumber) return;

        const normalizedSender = sender.replace('@lid', '@s.whatsapp.net');
        const normalizedPlayerX = game.playerX.replace('@lid', '@s.whatsapp.net');
        const normalizedPlayerO = game.playerO.replace('@lid', '@s.whatsapp.net');

        const isPlayerX = normalizedSender === normalizedPlayerX;
        const isPlayerO = normalizedSender === normalizedPlayerO;

        if (!isPlayerX && !isPlayerO) {
            return;
        }

        if (isPlayerX && game.turn !== 'X') {
            await ctx.reply(styleText('⏳ No es tu turno. Espera a que juegue ⭕'));
            return true;
        }

        if (isPlayerO && game.turn !== 'O') {
            await ctx.reply(styleText('⏳ No es tu turno. Espera a que juegue ❌'));
            return true;
        }

        const pos = parseInt(text) - 1;

        if (game.board[pos] !== null) {
            await ctx.reply(styleText('❌ Esa casilla ya está ocupada. Elige otra (1-9)'));
            return true;
        }

        game.board[pos] = game.turn;
        const currentPlayer = game.turn;
        game.turn = game.turn === 'X' ? 'O' : 'X';

        const winner = checkWin(game.board);

        if (winner) {
            const winPlayer = winner === 'X' ? game.playerX : game.playerO;
            const reward = Math.floor(Math.random() * 2000) + 1000;
            const userData = ctx.dbService.getUser(winPlayer);
            ctx.dbService.updateUser(winPlayer, {
                'economy.coins': (userData.economy.coins || 0) + reward
            });

            tttGames.delete(chatId);

            await ctx.reply(
                styleText(
                    `${renderBoard(game.board, null)}\n\n` +
                    `🎉 *¡GANADOR!*\n` +
                    `${winner === 'X' ? '❌' : '⭕'} @${winPlayer.split('@')[0]} ganó el juego!\n` +
                    `💰 Ganaste *${reward}* coins`
                ),
                { mentions: [winPlayer] }
            );
            return true;
        }

        if (game.board.every(cell => cell !== null)) {
            tttGames.delete(chatId);
            await ctx.reply(
                styleText(
                    `${renderBoard(game.board, null)}\n\n` +
                    `🤝 *¡EMPATE!*\n` +
                    `El tablero está lleno. No hay ganador.`
                )
            );
            return true;
        }

        const nextPlayerJid = game.turn === 'X' ? game.playerX : game.playerO;
        const currentSymbol = currentPlayer === 'X' ? '❌' : '⭕';
        const nextSymbol = game.turn === 'X' ? '❌' : '⭕';

        await ctx.reply(
            styleText(
                `${renderBoard(game.board, null)}\n\n` +
                `${currentSymbol} @${normalizedSender.split('@')[0]} jugó en la casilla ${text}\n` +
                `${nextSymbol} Turno de @${nextPlayerJid.split('@')[0]}`
            ),
            { mentions: [normalizedSender, nextPlayerJid] }
        );

        return true;
    },
    async execute(ctx) {
        const { chatId, sender, msg } = ctx;
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        if (tttGames.has(chatId)) {
            return await ctx.reply(styleText('⚠️ Ya hay un juego en curso en este chat.\nEspera a que termine para jugar.'));
        }

        if (!mentionedJid || mentionedJid.length === 0) {
            return await ctx.reply(styleText('⚠️ Debes etiquetar a alguien para jugar.\n\n📝 Ejemplo: #ttt @usuario'));
        }

        const opponent = mentionedJid[0];

        if (opponent === sender) {
            return await ctx.reply(styleText('🤔 No puedes jugar contra ti mismo.'));
        }

        const normalizedSender = sender.replace('@lid', '@s.whatsapp.net');
        const normalizedOpponent = opponent.replace('@lid', '@s.whatsapp.net');

        tttGames.set(chatId, {
            playerX: normalizedSender,
            playerO: normalizedOpponent,
            turn: 'X',
            board: Array(9).fill(null)
        });

        logger.info(`✅ [TTT] Juego iniciado en ${chatId}: ${normalizedSender} vs ${normalizedOpponent}`);

        await ctx.reply(
            styleText(
                `🎮 *TIC TAC TOE*\n\n` +
                `❌ @${normalizedSender.split('@')[0]}\n` +
                `    VS\n` +
                `⭕ @${normalizedOpponent.split('@')[0]}\n\n` +
                renderBoard(Array(9).fill(null), null) + `\n\n` +
                `▶️ Comienza: ❌ @${normalizedSender.split('@')[0]}\n\n` +
                `💡 Escribe un número del *1 al 9* para jugar`
            ),
            { mentions: [normalizedSender, normalizedOpponent] }
        );
    }
};

function checkWin(board) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function renderBoard(board, turn) {
    const map = { 'X': '❌', 'O': '⭕' };
    const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

    const b = board.map((cell, i) => {
        if (cell === 'X') return map['X'];
        if (cell === 'O') return map['O'];
        return numbers[i];
    });

    return `╔═══╦═══╦═══╗
║ ${b[0]} ║ ${b[1]} ║ ${b[2]} ║
╠═══╬═══╬═══╣
║ ${b[3]} ║ ${b[4]} ║ ${b[5]} ║
╠═══╬═══╬═══╣
║ ${b[6]} ║ ${b[7]} ║ ${b[8]} ║
╚═══╩═══╩═══╝`.trim();
}
