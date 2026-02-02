import axios from 'axios';
import { styleText } from '../lib/utils.js';

export default {
    commands: ['claude'],
    tags: ['ai'],
    help: ['claude <texto>'],

    async execute(ctx) {
        const { bot, chatId, args, text, reply } = ctx;

        if (!text) {
            return await reply(styleText('ꕤ Por favor escribe algo para hablar con Claude.\nEjemplo: #claude Hola, ¿qué puedes hacer?'));
        }

        try {
            const apiUrl = `https://mayapi.ooguy.com/ai-claude?q=${encodeURIComponent(text)}&apikey=may-2c29b3db`;
            const response = await axios.get(apiUrl);
            const data = response.data;
            if (!data || !data.status || !data.result) {
                return await reply(styleText('ꕤ No pude obtener una respuesta de Claude. Inténtalo más tarde.'));
            }

            await reply(styleText(data.result));
        } catch (error) {
            console.error('[Claude] Error:', error);
            await reply(styleText('ꕤ Ocurrió un error al conectar con Claude.'));
        }
    }
};
