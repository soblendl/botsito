import { styleText, isOwner } from '../../utils/helpers.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    commands: ['generate'],
    tags: ['owner'],
    help: ['generate token <cantidad> <d/y> - Genera un token premium'],
    async execute(ctx) {
        const { args, sender, reply } = ctx;

        // Verificar que sea owner
        if (!isOwner(sender)) {
            return await reply(styleText('⛔ Solo el owner puede usar este comando.'));
        }

        // Validar argumentos
        if (args.length < 3 || args[0].toLowerCase() !== 'token') {
            return await reply(styleText(
                'ꕢ Uso incorrecto.\n\n' +
                '*Ejemplos:*\n' +
                '> #generate token 30 d  (30 días)\n' +
                '> #generate token 1 y   (1 año)\n' +
                '> #generate token 90 d  (90 días)'
            ));
        }

        const cantidad = parseInt(args[1]);
        const unidad = args[2].toLowerCase();

        // Validar cantidad
        if (isNaN(cantidad) || cantidad <= 0) {
            return await reply(styleText('ꕢ La cantidad debe ser un número positivo.'));
        }

        // Validar unidad
        if (!['d', 'y'].includes(unidad)) {
            return await reply(styleText('ꕢ La unidad debe ser "d" (días) o "y" (años).'));
        }

        try {
            const tokenService = ctx.tokenService;

            // Crear el token usando el servicio (maneja lógica y persistencia)
            // convertimos 1y a 365d porque el servicio usa d/h/m
            const durationParam = unidad === 'y' ? `${cantidad * 365}d` : `${cantidad}${unidad}`;

            const token = tokenService.createToken(sender, durationParam);

            // Calcular info para mostrar
            let duracionTexto;
            if (unidad === 'd') {
                duracionTexto = `${cantidad} día${cantidad > 1 ? 's' : ''}`;
            } else {
                duracionTexto = `${cantidad} año${cantidad > 1 ? 's' : ''}`;
            }

            // Responder con el token generado
            await reply(styleText(
                `ꕣ *Token Generado Exitosamente*\n\n` +
                `> *ID* » \`${token.id}\`\n` +
                `> *Duración* » ${duracionTexto}\n` +
                `> *Creado* » ${new Date(token.createdAt).toLocaleString()}\n\n` +
                `> _Usa #prembot ${token.id} para activar_`
            ));

        } catch (error) {
            console.error('[Generate] Error:', error);
            await reply(styleText(`❌ Error al generar el token: ${error.message}`));
        }
    }
};
