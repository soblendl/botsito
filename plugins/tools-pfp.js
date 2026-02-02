import { styleText } from '../lib/utils.js';

export default {
    commands: ['pfp', 'perfil', 'foto'],
    tags: ['tools'],
    help: ['pfp [@user]'],

    async execute(ctx) {
        const { chatId, msg, bot, sender } = ctx;
        const conn = bot?.sock;

        if (!conn) {
            return await ctx.reply(styleText('❌ Error: Conexión no disponible.'));
        }

        let targetJid = sender;
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentions && mentions.length > 0) {
            targetJid = mentions[0];
        }

        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            targetJid = msg.message.extendedTextMessage.contextInfo.participant;
        }

        try {
            let pfpUrl;
            try {
                pfpUrl = await conn.profilePictureUrl(targetJid, 'image');
            } catch (e) {
                pfpUrl = null;
            }

            if (!pfpUrl) {
                return await ctx.reply(styleText('ꕤ El usuario no tiene foto de perfil o es privada.'));
            }

            const caption = `ꕥ *Profile Picture*\n\n` +
                `> *Usuario* » @${targetJid.split('@')[0]}\n` +
                `──────────────────\n` +
                `> _*Powered By DeltaByte*_`;

            await conn.sendMessage(chatId, {
                image: { url: pfpUrl },
                caption: styleText(caption),
                mentions: [targetJid]
            });

        } catch (error) {
            console.error('[PFP] Error:', error);
            await ctx.reply(styleText('ꕤ Ocurrió un error al obtener la foto. Inténtalo más tarde.'));
        }
    }
};
