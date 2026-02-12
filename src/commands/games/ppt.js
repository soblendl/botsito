import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['ppt', 'piedra', 'papel', 'tijera'],
    async execute(ctx) {
        let userChoice = ctx.args[0]?.toLowerCase();
        if (!userChoice && ctx.command !== 'ppt') userChoice = ctx.command;
        if (!userChoice || !['piedra', 'papel', 'tijera'].includes(userChoice)) return await ctx.reply(styleText('ꕢ Debes elegir: *piedra*, *papel* o *tijera*.\n> Ejemplo: *#ppt* piedra'));
        const choices = ['piedra', 'papel', 'tijera'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const emojis = { piedra: '🪨', papel: '📄', tijera: '✂️' };
        let result = '';
        if (userChoice === botChoice) result = 'ꕢ Empate, nadie gano.';
        else if ((userChoice === 'piedra' && botChoice === 'tijera') || (userChoice === 'papel' && botChoice === 'piedra') || (userChoice === 'tijera' && botChoice === 'papel')) result = 'ꕣ Ganaste, felicidades.';
        else result = 'ꕢ Perdiste (gana el bot).';
        const text = `❐ *Piedra, Papel o Tijera*\n\n⛱ Tú: ${userChoice} ${emojis[userChoice]}\n✰ Bot: ${botChoice} ${emojis[botChoice]}\n\n> RESULTADO: ${result}`.trim();
        await ctx.reply(styleText(text));
    }
};
