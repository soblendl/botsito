import { styleText } from '../lib/utils.js';

const tttGames = new Map();

export default {
    commands: ['tictactoe', 'ttt', 'gato'],
    tags: ['game'],
    help: ['tictactoe @user'],

    async before(ctx) {
        const { chatId, sender, msg } = ctx;

        console.log('🔍 [TTT] Mensaje recibido en chat:', chatId);
        console.log('🔍 [TTT] Hay juego activo?:', tttGames.has(chatId));

        // Si no hay juego activo, salir
        if (!tttGames.has(chatId)) return;

        console.log('🔍 [TTT] Es comando?:', ctx.isCmd);

        // Si es un comando (empieza con #, /, ., etc), salir
        if (ctx.isCmd) return;

        const game = tttGames.get(chatId);

        // Obtener el texto del mensaje de diferentes formas posibles
        let text = ctx.body ||
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';

        // Limpiar el texto
        text = text.trim();

        console.log('🔍 [TTT] Texto recibido:', `"${text}"`, 'de:', sender);
        console.log('🔍 [TTT] ctx.body:', ctx.body);
        console.log('🔍 [TTT] conversation:', msg.message?.conversation);
        console.log('🔍 [TTT] extendedText:', msg.message?.extendedTextMessage?.text);

        // Verificar si es un número del 1-9
        const isNumber = /^[1-9]$/.test(text);
        console.log('🔍 [TTT] Es número 1-9?:', isNumber);

        if (!isNumber) return;

        // IMPORTANTE: Normalizar todo a @s.whatsapp.net para comparar
        // WhatsApp puede enviar mensajes con @lid o @s.whatsapp.net
        // Pero en el juego siempre guardamos @s.whatsapp.net
        const normalizedSender = sender.replace('@lid', '@s.whatsapp.net');
        const normalizedPlayerX = game.playerX.replace('@lid', '@s.whatsapp.net');
        const normalizedPlayerO = game.playerO.replace('@lid', '@s.whatsapp.net');

        console.log('🔍 [TTT] Sender original:', sender);
        console.log('🔍 [TTT] Sender normalizado:', normalizedSender);
        console.log('🔍 [TTT] Player X normalizado:', normalizedPlayerX);
        console.log('🔍 [TTT] Player O normalizado:', normalizedPlayerO);
        console.log('🔍 [TTT] Turno actual:', game.turn);

        // Verificar si es uno de los jugadores
        const isPlayerX = normalizedSender === normalizedPlayerX;
        const isPlayerO = normalizedSender === normalizedPlayerO;

        console.log('🔍 [TTT] Es Player X?:', isPlayerX);
        console.log('🔍 [TTT] Es Player O?:', isPlayerO);

        if (!isPlayerX && !isPlayerO) {
            console.log('⚠️ [TTT] No es un jugador del juego, ignorando...');
            // No es un jugador, ignorar silenciosamente
            return;
        }

        // Verificar turno
        if (isPlayerX && game.turn !== 'X') {
            console.log('⚠️ [TTT] Player X intentó jugar pero no es su turno');
            await ctx.reply(styleText('⏳ No es tu turno. Espera a que juegue ⭕'));
            return true;
        }
        if (isPlayerO && game.turn !== 'O') {
            console.log('⚠️ [TTT] Player O intentó jugar pero no es su turno');
            await ctx.reply(styleText('⏳ No es tu turno. Espera a que juegue ❌'));
            return true;
        }

        // Obtener posición (0-8)
        const pos = parseInt(text) - 1;

        console.log('✅ [TTT] Movimiento válido! Posición:', pos, 'Jugador:', game.turn);

        // Verificar si la casilla está ocupada
        if (game.board[pos] !== null) {
            console.log('⚠️ [TTT] Casilla ocupada:', pos);
            await ctx.reply(styleText('❌ Esa casilla ya está ocupada. Elige otra (1-9)'));
            return true;
        }

        // Hacer el movimiento
        game.board[pos] = game.turn;
        const currentPlayer = game.turn;

        console.log('🎮 [TTT] Movimiento realizado! Tablero:', game.board);

        // Cambiar turno
        game.turn = game.turn === 'X' ? 'O' : 'X';

        console.log('🎮 [TTT] Nuevo turno:', game.turn);

        // Verificar si hay ganador
        const winner = checkWin(game.board);
        console.log('🔍 [TTT] Ganador?:', winner);

        if (winner) {
            const winPlayer = winner === 'X' ? game.playerX : game.playerO;

            console.log('🎉 [TTT] ¡Hay ganador!:', winPlayer);

            // Agregar recompensa
            const reward = Math.floor(Math.random() * 2000) + 1000;
            const userData = ctx.dbService.getUser(winPlayer);
            ctx.dbService.updateUser(winPlayer, {
                'economy.coins': (userData.economy.coins || 0) + reward
            });

            tttGames.delete(chatId);

            console.log('✅ [TTT] Juego terminado. Recompensa:', reward);

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

        // Verificar empate
        if (game.board.every(cell => cell !== null)) {
            console.log('🤝 [TTT] ¡Empate!');
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

        console.log('➡️ [TTT] Enviando tablero actualizado...');

        // Enviar tablero actualizado con info de quién jugó
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

        console.log('🎮 [TTT] Comando execute llamado');
        console.log('🎮 [TTT] Chat ID:', chatId);
        console.log('🎮 [TTT] Sender:', sender);

        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        console.log('🎮 [TTT] Mentioned JID:', mentionedJid);

        if (tttGames.has(chatId)) {
            console.log('⚠️ [TTT] Ya hay un juego activo en este chat');
            return await ctx.reply(styleText('⚠️ Ya hay un juego en curso en este chat.\nEspera a que termine para jugar.'));
        }

        if (!mentionedJid || mentionedJid.length === 0) {
            console.log('⚠️ [TTT] No se mencionó a nadie');
            return await ctx.reply(styleText('⚠️ Debes etiquetar a alguien para jugar.\n\n📝 Ejemplo: #ttt @usuario'));
        }

        const opponent = mentionedJid[0];
        console.log('🎮 [TTT] Oponente:', opponent);

        if (opponent === sender) {
            console.log('⚠️ [TTT] Intentó jugar contra sí mismo');
            return await ctx.reply(styleText('🤔 No puedes jugar contra ti mismo.'));
        }

        // CRÍTICO: Normalizar AMBOS JIDs a @s.whatsapp.net al crear el juego
        // Esto asegura que siempre comparemos con el mismo formato
        const normalizedSender = sender.replace('@lid', '@s.whatsapp.net');
        const normalizedOpponent = opponent.replace('@lid', '@s.whatsapp.net');

        // Inicializar juego con JIDs normalizados
        tttGames.set(chatId, {
            playerX: normalizedSender,
            playerO: normalizedOpponent,
            turn: 'X',
            board: Array(9).fill(null)
        });

        console.log('✅ [TTT] Juego creado exitosamente!');
        console.log('✅ [TTT] Player X (normalizado):', normalizedSender);
        console.log('✅ [TTT] Player O (normalizado):', normalizedOpponent);
        console.log('✅ [TTT] Total de juegos activos:', tttGames.size);

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
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
        [0, 4, 8], [2, 4, 6]             // Diagonales
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

    return `
╔═══╦═══╦═══╗
║ ${b[0]} ║ ${b[1]} ║ ${b[2]} ║
╠═══╬═══╬═══╣
║ ${b[3]} ║ ${b[4]} ║ ${b[5]} ║
╠═══╬═══╬═══╣
║ ${b[6]} ║ ${b[7]} ║ ${b[8]} ║
╚═══╩═══╩═══╝
`.trim();
}