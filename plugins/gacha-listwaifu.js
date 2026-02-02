import { styleText } from '../lib/utils.js';

export default {
    commands: ['listawaifus', 'listwaifus'],

    async execute(ctx) {
        const gachaService = ctx.gachaService;
        const characters = gachaService.getAll();

        if (characters.length === 0) {
            return await ctx.reply(styleText('✘ No hay waifus registradas.'));
        }

        const page = parseInt(ctx.args[0]) || 1;
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const totalPages = Math.ceil(characters.length / pageSize);

        if (page > totalPages || page < 1) {
            return await ctx.reply(styleText(`✘ Página inválida. Total de páginas: ${totalPages}`));
        }

        const pageCharacters = characters.slice(startIndex, endIndex);

        let listMessage = `✧ *Lista de Waifus* (Página ${page}/${totalPages})\n`;
        listMessage += `Total: ${characters.length} personajes\n\n`;

        pageCharacters.forEach((c) => {
            listMessage += `• Nombre: *${c.name}*\n`;
            listMessage += `• ID: ${c.id}\n`;
            listMessage += `• Dueño: ${c.owner ? c.owner.split('@')[0] : 'Nadie'}\n`;
            listMessage += `• Valor: ${c.value || 0}\n\n`;
        });

        if (page < totalPages) {
            listMessage += `\nUsa *#listawaifus ${page + 1}* para ver más`;
        }

        await ctx.reply(styleText(listMessage.trim()));
    }
};
