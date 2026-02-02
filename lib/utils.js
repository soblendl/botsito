// Archivo de compatibilidad - Re-exporta todo desde los nuevos módulos
// Esto permite que los archivos viejos que usen '../lib/utils.js' sigan funcionando

export * from '../src/utils/permissions.js';
export * from '../src/utils/helpers.js';
export * from '../src/utils/formatters.js';

// Re-exportar como default también
import * as permissions from '../src/utils/permissions.js';
import * as helpers from '../src/utils/helpers.js';
import * as formatters from '../src/utils/formatters.js';

export default {
    ...permissions,
    ...helpers,
    ...formatters
};
