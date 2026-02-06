import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
import { globalLogger as logger } from '../../utils/logger.js';

export default {
    commands: ['speak', 'hablar', 'decir'],
    async execute(ctx) {
        const { bot, msg, args, body } = ctx;
        const text = args.join(' ');

        if (!text) {
            return await ctx.reply(styleText('ꕢ Por favor escribe lo que quieres que diga.\nEjemplo: #speak Hola mundo'));
        }

        await ctx.reply(styleText('ꕢ Generando audio...'));

        try {
            const API_KEY = 'sk_68ede0a29d2fab4f2e7b16db90aed4f749803e6189cf67f4';
            const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
            const response = await axios({
                method: 'post',
                url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
                data: {
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                },
                responseType: 'arraybuffer'
            });

            const audioBuffer = Buffer.from(response.data);

            await bot.sock.sendMessage(ctx.chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: false
            }, { quoted: msg });
        } catch (error) {
            logger.error('Error ElevenLabs:', error.response?.data || error.message);
            await ctx.reply(styleText('ꕢ Error al generar el audio. Verifica la API Key o intenta más tarde.'));
        }
    }
};
