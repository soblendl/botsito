import { extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['kill', 'matar', 'suicidio'],

    async execute(ctx) {
        const { msg, sender, from, chatId } = ctx;

        const gifs = [
            'https://soblend-api.drexelxx.workers.dev/storage/ce1e6f95-12c8-4672-9ac4-7fbd234bd28e.mp4',
            'https://soblend-api.drexelxx.workers.dev/storage/5be40e0a-6f18-4600-b70a-9472fb8eba1b.mp4',
            'https://soblend-api.drexelxx.workers.dev/storage/0539b151-9679-4d4a-8faa-1428184e5107.mp4',
            'https://soblend-api.drexelxx.workers.dev/storage/b8127921-db79-40bf-8dc7-f4b6e76ce238.mp4'
        ];

        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        const mentioned = extractMentions(ctx);
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

        let who;
        if (mentioned.length > 0) {
            who = mentioned[0];
        } else if (quoted) {
            who = quoted;
        }

        const senderName = from.name || sender.split('@')[0];
        let caption = '';
        let mentions = [];

        if (who && who !== sender) {
            // Kill someone
            let targetName;
            try {
                if (chatId.endsWith('@g.us')) {
                    const groupMetadata = await ctx.bot.groupMetadata(chatId);
                    const whoNumber = who.split('@')[0].split(':')[0];

                    const participant = groupMetadata.participants.find(p => {
                        const participantNumber = p.id.split('@')[0].split(':')[0];
                        return participantNumber === whoNumber;
                    });

                    targetName = participant?.notify || participant?.name || whoNumber;
                } else {
                    targetName = who.split('@')[0].split(':')[0];
                }
            } catch (e) {
                targetName = who.split('@')[0].split(':')[0];
            }
            caption = styleText(`\`${senderName}\` mató a \`${targetName}\` (ง'̀-'́)ง`);
            mentions = [who];
        } else {
            // Suicide
            caption = styleText(`\`${senderName}\` se suicidó... ✘_ ✘`);
        }

        await ctx.replyWithVideo(randomGif, {
            caption: caption,
            gifPlayback: true,
            mentions: mentions
        });
    }
};
