import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';
const tttGames = new Map();
export default {
    commands: ['tictactoe', 'ttt', 'gato'],
    tags: ['game'],
    help: ['tictactoe @user'],
    async before(ctx) {
        const { chatId, sender, msg } = ctx;
        if (!tttGames.has(chatId) || ctx.isCmd) return;
        const game = tttGames.get(chatId);
        let text = (ctx.body || msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
        if (!/^[1-9]$/.test(text)) return;
        const normalizedSender = sender.replace('@lid', '@s.whatsapp.net');
        const normalizedPlayerX = game.playerX.replace('@lid', '@s.whatsapp.net');
        const normalizedPlayerO = game.playerO.replace('@lid', '@s.whatsapp.net');
        const isPlayerX = normalizedSender === normalizedPlayerX;
        const isPlayerO = normalizedSender === normalizedPlayerO;
        if (!isPlayerX && !isPlayerO) return;
        if ((isPlayerX && game.turn !== 'X') || (isPlayerO && game.turn !== 'O')) { return await ctx.reply(styleText(`⏳ No es tu turno. Espera a que juegue ${game.turn === 'X' ? '❌' : '⭕'}`)); }
        const pos = parseInt(text) - 1;
        if (game.board[pos] !== null) { return await ctx.reply(styleText('❌ Esa casilla ya está ocupada. Elige otra (1-9)')); }
        game.board[pos] = game.turn;
        const winner = checkWin(game.board);
        if (winner) {
            const winPlayer = winner === 'X' ? game.playerX : game.playerO;
            const reward = Math.floor(Math.random() * 2000) + 1000;
            const userData = ctx.dbService.getUser(winPlayer);
            ctx.dbService.updateUser(winPlayer, { 'economy.coins': (userData.economy?.coins || 0) + reward });
            tttGames.delete(chatId);
            return await ctx.reply(styleText(`${renderBoard(game.board)}\n\n🎉 *¡GANADOR!*\n${winner === 'X' ? '❌' : '⭕'} @${winPlayer.split('@')[0]} ganó el juego!\n💰 Ganaste *${reward}* coins`), { mentions: [winPlayer] });
        }
        if (game.board.every(cell => cell !== null)) {
            tttGames.delete(chatId);
            return await ctx.reply(styleText(`${renderBoard(game.board)}\n\n🤝 *¡EMPATE!*\nEl tablero está lleno. No hay ganador.`));
        }
        game.turn = game.turn === 'X' ? 'O' : 'X';
        const nextPlayer = game.turn === 'X' ? game.playerX : game.playerO;
        await ctx.reply(styleText(`${renderBoard(game.board)}\n\n${game.turn === 'X' ? '⭕' : '❌'} @${normalizedSender.split('@')[0]} jugó en ${text}\n${game.turn === 'X' ? '❌' : '⭕'} Turno de @${nextPlayer.split('@')[0]}`), { mentions: [normalizedSender, nextPlayer] });
        return true;
    },
    async execute(ctx) {
        const { chatId, sender, msg } = ctx;
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (tttGames.has(chatId)) return await ctx.reply(styleText('⚠️ Ya hay un juego en curso.'));
        if (!mentioned?.length) return await ctx.reply(styleText('⚠️ Etiqueta a alguien: #ttt @user'));
        const opponent = mentioned[0];
        if (opponent === sender) return await ctx.reply(styleText('🤔 No puedes jugar solo.'));
        tttGames.set(chatId, { playerX: sender, playerO: opponent, turn: 'X', board: Array(9).fill(null) });
        await ctx.reply(styleText(`🎮 *TIC TAC TOE*\n\n❌ @${sender.split('@')[0]} VS ⭕ @${opponent.split('@')[0]}\n\n${renderBoard(Array(9).fill(null))}\n\n▶️ Comienza: ❌ @${sender.split('@')[0]}`), { mentions: [sender, opponent] });
    }
};
function checkWin(board) {
    const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (const [a, b, c] of wins) { if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]; }
    return null;
}
function renderBoard(b) {
    const m = { 'X': '❌', 'O': '⭕' };
    const n = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const c = b.map((v, i) => v ? m[v] : n[i]);
    return `╔═══╦═══╦═══╗\n║ ${c[0]} ║ ${c[1]} ║ ${c[2]} ║\n╠═══╬═══╬═══╣\n║ ${c[3]} ║ ${c[4]} ║ ${c[5]} ║\n╠═══╬═══╬═══╣\n║ ${c[6]} ║ ${c[7]} ║ ${c[8]} ║\n╚═══╩═══╩═══╝`.trim();
}
