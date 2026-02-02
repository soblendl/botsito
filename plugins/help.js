import axios from 'axios';
import fs from 'fs';

export default {
    commands: ['help', 'menu'],

    async execute(ctx) {
        try {
            const senderNumber = ctx.sender.split('@')[0];
            const username = ctx.from?.name || senderNumber;

            // Detectar si es un prembot y cargar configuración personalizada
            const tokenService = ctx.tokenService;
            // Usar el ID del bot actual, no del remitente, para cargar la config correcta
            const botId = ctx.bot.sock.user?.id?.split(':')[0] || ctx.bot.sock.user?.id;
            const userId = botId ? `${botId}@s.whatsapp.net` : ctx.sender;
            const prembotConfig = tokenService?.getPrembotConfig?.(userId);
            
            const botName = prembotConfig?.customName || 'Hatsune Miku';
            // Imagen por defecto
            let menuImage = 'https://files.catbox.moe/v5w1h6.jpg'; 
            
            if (prembotConfig?.customImage) {
                menuImage = prembotConfig.customImage;
            }
            
            const userCount = (await ctx.dbService?.getUserCount?.()) || 0;

            // Obtener argumento (sección solicitada) - usar ctx.args directamente
            const section = ctx.args[0]?.toLowerCase();

            // Mapeo de secciones en inglés/español
            const sectionMap = {
                'economia': 'economy',
                'economy': 'economy',
                'gacha': 'gacha',
                'descargas': 'downloads',
                'downloads': 'downloads',
                'buscadores': 'search',
                'search': 'search',
                'utilidades': 'utilities',
                'utilities': 'utilities',
                'utils': 'utilities',
                'diversion': 'fun',
                'diversión': 'fun',
                'fun': 'fun',
                'juegos': 'games',
                'games': 'games',
                'subbot': 'subbot',
                'nsfw': 'nsfw',
                'admin': 'admin',
                'administracion': 'admin',
                'administración': 'admin'
            };

            const requestedSection = sectionMap[section];

            // Secciones del menú
            const sections = {
                header: `╭─────── ୨୧ ───────╮
│  Bot Name › *${botName}*
│  Hola, *${username}*
│  ¿Listo para empezar?
╰─── ⚐ DeltaByte ─────╯
│ ✦ Canal    › https://whatsapp.com/channel/0029VbByI3uL7UVYZD00xF2B
│ ✦ Usuarios › *${userCount}*
│ ✦ v3.3     › Usuario: ${username}
╰────────────────╯`,

                economy: `*╭─⊹ Economía⊹ ࣪ ˖ 𐔌՞. .՞𐦯──╮*
> ✎ \`Gana monedas, apuesta y juégatela\`
✿ *::* *#economy* \`<on/off>\`
> » Desactiva o activa el sistema de economía.
✿ *::* *#balance* • *#bal*
> » Ver tus coins.
✿ *::* *#coinflip* • *#cf* \`<cantidad>\` \`<cara/cruz>\`
> » Apuesta cara o cruz.
✿ *::* *#crime*
> » Haz un robo y gana dinero.
✿ *::* *#daily*
> » Reclama tu recompensa diaria.
✿ *::* *#deposit* • *#d* \`<cantidad>\`
> » Guarda tus coins.
✿ *::* *#economyboard* • *#baltop*
> » Mira el top de usuarios con más monedas.
✿ *::* *#givecoins* • *#pay* \`<@user>\`
> » Regala coins a un usuario.
✿ *::* *#roulette* • *#rt* \`<red/black>\` \`<cantidad>\`
> » Gira la ruleta y gana coins.
✿ *::* *#slut*
> » Trabaja dudosamente para ganar coins.
✿ *::* *#steal* \`<@user>\`
> » Roba coins a un usuario.
✿ *::* *#slot* \`<cantidad>\`
> » Apuesta en la tragaperras (x5 Jackpot).
✿ *::* *#withdraw* • *#wd* \`<cantidad|all>\`
> » Retira una cantidad de coins.
✿ *::* *#work* • *#w*
> » Trabaja y gana coins.
✿ *::* *#beg* • *#pedir*
> » Pide dinero en la calle.
✿ *::* *#fish* • *#pescar*
> » Pesca y gana coins (sistema de rarezas).
✿ *::* *#einfo* \`<@user>\`
> » Mira las estadísticas de economía de alguien.
✿ *::* *#season*
> » Mira la temporada actual del pase de batalla.
✿ *::* *#shop* • *#tienda* \`<pag>\`
> » Abre la tienda de Soblend.
✿ *::* *#buy* • *#comprar* \`<id> <ant>\`
> » Compra objetos de la tienda.
✿ *::* *#inventory* • *#inv*
> » Mira tus objetos comprados.
✿ *::* *#use* • *#usar* \`<id>\`
> » Usa un objeto de tu inventario.
✿ *::* *#level* • *#rank*
> » Mira tu nivel y XP actual.
✿ *::* *#blackjack* • *#bj* \`<apuesta>\`
> » Juega al 21 contra la casa.
*╰────────────────╯*`,

                gacha: `*╭─⊹ Gacha⊹ ࣪ ˖ (˶˃ ᵕ ˂˶)──╮*
> ✎ \`Colecciona waifus e intercámbialos\`
✿ *::* *#claim* • *#c*
> » Reclama una waifu aleatoria.
✿ *::* *#harem* • *#miswaifu*
> » Mira las waifus que tienes.
✿ *::* *#rollwaifu* • *#rw*
> » Mira una waifu aleatoria.
✿ *::* *#give* • *#regalar* \`<id>\` \`<@user>\`
> » Regala una waifu a alguien.
✿ *::* *#sell* • *#vender* \`<id>\`
> » Vende un personaje.
✿ *::* *#antirobo* • *#proteger* \`<hora/dia/semana/mes>\`
> » Protege tus waifus de robos.
✿ *::* *#dar* \`<@user>\` \`<id>\`
> » Da un personaje a otro usuario.
✿ *::* *#desbloquear* • *#unlock* \`<@user>\`
> » Desbloquea la base de un usuario.
✿ *::* *#listawaifus* • *#listwaifus* \`<página>\`
> » Muestra la lista completa de personajes.
✿ *::* *#robarwaifu* • *#robar* \`<id>\`
> » Roba un personaje de otro usuario.
✿ *::* *#resetwaifus*
> » Reinicia todas las waifus (solo owner).
✿ *::* *#delwaifu* \`<id>\`
> » Elimina una waifu de tu colección.
✿ *::* *#vote*
> » Vota por tu waifu favorita.
✿ *::* *#wimage* \`<nombre>\`
> » Busca una imagen de un personaje.
✿ *::* *#winfo* \`<nombre>\`
> » Mira la información de un personaje.
✿ *::* *#wvideo* \`<nombre>\`
> » Mira un video de un personaje.
✿ *::* *#ainfo* \`<anime>\`
> » Ver todos los personajes de un anime específico.
✿ *::* *#wtop*
> » Mira el top de waifus más populares.
✿ *::* *#trade* • *#intercambio* \`<tu_personaje>\` \`<su_personaje>\` \`<@user>\`
> » Intercambia personajes con otro usuario.
✿ *::* *#wcow*
> » Mira la información de tus waifus.
*╰────────────────╯*`,

                downloads: `*╭─⊹ Descargas⊹ ࣪ ˖ 𐔌՞. .՞𐦯──╮*
> ✎ \`Descarga contenido de plataformas\`
✿ *::* *#ig* \`<link>\`
> » Descarga un video de Instagram.
✿ *::* *#tiktok* \`<link>\`
> » Descarga un video de TikTok.
✿ *::* *#mediafire* • *#mf* \`<link>\`
> » Descarga un archivo de Mediafire.
✿ *::* *#youtube* \`<link>\`
> » Descarga un mp3 o mp4 de YouTube.
✿ *::* *#play* \`<query/url>\`
> » Descarga música o video de YouTube.
✿ *::* *#ytmp3* \`<link>\`
> » Descarga audio de YouTube.
✿ *::* *#ytmp4* \`<link>\`
> » Descarga video de YouTube.
✿ *::* *#fb* \`<link>\`
> » Descarga un video de Facebook.
*╰────────────────╯*`,

                search: `*╭─⊹ Buscadores⊹ ࣪ ˖ (╭ರ_•́)──╮*
> ✎ \`Busca en plataformas algun contenido que desees\`
✿ *::* *#googleimages* • *#gimg* \`<texto>\`
> » Busca imágenes en Google.
✿ *::* *#pinterest* \`<texto>\`
> » Busca imágenes en Pinterest.
✿ *::* *#spotify* • *#song* \`<texto>\`
> » Busca y descarga música de Spotify.
✿ *::* *#soundcloud* \`<texto>\`
> » Busca y descarga música de SoundCloud.
✿ *::* *#tiktoksearch* • *#ttss* \`<texto>\`
> » Busca videos en TikTok (carousel).
✿ *::* *#ttuser* • *#tiktokuser* \`<usuario>\`
> » Obtiene info de un usuario de TikTok.
✿ *::* *#wikipedia* • *#wiki* \`<texto>\`
> » Busca información en Wikipedia.
✿ *::* *#lyrics* • *#letra* \`<texto>\`
> » Busca letras de canciones.
✿ *::* *#apk* • *#modapk* \`<texto>\`
> » Busca y descarga aplicaciones APK.
*╰────────────────╯*`,

                utilities: `*╭─⊹ Utilidades⊹ ࣪ ˖ ꉂ(˵˃ ᗜ ˂˵)──╮*
> ✎ \`Comandos útiles\`
✿ *::* *#ping* • *#p*
> » Calcula la velocidad del bot.
✿ *::* *#ai* • *#ia* \`<texto>\`
> » Consulta con Gemini.
✿ *::* *#gemini* \`<texto>\`
> » Consulta con Gemini AI.
✿ *::* *#copilot* \`<texto>\`
> » Habla con Microsoft Copilot AI.
✿ *::* *#claude* \`<texto>\`
> » Habla con Anthropic Claude AI.
✿ *::* *#chatgpt* • *#gpt* \`<texto>\`
> » Habla con ChatGPT AI.
✿ *::* *#sticker* • *#s*
> » Crea un sticker de una imagen o video.
✿ *::* *#toimg* • *#img*
> » Convierte un sticker en imagen.
✿ *::* *#suggest* \`<texto>\`
> » Envía una sugerencia al administrador.
✿ *::* *#hd*
> » Mejora la calidad de una imagen (responde a imagen).
✿ *::* *#obtenerinfo* \`<@user>\`
> » Obtiene información de JID de un usuario.
✿ *::* *#wanted* \`<@user>\`
> » Crea un poster de "Se Busca".
✿ *::* *#speak* \`<texto>\`
> » Convierte texto a voz (Adam).
✿ *::* *#pfp* • *#perfil* \`<@user>\`
> » Obtiene la foto de perfil de un usuario.
✿ *::* *#status* • *#estado*
> » Muestra el estado del bot (uptime, RAM, plataforma).
✿ *::* *#vision* \`<imagen>\`
> » Analiza imágenes con IA.
✿ *::* *#get* \`<url>\`
> » Realiza una petición HTTP GET.
✿ *::* *#ss* \`<url>\`
> » Toma una captura de pantalla de una web.
✿ *::* *#sora* \`<texto>\`
> » Genera un video con Sora AI.
✿ *::* *#profile*
> » Mira tu tarjeta de usuario y estadísticas.
✿ *::* *#setbirth* \`<DD/MM/YYYY>\`
> » Establece tu fecha de nacimiento.
✿ *::* *#setgen* \`<m/f>\`
> » Establece tu género.
*╰────────────────╯*`,

                fun: `*╭─⊹ Diversión⊹ ࣪ ˖ ꉂ(˵˃ ᗜ ˂˵)──╮*
> ✎ \`Comandos para interactuar\`
✿ *::* *#sleep* \`<@user>\`
> » Duerme o toma una siesta con alguien.
✿ *::* *#hug* \`<@user>\`
> » Abraza a alguien.
✿ *::* *#cry* \`<@user>\`
> » Llora por alguien o algo.
✿ *::* *#kiss* \`<@user>\`
> » Besa a alguien.
✿ *::* *#textpro* \`<efecto>\` \`<texto>\`
> » Crea imágenes con texto (neon, magma, etc).
✿ *::* *#dance* \`<@user>\`
> » Baila solo o con alguien.
✿ *::* *#kill* \`<@user>\`
> » Mata a alguien (o suicidate).
✿ *::* *#angry* \`<@user>\`
> » Muestra tu enojo.
✿ *::* *#bored* \`<@user>\`
> » Expresa tu aburrimiento.
✿ *::* *#coffee* \`<@user>\`
> » Toma café solo o acompañado.
*╰────────────────╯*`,

                games: `*╭─⊹ Juegos⊹ ࣪ ˖ ꉂ(˵˃ ᗜ ˂˵)──╮*
> ✎ \`Diviértete con estos minijuegos\`
✿ *::* *#tictactoe* • *#ttt* \`<@user>\`
> » Juega al gato (tres en raya).
✿ *::* *#math*
> » Resuelve problemas matemáticos.
✿ *::* *#trivia* • *#quiz*
> » Responde preguntas y gana coins.
✿ *::* *#adivinanza* • *#adivina*
> » Resuelve adivinanzas y gana coins.
✿ *::* *#love* \`<@user>\`
> » Calculadora de amor.
✿ *::* *#gay* \`<@user>\`
> » Calculadora de porcentaje gay.
✿ *::* *#ppt* \`<piedra/papel/tijera>\`
> » Juega Piedra, Papel o Tijera.
✿ *::* *#ship* \`<@user1>\` \`<@user2>\`
> » Calcula la compatibilidad de amor entre dos personas.
✿ *::* *#fight* • *#pelea* \`<@user>\`
> » Pelea épica contra alguien (sistema de HP).
✿ *::* *#dare* • *#reto* \`<@user>\`
> » Dale un reto a alguien.
✿ *::* *#truth* • *#verdad* \`<@user>\`
> » Hazle una pregunta de verdad a alguien.
✿ *::* *#marry* • *#casar* \`<@user>\`
> » Matrimonio virtual con alguien.
*╰────────────────╯*`,

                subbot: `*╭─⊹ Subbot⊹ ࣪ ˖ (˶ᵔ ᵕ ᵔ˶)──╮*
> ✎ \`Convierte tu número en un bot\`
✿ *::* *#code*
> » Obtén un código de 8 dígitos para vincular tu número.
✿ *::* *#qr* \`<código>\`
> » Obtén un código QR para vincularte.
✿ *::* *#jadibot*
> » Muestra las opciones para convertirte en subbot.
✿ *::* *#stopbot*
> » Detén tu subbot vinculado.
*╰────────────────╯*`,

                nsfw: `*╭─⊹ NSFW⊹ ࣪ ˖ (,,•᷄‎ࡇ•᷅ ,,)?──╮*
> ✎ \`Contenido para adultos\`
✿ *::* *#hbikini*
> » Imágenes de chicas en bikini.
✿ *::* *#himages*
> » Imágenes hentai aleatorias.
✿ *::* *#pornvideo*
> » Videos porno aleatorios.
✿ *::* *#fuck* \`<mention>\`
> » Viola a alguien.
✿ *::* *#pajawoman* \`<mention>\`
> » Hazte una paja sola o con alguien.
✿ *::* *#showtits* \`<mention>\`
> » Muestra las tetas a alguien.
*╰────────────────╯*`,

                admin: `*╭─⊹ Administración⊹ ࣪ ˖ ꉂ(˵˃ ᗜ ˂˵)──╮*
> ✎ \`Administra tu grupo y/o comunidad\`
⟡ *::* *#kick* \`<@user>\`
> » Expulsa a alguien del grupo.
✿ *::* *#ban* \`<@user>\`
> » Banea a alguien del grupo.
✿ *::* *#antilink* \`<on/off>\`
> » Activa el antilink (elimina enlaces de todos).
✿ *::* *#tag* \`<text>\`
> » Anuncia un mensaje a todo el grupo.
✿ *::* *#promote* \`<@user>\`
> » Promueve a alguien a administrador.
✿ *::* *#demote* \`<@user>\`
> » Remueve el administrador a alguien.
✿ *::* *#welcome* \`<on/off>\`
> » Activa/desactiva mensajes de bienvenida.
✿ *::* *#goodbye* \`<on/off>\`
> » Activa/desactiva mensajes de despedida.
✿ *::* *#alertas* \`<on/off>\`
> » Activa o desactiva el sistema de alertas.
✿ *::* *#kickall*
> » Elimina a todos los no-admins del grupo.
✿ *::* *#link* • *#enlace*
> » Obtiene el enlace de invitación del grupo.
✿ *::* *#gp* • *#gpinfo*
> » Información del grupo y estado de sistemas.
✿ *::* *#join* • *#invite* \`<link>\`
> » Une al bot a un grupo por link.
*╰────────────────╯*`
            };

            // Construir el texto según la sección solicitada
            let helpText = '';

            if (requestedSection && sections[requestedSection]) {
                // Mostrar solo la sección solicitada (SIN header)
                helpText = `${sections[requestedSection]}

💡 *Tip:* Usa \`#menu\` para ver todas las categorías disponibles.

*Otras categorías:*
economia, gacha, descargas, buscadores, utilidades, diversion, juegos, subbot, nsfw, admin`;
            } else if (section && !requestedSection) {
                // Sección no válida
                helpText = `❌ *Sección no encontrada:* \`${section}\`

*Categorías disponibles:*
- economia / economy
- gacha
- descargas / downloads
- buscadores / search
- utilidades / utilities
- diversion / fun
- juegos / games
- subbot
- nsfw
- admin / administracion

💡 *Ejemplo:* \`#menu economia\` o \`#menu economy\``;
            } else {
                // Mostrar menú completo
                helpText = `${sections.header}

${sections.economy}

${sections.gacha}

${sections.downloads}

${sections.search}

${sections.utilities}

${sections.fun}

${sections.games}

${sections.subbot}

${sections.nsfw}

${sections.admin}`;
            }

            // Enviar mensaje con thumbnail
            await ctx.bot.sendMessage(ctx.chatId, {
                text: helpText,
                contextInfo: {
                    externalAdReply: {
                        title: botName,
                        body: "Developed By Soblend Development Studio",
                        thumbnailUrl: menuImage, // Now uses the dynamic image (default or custom)
                        mediaType: 1,
                        sourceUrl: "https://bright-light.pages.dev",
                        renderLargerThumbnail: true
                    }
                }
            });
        } catch (error) {
            console.error('[DEBUG] Error sending help with metadata:', error);
            // Fallback: enviar sin imagen
            ctx.reply(helpText);
        }
    }
};