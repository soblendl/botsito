import { styleText } from '../lib/utils.js';

export default {
    commands: ['level', 'lvl', 'rank', 'xp'],

    async execute(ctx) {
        const { levelService } = ctx;
        const rank = await levelService.getRank(ctx.sender);
        const barLength = 20;
        const filled = Math.floor((rank.progress / 100) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        const text = `╭─────── ୨୧ ───────╮
│ *Rango de usuario*
╰────────────────╯
✿ *::* *Usuario* › ${ctx.from.name}
✿ *::* *Nivel*   › ${rank.level}
✿ *::* *XP*      › ${rank.xp} / ${rank.required}

╭─── ⚐ Progreso ───╮
│ [${bar}] ${rank.progress}%
╰────────────────╯`;
        return await ctx.reply(styleText(text));
    }
};
