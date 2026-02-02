import { OWNER_JID } from '../lib/constants.js';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['antiprivado', 'antidm', 'antipv'],

    async execute(ctx) {
        // Solo el owner puede usar este comando
        const isOwner = ctx.sender === OWNER_JID || 
                        ctx.senderPhone === OWNER_JID.split('@')[0] ||
                        ctx.sender.split('@')[0] === OWNER_JID.split('@')[0];
        
        if (!isOwner) {
            return await ctx.reply(styleText('ꕤ Este comando es solo para el owner.'));
        }

        const action = ctx.args[0]?.toLowerCase();

        if (!action || !['on', 'off', 'status'].includes(action)) {
            // Mostrar estado actual
            const currentStatus = global.db?.settings?.antiPrivado ?? false;
            const statusIcon = currentStatus ? '🟢' : '🔴';
            
            return await ctx.reply(styleText(
                `ꕥ *Anti-Privado*\n\n` +
                `${statusIcon} Estado actual: *${currentStatus ? 'Activado' : 'Desactivado'}*\n\n` +
                `*Uso:*\n` +
                `> #antiprivado on\n` +
                `> #antiprivado off\n\n` +
                `> _Cuando está activado, el bot no responderá comandos en privado (solo en grupos)_`
            ));
        }

        // Asegurar que exista la estructura de settings
        if (!global.db.settings) {
            global.db.settings = {};
        }

        if (action === 'on') {
            global.db.settings.antiPrivado = true;
            ctx.dbService?.markDirty?.();
            
            return await ctx.reply(styleText(
                `ꕥ *Anti-Privado Activado*\n\n` +
                `🟢 El bot ya no responderá comandos en privado.\n` +
                `> Solo funcionará en grupos.\n\n` +
                `> _El owner siempre puede usar comandos en privado_`
            ));
        }

        if (action === 'off') {
            global.db.settings.antiPrivado = false;
            ctx.dbService?.markDirty?.();
            
            return await ctx.reply(styleText(
                `ꕥ *Anti-Privado Desactivado*\n\n` +
                `🔴 El bot responderá comandos en privado normalmente.`
            ));
        }

        if (action === 'status') {
            const currentStatus = global.db?.settings?.antiPrivado ?? false;
            const statusIcon = currentStatus ? '🟢' : '🔴';
            
            return await ctx.reply(styleText(
                `ꕥ *Estado Anti-Privado*\n\n` +
                `${statusIcon} Anti-Privado: *${currentStatus ? 'Activado' : 'Desactivado'}*`
            ));
        }
    }
};
