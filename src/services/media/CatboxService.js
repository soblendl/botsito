import axios from 'axios';
import FormData from 'form-data';
import { globalLogger as logger } from '../../utils/logger.js';

export class CatboxService {
    static async upload(buffer) {
        try {
            let ext = 'jpg';
            try {
                const fileTypeModule = await import('file-type');
                const fileTypeFromBuffer = fileTypeModule.fileTypeFromBuffer || fileTypeModule.default?.fileTypeFromBuffer;
                if (fileTypeFromBuffer) {
                    const type = await fileTypeFromBuffer(buffer);
                    if (type) ext = type.ext;
                }
            } catch (e) {
                logger.warn('[CatboxService] Could not detect file type, defaulting to jpg');
            }

            const formData = new FormData();
            formData.append('reqtype', 'fileupload');
            formData.append('fileToUpload', buffer, { filename: `file.${ext}` });

            const response = await axios.post('https://catbox.moe/user/api.php', formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });

            return response.data;
        } catch (error) {
            logger.error('[CatboxService] Error:', error.message);
            throw new Error('Error al subir a Catbox');
        }
    }
}
