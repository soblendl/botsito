import { extractMentions, styleText } from '../lib/utils.js';

export default {
    commands: ['cry', 'llorar'],

    async execute(ctx) {
        const { msg, sender, from, chatId } = ctx;

        let who;

        // Determine target
        const mentioned = extractMentions(ctx);
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

        if (mentioned.length > 0) {
            who = mentioned[0];
        } else if (quoted) {
            who = quoted;
        } else {
            who = sender;
        }

        // Get names
        const senderName = from.name || sender.split('@')[0];

        // Try to get target name from group metadata
        let targetName;
        if (who === sender) {
            targetName = senderName;
        } else {
            try {
                if (chatId.endsWith('@g.us')) {
                    const groupMetadata = await ctx.bot.groupMetadata(chatId);
                    const whoNumber = who.split('@')[0].split(':')[0];

                    const participant = groupMetadata.participants.find(p => {
                        const participantNumber = p.id.split('@')[0].split(':')[0];
                        const participantLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                        return participantNumber === whoNumber || participantLid === whoNumber;
                    });

                    targetName = participant?.notify || participant?.name || whoNumber;
                } else {
                    targetName = who.split('@')[0].split(':')[0];
                }
            } catch (e) {
                console.error('[CRY] Error getting name:', e);
                targetName = who.split('@')[0].split(':')[0];
            }
        }

        // React
        try {
            await ctx.bot.sendMessage(chatId, { react: { text: '😭', key: msg.key } });
        } catch (e) { }

        // Build message
        let str;
        if (who !== sender) {
            str = styleText(`\`${senderName}\` está llorando por culpa de \`${targetName}\` (╥﹏╥).`);
        } else {
            str = styleText(`\`${senderName}\` está llorando (╥﹏╥).`);
        }

        // Videos
        const videos = [
            'https://qu.ax/gRjHK.mp4',
            'https://qu.ax/VjjCJ.mp4',
            'https://qu.ax/ltieQ.mp4',
            'https://qu.ax/oryVi.mp4',
            'https://qu.ax/YprzU.mp4',
            'https://qu.ax/nxaUW.mp4',
            'https://qu.ax/woSGV.mp4',
            'https://qu.ax/WkmA.mp4'
        ];

        const video = videos[Math.floor(Math.random() * videos.length)];

        // Send
        await ctx.bot.sendMessage(chatId, {
            video: { url: video },
            caption: str,
            gifPlayback: true,
            mentions: [who]
        }, { quoted: msg });
    }
};
