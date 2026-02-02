export class MessageCache {
    constructor() {
        this.templates = {
            noPermission: 'ꕤ No tienes permisos para usar este comando',
            notAdmin: 'ꕤ Debes ser administrador para usar este comando',
            botNotAdmin: 'ꕤ El bot necesita ser administrador',
            groupOnly: 'ꕤ Este comando solo funciona en grupos',
            invalidArgs: 'ꕤ Argumentos inválidos',
            cooldown: (time) => `ꕤ Espera ${time} antes de usar este comando de nuevo`,
            success: 'ꕥ Comando ejecutado exitosamente'
        };
    }
    get(key, ...args) {
        const template = this.templates[key];
        return typeof template === 'function' ? template(...args) : template;
    }
}

export const messageCache = new MessageCache();