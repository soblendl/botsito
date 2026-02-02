import { styleText } from '../lib/utils.js';

export default {
    commands: ['tiktok', 'ttk', 'tt'],

    async execute(ctx) {
        const { msg: m, chatId, args, bot } = ctx;
        const links = m.message?.conversation?.match(/https?:\/\/(www|vt|vm|t)?\.?tiktok\.com\/\S+/g) ||
            m.message?.extendedTextMessage?.text?.match(/https?:\/\/(www|vt|vm|t)?\.?tiktok\.com\/\S+/g) ||
            args.filter(arg => /https?:\/\/(www|vt|vm|t)?\.?tiktok\.com\/\S+/.test(arg));

        if (!links || links.length === 0) {
            return await bot.sendMessage(chatId, {
                text: styleText(`《✧》 *Uso incorrecto del comando*\n\n` +
                    `*Ejemplos:*\n` +
                    `✿ #tiktok https://www.tiktok.com/@user/video/xxx`)
            });
        }

        // Verificar memoria disponible antes de descargar
        const memCheck = global.memoryManager?.canProcessDownload();
        if (memCheck && !memCheck.allowed) {
            return await bot.sendMessage(chatId, {
                text: styleText(memCheck.message)
            });
        }

        // Limitar a 3 links para no saturar memoria
        const linksToProcess = links.slice(0, 3);
        if (links.length > 3) {
            await bot.sendMessage(chatId, {
                text: styleText('⚠️ Solo se procesarán los primeros 3 enlaces.')
            });
        }

        for (const link of linksToProcess) {
            try {
                const response = await fetch(`https://www.tikwm.com/api?url=${link}`);
                const result = await response.json();
                const data = result.data;

                if (!data || (!data.play && !data.images?.length)) {
                    await bot.sendMessage(chatId, {
                        text: styleText(`《✧》 No se pudo obtener información del enlace '${link}'`)
                    });
                    continue;
                }

                if (data.images?.length) {
                    // Limitar imágenes para no saturar memoria
                    const maxImages = Math.min(data.images.length, 5);
                    for (let index = 0; index < maxImages; index++) {
                        const imageUrl = data.images[index];
                        const caption = index === 0 ?
                            styleText(`《✧》 *TikTok Download*\n\n✿ *Título:* ${data.title || 'Sin título'}\n\n_Powered By DeltaByte_`) :
                            null;

                        await bot.sendMessage(chatId, {
                            image: { url: imageUrl },
                            caption: caption
                        });
                    }
                    if (data.images.length > maxImages) {
                        await bot.sendMessage(chatId, {
                            text: styleText(`⚠️ Solo se mostraron ${maxImages} de ${data.images.length} imágenes.`)
                        });
                    }
                } else if (data.play) {
                    const caption = styleText(`《✧》 *TikTok Download*\n\n` +
                        `✿ *Título:* ${data.title || 'Sin título'}\n\n` +
                        `_Powered By DeltaByte_`);

                    await bot.sendMessage(chatId, {
                        video: { url: data.play },
                        caption: caption,
                        mimetype: 'video/mp4'
                    });
                }

            } catch (error) {
                console.error('Error procesando enlace de TikTok:', error);
                
                // Manejar error de memoria
                if (error.code === 'ENOSPC' || error.message?.includes('ENOSPC')) {
                    global.memoryManager?.forceCleanup();
                    await bot.sendMessage(chatId, {
                        text: styleText('ꕤ Error de espacio/memoria. Intenta en unos segundos.')
                    });
                    return; // Salir del loop si hay error de memoria
                }
                
                await bot.sendMessage(chatId, {
                    text: styleText(`《✧》 Error al procesar el enlace: ${link}\n\n💡 *Tip:* Asegúrate de que el video sea público.`)
                });
            }
        }
    }
};
