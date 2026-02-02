import { styleText } from '../lib/utils.js';
import fs from 'node:fs';
import crypto from 'node:crypto';
import axios from 'axios';
import FormData from 'form-data';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseApi = "https://api.unblurimage.ai";

async function jsonFetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { return { __httpError: true, status: res.status, raw: text }; }
    if (!res.ok) return { __httpError: true, status: res.status, raw: json };
    return json;
}

async function upscaleVideo(videoPath) {
    const productSerial = crypto.randomUUID().replace(/-/g, "");
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const uploadForm = new FormData();
    uploadForm.append("video_file_name", `cli-${Date.now()}.mp4`);

    const uploadResp = await axios.post(
        `${baseApi}/api/upscaler/v1/ai-video-enhancer/upload-video`,
        uploadForm,
        { headers: uploadForm.getHeaders() }
    ).then(r => r.data)
        .catch(e => ({ __httpError: true, status: e.response?.status, raw: e.response?.data }));

    if (uploadResp.__httpError || uploadResp.code !== 100000) {
        throw new Error(`Error al solicitar URL de subida. Código: ${uploadResp.code || uploadResp.status}`);
    }

    const { url: uploadUrl, object_name } = uploadResp.result || {};
    if (!uploadUrl || !object_name) throw new Error("No se obtuvo URL de subida o nombre de objeto.");

    await axios.put(uploadUrl, fs.createReadStream(videoPath), {
        headers: { "content-type": "video/mp4" }
    });

    const cdnUrl = `https://cdn.unblurimage.ai/${object_name}`;
    const jobForm = new FormData();
    jobForm.append("original_video_file", cdnUrl);
    jobForm.append("resolution", "2k");
    jobForm.append("is_preview", "false");

    const createJobResp = await axios.post(
        `${baseApi}/api/upscaler/v2/ai-video-enhancer/create-job`,
        jobForm,
        { headers: { ...jobForm.getHeaders(), "product-serial": productSerial, authorization: "" } }
    ).then(r => r.data)
        .catch(e => ({ __httpError: true, status: e.response?.status, raw: e.response?.data }));

    if (createJobResp.__httpError || createJobResp.code !== 100000) {
        throw new Error(`Error al crear trabajo. Código: ${createJobResp.code || createJobResp.status}`);
    }

    const { job_id } = createJobResp.result || {};
    if (!job_id) throw new Error("No se encontró el ID del trabajo.");

    const maxTotalWaitMs = 5 * 60 * 1000;
    const startTime = Date.now();
    let attempt = 0;
    let result;

    while (true) {
        attempt++;
        const jobResp = await jsonFetch(
            `${baseApi}/api/upscaler/v2/ai-video-enhancer/get-job/${job_id}`,
            {
                method: "GET",
                headers: { "product-serial": productSerial, authorization: "" }
            }
        );

        if (jobResp.__httpError) {
            // Continuar intentando
        } else if (jobResp.code === 100000) {
            result = jobResp.result || {};
            if (result.output_url) break;
        } else if (jobResp.code !== 300010) {
            throw new Error(`Trabajo falló o estado desconocido. Código: ${jobResp.code}`);
        }

        if (Date.now() - startTime > maxTotalWaitMs) {
            throw new Error(`Tiempo de espera excedido después de ${Math.round((Date.now() - startTime) / 1000)} segundos.`);
        }

        const waitTime = attempt === 1 ? 30000 : 10000;
        await sleep(waitTime);
    }

    const { output_url } = result;
    if (output_url) return output_url;
    else throw new Error("El trabajo finalizó, pero no se encontró la URL de salida.");
}

export default {
    commands: ['videohd', 'vhd'],

    async execute(ctx) {
        const quotedMsg = ctx.message?.message?.extendedTextMessage?.contextInfo;
        const videoMsg = quotedMsg?.quotedMessage?.videoMessage || ctx.message?.message?.videoMessage;

        if (!videoMsg) {
            return ctx.reply(styleText(
                `ꕥ *Mejorador de Video HD*\n\n` +
                `> ⚠️ Por favor envía un video o cita un mensaje con video.`
            ));
        }

        const statusMsg = await ctx.reply(styleText(
            `ꕥ *Mejorador de Video HD*\n\n` +
            `> 📥 Descargando video...\n` +
            `> ⏳ Esto puede tardar varios minutos.`
        ));

        let inputPath;
        let outputPath;

        try {
            // Descargar el video
            const videoBuffer = await ctx.bot.downloadMediaMessage(
                quotedMsg ? { message: quotedMsg.quotedMessage } : ctx.message
            );

            // Guardar el video temporalmente
            inputPath = join(tmpdir(), `input_${Date.now()}.mp4`);
            fs.writeFileSync(inputPath, videoBuffer);

            // Actualizar estado
            await ctx.bot.sendMessage(ctx.chatId, {
                text: styleText(
                    `ꕥ *Mejorador de Video HD*\n\n` +
                    `> ✅ Video descargado\n` +
                    `> 🔄 Mejorando calidad a 2K...\n` +
                    `> ⏳ Procesando (puede tardar 3-5 minutos)`
                ),
                edit: statusMsg.key
            });

            // Mejorar el video
            const outputUrl = await upscaleVideo(inputPath);

            // Actualizar estado
            await ctx.bot.sendMessage(ctx.chatId, {
                text: styleText(
                    `ꕥ *Mejorador de Video HD*\n\n` +
                    `> ✅ Mejora completada\n` +
                    `> 📥 Descargando video mejorado...`
                ),
                edit: statusMsg.key
            });

            // Descargar el video mejorado
            const response = await axios.get(outputUrl, { responseType: 'arraybuffer' });
            outputPath = join(tmpdir(), `output_${Date.now()}.mp4`);
            fs.writeFileSync(outputPath, response.data);

            // Enviar el video mejorado
            await ctx.bot.sendMessage(ctx.chatId, {
                video: fs.readFileSync(outputPath),
                caption: styleText(
                    `ꕥ *Video Mejorado a 2K*\n\n` +
                    `> ✨ Calidad mejorada exitosamente\n` +
                    `> 🎬 Resolución: 2K`
                ),
                mimetype: 'video/mp4'
            });

            // Eliminar mensaje de estado
            await ctx.bot.sendMessage(ctx.chatId, {
                delete: statusMsg.key
            });

        } catch (error) {
            console.error('Error al mejorar video:', error);
            await ctx.bot.sendMessage(ctx.chatId, {
                text: styleText(
                    `ꕥ *Mejorador de Video HD*\n\n` +
                    `> ❌ Error: ${error.message}\n` +
                    `> 💡 Intenta con un video más pequeño o inténtalo más tarde.`
                ),
                edit: statusMsg.key
            });
        } finally {
            // Limpiar archivos temporales
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};