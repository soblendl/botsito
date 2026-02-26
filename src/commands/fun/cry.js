import { extractMentions, styleText, getName } from '../../utils/helpers.js';

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
        let targetName;

        if (who === sender) {
            targetName = senderName;
        } else {
            targetName = await getName(ctx.bot, chatId, who);
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
        await ctx.replyWithVideo(video, {
            caption: str,
            gifPlayback: true,
            mentions: [who]
        });
    }
};
