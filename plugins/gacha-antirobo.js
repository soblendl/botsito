import { styleText } from '../lib/utils.js';

export default {
    commands: ['antirobo', 'proteger'],

    async execute(ctx) {
        const args = ctx.args;
        const userData = ctx.userData;

        if (!args[0] || !['hora', 'dia', 'semana', 'mes'].includes(args[0].toLowerCase())) {
            return await ctx.reply(styleText(
                `✘ Uso incorrecto.\nFormato correcto:\n\n` +
                `*#antirobo hora*  (5,000 monedas - 1 hora)\n` +
                `*#antirobo dia*   (25,000 monedas - 1 día)\n` +
                `*#antirobo semana* (100,000 monedas - 1 semana)\n` +
                `*#antirobo mes*   (300,000 monedas - 1 mes)`
            ));
        }

        const tipo = args[0].toLowerCase();
        let costo = 0;
        let duracion = 0;

        switch (tipo) {
            case 'hora':
                costo = 5000;
                duracion = 60 * 60 * 1000;
                break;
            case 'dia':
                costo = 25000;
                duracion = 24 * 60 * 60 * 1000;
                break;
            case 'semana':
                costo = 100000;
                duracion = 7 * 24 * 60 * 60 * 1000;
                break;
            case 'mes':
                costo = 300000;
                duracion = 30 * 24 * 60 * 60 * 1000;
                break;
        }

        if ((userData.monedas || 0) < costo) {
            return await ctx.reply(styleText(
                `✘ No tienes suficientes monedas.\n` +
                `Necesitas *${costo.toLocaleString()}* monedas para activar el AntiRobo por ${tipo}.`
            ));
        }

        userData.monedas = (userData.monedas || 0) - costo;
        userData.antirobo = Date.now() + duracion;
        ctx.dbService.markDirty();
        await ctx.dbService.save();

        await ctx.reply(styleText(
            `✅ *AntiRobo activado* por *${tipo}*.\n` +
            `🛡 Tus waifus estarán protegidas hasta:\n` +
            `*${new Date(userData.antirobo).toLocaleString()}*`
        ));
    }
};
