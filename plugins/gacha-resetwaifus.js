import { isOwner, styleText } from '../lib/utils.js';

export default {
    commands: ['resetwaifus', 'reiniciarwaifus'],

    async execute(ctx) {
        if (!isOwner(ctx.sender, global.botOwner)) {
            return await ctx.reply(styleText('✘ Solo el owner puede usar este comando.'));
        }

        try {
            const gachaService = ctx.gachaService;
            const characters = gachaService.getAll();

            if (characters.length === 0) {
                return await ctx.reply(styleText('✘ No hay waifus registradas.'));
            }

            gachaService.resetAllCharacters();

            const users = ctx.db.users || {};
            for (const userId in users) {
                if (users[userId].gacha && users[userId].gacha.characters) {
                    users[userId].gacha.characters = [];
                }
            }
            ctx.dbService.markDirty();

            await ctx.reply(styleText('✅ Todas las waifus han sido reiniciadas. Ahora nadie las posee.'));
        } catch (error) {
            await ctx.reply(styleText(`✘ Error: ${error.message}`));
        }
    }
};
