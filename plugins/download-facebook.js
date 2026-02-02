import { styleText } from '../lib/utils.js';

/*
* Nama fitur : Facebook Video Downloader
* Type : Plugin Esm
* Sumber : https://whatsapp.com/channel/0029Vb6Zs8yEgGfRQWWWp639
* Author : ZenzzXD
*/

const fbvdl = async (urlFesnuk) => {
    if (typeof urlFesnuk !== "string") throw Error(`Link inválido`)
    const r = await fetch("https://fdown.net/download.php", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ URLz: urlFesnuk })
    })
    if (!r.ok) {
        throw Error(`Error al conectar con el servidor de descarga`)
    }
    const html = await r.text()
    const hd = html.match(/id="hdlink" href="(.+?)" download/)?.[1]?.replaceAll("&amp;", "&")
    const sd = html.match(/id="sdlink" href="(.+?)" download/)?.[1]?.replaceAll("&amp;", "&")
    if (!hd && !sd) throw Error(`No se encontró video descargable. Asegúrate de que sea público.`)
    return { hd, sd }
}

export default {
    commands: ['facebook', 'fb', 'fbdl'],
    tags: ['download'],
    help: ['facebook <url>'],

    async execute(ctx) {
        const { args, reply, replyWithVideo } = ctx;

        if (args.length === 0) {
            return await reply(styleText(
                `ꕤ *Uso incorrecto del comando*\\n\\n` +
                `Ejemplo:\\n` +
                `> #facebook https://www.facebook.com/watch?v=xxxxx\\n` +
                `> #fb https://fb.watch/xxxxx`
            ));
        }

        const url = args[0];
        if (!url.match(/(facebook\.com|fb\.watch)/i)) {
            return await reply(styleText('ꕤ Por favor ingresa un link válido de Facebook.'));
        }

        await reply(styleText('ꕥ Procesando tu video...'));

        try {
            const { hd, sd } = await fbvdl(url);
            const videoUrl = hd || sd;

            await replyWithVideo(videoUrl, {
                caption: styleText(
                    `ꕥ *Facebook Downloader*\\n\\n` +
                    `> ✿ *Calidad* » ${hd ? 'HD' : 'SD'}\\n` +
                    `> ✿ *Link original* » ${url}`
                ),
                fileName: 'facebook_video.mp4'
            });

        } catch (error) {
            console.error('Error en comando facebook:', error);
            await reply(styleText(`ꕤ Error: ${error.message}`));
        }
    }
};
