import { extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['fuck', 'coger'],
    tags: ['nsfw'],

    async execute(ctx) {
        const { msg, sender, from, chatId, isGroup, dbService, reply, bot } = ctx;

        // Verificar si es grupo y si NSFW está activo
        if (isGroup) {
            const groupData = await dbService.getGroup(chatId);
            if (!groupData.settings?.nsfw) {
                return await reply(styleText('ꕤ Los comandos NSFW están desactivados en este grupo.\n> Un admin debe activarlos con */nsfw on*'));
            }
        }

        let who;

        // Determine target
        const mentioned = extractMentions(ctx);
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned.length > 0) {
            who = mentioned[0];
        } else if (quoted) {
            who = quoted;
        } else {
            who = null; // No one strictly targeted for "solo" mode
        }

        // Get names
        const senderName = from?.name || msg.pushName || sender.split('@')[0];

        // ... (videos array remains here, but I'm skipping it to focus on logic) ...
        const videos = [
            "https://files.catbox.moe/ta67ym.mp4",
            "https://files.catbox.moe/n1ozh5.mp4",
            "https://files.catbox.moe/txg7gt.mp4",
            "https://files.catbox.moe/xhvfa5.mp4",
            "https://files.catbox.moe/4ua8f3.mp4",
            "https://files.catbox.moe/wbbhne.mp4",
            "https://files.catbox.moe/4fx6pj.mp4",
            "https://files.catbox.moe/jyjvod.mp4",
            "https://files.catbox.moe/qw0sh3.mp4",
            "https://files.catbox.moe/x6q2nn.mp4"
        ];
        
        const video = videos[Math.floor(Math.random() * videos.length)];

        let str;
        // Logic for message
        if (who && who !== sender) {
            // "If with someone"
             let targetName = who.split('@')[0].split(':')[0];
            try {
                if (isGroup) {
                    const groupMetadata = await bot.sock.groupMetadata(chatId);
                    const whoId = targetName;
                    const participant = groupMetadata.participants.find(p => {
                         const pId = p.id.split('@')[0].split(':')[0];
                         const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                         return pId === whoId || pLid === whoId;
                    });
                    if (participant) {
                        targetName = participant.notify || participant.name || whoId;
                    }
                }
            } catch (e) {
                // Keep default targetName (number)
            }
            str = styleText(`\`${senderName}\` está cogiendo con \`${targetName}\` ( ⸝⸝´꒳\`⸝⸝)`);
        } else {
            // "If solo"
             // Although users usually don't "fuck" solo, the user requested it: "Si esta solo: '@(usuario) esta cogiendo ( ⸝⸝´꒳`⸝⸝)'"
            str = styleText(`\`${senderName}\` esta cogiendo ( ⸝⸝´꒳\`⸝⸝)`);
        }

        // Send message
        await ctx.replyWithVideo(video, {
            caption: str,
            gifPlayback: true,
            mentions: who ? [who] : []
        });
    }
};
