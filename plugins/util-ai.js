import { styleText } from '../lib/utils.js';

export default {
    commands: ['ai', 'ia'],

    async execute(ctx) {
        if (ctx.args.length === 0) {
            return await ctx.reply(styleText('ꕤ Debes escribir una pregunta.\nUso: #ai <pregunta>'));
        }

        const question = ctx.args.join(' ');

        await ctx.reply(styleText(
            `ꕥ *AI Assistant*\n\n` +
            `Pregunta: ${question}\n\n` +
            `Esta funcionalidad requiere integración con una API de IA (como Gemini, GPT, etc.).\n` +
            `Por ahora está en modo de demostración.`
        ));
    }
};
