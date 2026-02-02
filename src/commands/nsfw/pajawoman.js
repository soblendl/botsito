import { styleText, extractMentions, getRandom } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

const VIDEOS = [
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/gu85r4baooj.mp4',
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/ncbnw3qa7sr.mp4',
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/rp6krhtol1.mp4',
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/nt8kltmnjul.mp4',
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/yfoaher1rn.mp4',
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/eql2xsvz7.mp4',
    'https://rogddqelmxyuvhpjvxbf.supabase.co/storage/v1/object/public/files/lcvvie8s64d.mp4'
];

export default {
    commands: ['pajawoman', 'pw'],
    async execute(ctx) {
        const { chatId, isGroup, bot, sender, msg, from } = ctx;

        if (isGroup) {
            const groupData = await ctx.dbService.getGroup(chatId);
            if (!groupData?.settings?.nsfw) {
                return await ctx.reply(styleText('ꕤ Los comandos NSFW están desactivados en este grupo.'));
            }
        }

        try {
            const mentions = extractMentions(ctx);
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            let targetUser = null;

            if (mentions.length > 0) {
                targetUser = mentions[0];
            } else if (quotedParticipant) {
                targetUser = quotedParticipant;
            }

            const senderName = from?.name || msg.pushName || sender.split('@')[0];
            let caption;

            if (targetUser) {
                let targetName = targetUser.split('@')[0];
                if (isGroup) {
                    try {
                        const groupMetadata = await bot.sock.groupMetadata(chatId);
                        const targetId = targetUser.split('@')[0].split(':')[0];
                        const participant = groupMetadata.participants.find(p => {
                            const pId = p.id.split('@')[0].split(':')[0];
                            const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                            return pId === targetId || pLid === targetId;
                        });
                        if (participant) {
                            targetName = participant.notify || participant.name || targetId;
                        }
                    } catch (e) {
                        // ignore bad metadata fetch
                    }
                }
                caption = `\`${senderName}\` se está haciendo una paja con \`${targetName}\` (⸝⸝๑﹏๑⸝⸝)`;
            } else {
                caption = `\`${senderName}\` se está haciendo una paja (⸝⸝๑﹏๑⸝⸝)`;
            }

            const videoUrl = getRandom(VIDEOS);

            await bot.sock.sendMessage(chatId, {
                video: { url: videoUrl },
                caption: styleText(caption),
                gifPlayback: true,
                mentions: targetUser ? [sender, targetUser] : [sender]
            }, { quoted: msg });

        } catch (error) {
            logger.error('[PAJAWOMAN] Error:', error);
            await ctx.reply(styleText('ꕤ Error al enviar el video.'));
        }
    }
};
