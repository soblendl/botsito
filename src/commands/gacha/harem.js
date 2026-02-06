import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['harem', 'miswaifu', 'coleccion'],
    async execute(ctx) {
        const userData = ctx.userData;
        const gachaService = ctx.gachaService;
        const userCharacters = gachaService.getByOwner(ctx.sender) || [];
        if (userCharacters.length === 0) {
            return await ctx.reply(styleText('ꕢ No tienes personajes aún.'));
        }
        let page = 1;
        const args = ctx.args.join(' ').toLowerCase();
        if (args.includes('page=') || args.includes('pagina=')) {
            const match = args.match(/(?:page|pagina)=(\d+)/);
            if (match) page = parseInt(match[1]);
        } else if (args.includes('page ') || args.includes('pagina ')) {
            const match = args.match(/(?:page|pagina)\s+(\d+)/);
            if (match) page = parseInt(match[1]);
        } else if (!isNaN(parseInt(ctx.args[0]))) {
            page = parseInt(ctx.args[0]);
        }
        const itemsPerPage = 10;
        const totalPages = Math.ceil(userCharacters.length / itemsPerPage);
        page = Math.max(1, Math.min(page, totalPages));
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const charactersToShow = userCharacters.slice(startIndex, endIndex);
        let message = `ꕣ Inventario de Compras\n\n`;
        const userNumber = ctx.sender.replace(/@.+/, '');
        message += `♟ Usuario » @${userNumber}\n`;
        message += `> ✐ Personajes comprados » ${userCharacters.length}\n\n`;
        message += `➵ Lista de Waifus:\n`;
        charactersToShow.forEach((char) => {
            message += `> » ${char.name} (¥${char.value})\n`;
        });
        message += `\n> 𖤝 Página › ${page} de ${totalPages}`;
        await ctx.reply(styleText(message), { mentions: [ctx.sender] });
    }
};
