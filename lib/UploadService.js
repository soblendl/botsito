import axios from 'axios';
import { randomUUID } from 'crypto';
import FormData from 'form-data';

/**
 * Servicio para subir archivos a CatBox y Bunny CDN
 */
export class UploadService {
    // Bunny CDN Storage Configuration
    static STORAGE_ZONE = 'olasoy';
    static ACCESS_KEY = 'd4dc5458-3015-4408-aff39f7a63bf-7977-4f9e';
    static STORAGE_URL = 'https://storage.bunnycdn.com';
    static CDN_URL = 'https://soblendz.b-cdn.net';

    // CatBox Configuration
    static CATBOX_URL = 'https://catbox.moe/user/api.php';
    static CATBOX_USERHASH = ''; // Opcional: agrega tu userhash si tienes cuenta

    /**
     * Sube un archivo a CatBox (hosting gratuito)
     * @param {Buffer} buffer - Buffer del archivo a subir
     * @param {string} filename - Nombre opcional del archivo
     * @returns {Promise<string>} URL del archivo subido
     */
    static async uploadToCatbox(buffer, filename = null) {
        try {
            // Detectar tipo de archivo
            let ext = 'jpg';
            let mimeType = 'image/jpeg';
            
            try {
                const fileTypeModule = await import('file-type');
                const fileTypeFromBuffer = fileTypeModule.fileTypeFromBuffer || fileTypeModule.default?.fileTypeFromBuffer;
                
                if (fileTypeFromBuffer && buffer) {
                    const type = await fileTypeFromBuffer(buffer);
                    if (type) {
                        ext = type.ext;
                        mimeType = type.mime;
                    }
                }
            } catch (e) {
                console.warn('[UploadService] No se pudo detectar tipo de archivo, usando jpg por defecto');
            }

            // Generar nombre de archivo si no se proporciona
            if (!filename) {
                filename = `waifu_${Date.now()}.${ext}`;
            }

            console.log(`[UploadService] Subiendo a CatBox: ${filename}`);

            // Crear FormData
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, {
                filename: filename,
                contentType: mimeType
            });

            // Agregar userhash si está disponible (opcional)
            if (this.CATBOX_USERHASH) {
                form.append('userhash', this.CATBOX_USERHASH);
            }

            // Realizar la petición
            const response = await axios.post(this.CATBOX_URL, form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 60000, // 60 segundos
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            // CatBox retorna la URL directamente en el body
            const imageUrl = response.data.trim();

            // Validar que la respuesta sea una URL válida
            if (!imageUrl || !imageUrl.startsWith('http')) {
                throw new Error(`Respuesta inválida de CatBox: ${imageUrl}`);
            }

            console.log(`[UploadService] Subida exitosa a CatBox: ${imageUrl}`);
            return imageUrl;

        } catch (error) {
            console.error('[UploadService] Error en CatBox:', error.message);
            
            // Si CatBox falla, intentar con Bunny CDN como respaldo
            console.log('[UploadService] Intentando respaldo con Bunny CDN...');
            try {
                return await this.uploadToBunny(buffer);
            } catch (bunnyError) {
                console.error('[UploadService] Bunny CDN también falló:', bunnyError.message);
                throw new Error(`Falló CatBox y Bunny CDN: ${error.message}`);
            }
        }
    }

    /**
     * Sube un archivo a Bunny CDN
     * @param {Buffer} buffer - Buffer del archivo a subir
     * @returns {Promise<string>} URL del archivo subido
     */
    static async uploadToBunny(buffer) {
        try {
            // Detectar tipo de archivo
            let ext = 'jpg';
            try {
                const fileTypeModule = await import('file-type');
                const fileTypeFromBuffer = fileTypeModule.fileTypeFromBuffer || fileTypeModule.default?.fileTypeFromBuffer;
                
                if (fileTypeFromBuffer && buffer) {
                    const type = await fileTypeFromBuffer(buffer);
                    if (type) ext = type.ext;
                }
            } catch (e) {
                console.warn('[UploadService] No se pudo detectar tipo de archivo, usando jpg por defecto');
            }

            // Generar nombre único
            const filename = `waifus/${randomUUID()}.${ext}`;
            const uploadUrl = `${this.STORAGE_URL}/${this.STORAGE_ZONE}/${filename}`;

            console.log(`[UploadService] Subiendo a Bunny CDN: ${filename}`);

            const response = await axios.put(uploadUrl, buffer, {
                headers: {
                    'AccessKey': this.ACCESS_KEY,
                    'Content-Type': 'application/octet-stream'
                },
                timeout: 60000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            if (response.status === 201 || response.status === 200) {
                const cdnUrl = `${this.CDN_URL}/${filename}`;
                console.log(`[UploadService] Subida exitosa a Bunny CDN: ${cdnUrl}`);
                return cdnUrl;
            } else {
                throw new Error(`Error de Bunny CDN: ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.error('[UploadService] Error en Bunny CDN:', error.message);
            throw error;
        }
    }

    /**
     * Sube un archivo intentando primero CatBox, luego Bunny CDN como respaldo
     * @param {Buffer} buffer - Buffer del archivo a subir
     * @returns {Promise<string>} URL del archivo subido
     */
    static async uploadWithFallback(buffer) {
        try {
            return await this.uploadToCatbox(buffer);
        } catch (error) {
            console.warn('[UploadService] Usando Bunny CDN como respaldo definitivo');
            return await this.uploadToBunny(buffer);
        }
    }

    /**
     * Elimina un archivo de CatBox (requiere userhash)
     * @param {string} filename - Nombre del archivo a eliminar
     * @returns {Promise<boolean>} true si se eliminó exitosamente
     */
    static async deleteFromCatbox(filename) {
        if (!this.CATBOX_USERHASH) {
            throw new Error('Se requiere CATBOX_USERHASH para eliminar archivos');
        }

        try {
            const form = new FormData();
            form.append('reqtype', 'deletefiles');
            form.append('userhash', this.CATBOX_USERHASH);
            form.append('files', filename);

            const response = await axios.post(this.CATBOX_URL, form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            return response.data.trim() === 'Files successfully deleted.';
        } catch (error) {
            console.error('[UploadService] Error eliminando de CatBox:', error.message);
            throw error;
        }
    }
}