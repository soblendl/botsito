const OWNERS = ['5731154341766', '526631079388', '595983799436'];
import { styleText } from '../lib/utils.js';

export default {
    commands: ['staff'],

    async execute(ctx) {
        const senderNumber = ctx.from.id.split('@')[0];
        if (!OWNERS.includes(senderNumber)) {
            return await ctx.reply(styleText('ꕤ Solo los owners del bot pueden usar este comando.'));
        }
        await ctx.reply(styleText(
            `ꕥ *Llamado de Staff*\n\n` +
            `> El owner ha solicitado una reunión del staff.\n` +
            `> Todos los administradores deben estar atentos.`
        ));
    }
};
