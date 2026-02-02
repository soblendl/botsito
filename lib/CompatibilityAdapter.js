export class CompatibilityAdapter {
    static adaptContextToLegacy(ctx, bot) {
        return {
            sock: bot.sock,
            m: ctx.message || {},
            context: {
                chatId: ctx.chatId,
                sender: ctx.sender,
                args: ctx.args || [],
                command: ctx.command || '',
                body: ctx.body || ctx.text || '',
                messageType: ctx.messageType || 'text',
                isGroup: ctx.isGroup || false
            }
        };
    }
    static async executeLegacyPlugin(plugin, ctx, bot) {
        try {
            const { sock, m, context } = this.adaptContextToLegacy(ctx, bot);
            await plugin.execute(sock, m, context);
        } catch (error) {
            console.error('𖤐 Error en plugin legacy:', error);
            throw error;
        }
    }
}