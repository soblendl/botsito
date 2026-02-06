import axios from 'axios';
import { styleText } from '../../utils/helpers.js';
export default {
    commands: ['chatgpt', 'gpt'],
    async execute(ctx) {
        const { bot, chatId, args, text, reply } = ctx;
        if (!text) {
            await reply(styleText('ꕢ Por favor escribe algo para hablar con ChatGPT.\nEjemplo: #chatgpt Hola, ¿qué puedes hacer?'));
            return;
        }
        try {
            const apiUrl = `https://api.stellarwa.xyz/ai/chatgpt?text=${encodeURIComponent(text)}&key=stellar-CEpNm0hd`;
            const response = await axios.get(apiUrl);
            const data = response.data;
            if (!data || !data.status || !data.result) {
                await reply(styleText('ꕢ No pude obtener una respuesta de ChatGPT. Inténtalo más tarde.'));
                return;
            }
            await reply(styleText(data.result));
        } catch (error) {
            console.error('[ChatGPT] Error:', error);
            await reply(styleText('ꕢ Error al obtener respuesta de ChatGPT.'));
        }
    }
};
