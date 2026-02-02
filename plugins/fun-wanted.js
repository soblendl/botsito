import axios from 'axios'
import { styleText } from '../lib/utils.js';

export default {
    commands: ['wanted', 'sebusca'],
    tags: ['fun'],
    help: ['wanted @usuario', 'wanted (responde a mensaje)'],

    async execute(ctx) {
        const { msg, bot, chatId, isGroup } = ctx
        try {
            let targetJid
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
            if (mentionedJid && mentionedJid.length > 0) { targetJid = mentionedJid[0] }
            else if (msg.message?.extendedTextMessage?.contextInfo?.participant) { targetJid = msg.message.extendedTextMessage.contextInfo.participant }
            else { targetJid = ctx.sender }

            // Resolve Name
            let displayName = targetJid.split('@')[0];
            if (isGroup) {
                try {
                    const groupMetadata = await bot.sock.groupMetadata(chatId);
                    const targetId = targetJid.split('@')[0].split(':')[0];
                    const participant = groupMetadata.participants.find(p => {
                        const pId = p.id.split('@')[0].split(':')[0];
                        const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : '';
                        return pId === targetId || pLid === targetId;
                    });
                    if (participant) {
                        displayName = participant.notify || participant.name || targetId;
                    }
                } catch (e) {}
            }

            let profilePicUrl
            try {
                profilePicUrl = await bot.sock.profilePictureUrl(targetJid, 'image')
            } catch {
                profilePicUrl = 'https://i.ibb.co/3Fh9V6p/avatar-contact.png'
            }

            const wantedUrl = `https://api.popcat.xyz/wanted?image=${encodeURIComponent(profilePicUrl)}`
            await bot.sock.sendMessage(chatId, {
                image: { url: wantedUrl },
                caption: styleText(`🚨 *SE BUSCA* 🚨\n\n⚠️ Usuario: ${displayName}\n💰 Recompensa: 1,000,000 coins`),
                mentions: [targetJid]
            }, { quoted: msg })
        } catch (error) {
            console.error('Error en wanted:', error)
            await ctx.reply(styleText('ꕤ Error al crear el poster. Intenta de nuevo.'))
        }
    }
}