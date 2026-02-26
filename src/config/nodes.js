export const CLUSTER_CONFIG = {
    secret: process.env.CLUSTER_SECRET || 'kaoruko-cluster-2026',
    role: process.env.NODE_ROLE || 'main',
    nodeId: process.env.NODE_ID || 'main',
    port: parseInt(process.env.SERVER_PORT || process.env.PORT || '3001'),
    nodes: [
        { id: 'main', url: 'http://64.20.54.50:30074', maxSessions: 5 },
        { id: 'worker-1', url: 'http://64.20.54.50:30131', maxSessions: 50 },
        { id: 'worker-2', url: 'http://64.20.54.50:30135', maxSessions: 50 }
    ]
};
