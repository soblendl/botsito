import { imageWorkerPool } from '../workers/ImageWorker.js';
import { styleText } from '../utils/helpers.js';
import { globalLogger as logger } from '../utils/logger.js';

export class WelcomeHandler {
    constructor(dbService) {
        this.dbService = dbService;
    }

    async handle(bot, event) {
        const { id, participants, action } = event;

        if (action !== 'add' && action !== 'remove') {
            return;
        }

        try {
            const groupData = await this.dbService.getGroup(id);

            if (!groupData || !groupData.settings) {
                return;
            }

            const metadata = await bot.groupMetadata(id);

            for (const participant of participants) {
                const userJid = this.extractJid(participant);
                if (!userJid) {
                    logger.warn('[WelcomeHandler] Could not extract JID from participant:', participant);
                    continue;
                }

                let shouldSendWelcome = false;
                let shouldSendGoodbye = false;

                if (action === 'add' && groupData.settings.welcome) {
                    shouldSendWelcome = true;
                } else if (action === 'remove' && groupData.settings.goodbye) {
                    shouldSendGoodbye = true;
                }

                if (!shouldSendWelcome && !shouldSendGoodbye) {
                    continue;
                }

                const ppUrl = await this.getProfilePicture(bot, userJid);
                try {
                    if (shouldSendWelcome) {
                        await this.sendWelcome(bot, id, userJid, metadata.subject, ppUrl);
                    } else if (shouldSendGoodbye) {
                        await this.sendGoodbye(bot, id, userJid, metadata.subject, ppUrl);
                    }
                } catch (e) {
                    logger.error('[WelcomeHandler] Error sending message for', userJid, e);
                }
            }
        } catch (error) {
            logger.error('[WelcomeHandler] Error:', error);
        }
    }

    extractJid(participant) {
        if (typeof participant === 'string') {
            return participant;
        }
        if (typeof participant === 'object' && participant !== null) {
            if (participant.phoneNumber) {
                return participant.phoneNumber;
            }
            if (participant.id) {
                return participant.id;
            }
        }
        return null;
    }

    async getProfilePicture(bot, jid) {
        const fallback = 'https://i.pinimg.com/736x/70/dd/61/70dd612c65034b88ebf474a52ef70b46.jpg';
        try {
            const timeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout getting profile picture')), 5000);
            });

            const ppUrl = await Promise.race([
                bot.profilePictureUrl(jid).catch((err) => {
                    if (err?.output?.payload?.statusCode === 404 || err?.data === 404) {
                        return null;
                    }
                    logger.warn('[WelcomeHandler] PFP error:', err.message);
                    return null;
                }),
                timeout
            ]);

            return ppUrl || fallback;
        } catch (error) {
            if (error?.output?.payload?.statusCode !== 404 && error?.data !== 404) {
                logger.warn('[WelcomeHandler] Error getting PFP (using fallback):', error.message);
            }
            return fallback;
        }
    }

    async sendWelcome(bot, chatId, userJid, groupName, ppUrl) {
        const buffer = await imageWorkerPool.generateWelcomeImage('welcome', userJid, ppUrl);
        const userName = userJid.split('@')[0];
        const fkontak = {
            key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
            message: {
                contactMessage: {
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:${userName}\nitem1.TEL;waid=${userName}:${userName}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            },
            participant: '0@s.whatsapp.net'
        };

        const text = styleText(`\
༘⋆✿ *Bienvenido/a* a ${groupName}!
    » @${userName}
૮ ․ ․ ྀིა Espero que la pases bien en este grupo, y no olvides leer las reglas porfis.
> 𖣂 Usa */help* para ver la lista de comandos disponibles.
`.trim());

        await bot.sendMessage(chatId, {
            image: buffer,
            caption: text,
            mentions: [userJid]
        }, { quoted: fkontak });
    }

    async sendGoodbye(bot, chatId, userJid, groupName, ppUrl) {
        const buffer = await imageWorkerPool.generateWelcomeImage('goodbye', userJid, ppUrl);
        const userName = userJid.split('@')[0];
        const fkontak = {
            key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
            message: {
                contactMessage: {
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:${userName}\nitem1.TEL;waid=${userName}:${userName}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            },
            participant: '0@s.whatsapp.net'
        };

        const text = styleText(`\
༘⋆✿ *Adiós* de ${groupName}!
    » @${userName}
૮ ․ ․ ྀིა Esperamos que vuelvas pronto por aquí.
> 𖣂 Kaoruko Waguri Bot
`.trim());

        await bot.sendMessage(chatId, {
            image: buffer,
            caption: text,
            mentions: [userJid]
        }, { quoted: fkontak });
    }
}
