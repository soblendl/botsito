class InMemoryQueue {
    constructor(name) {
        this.name = name;
        this.jobs = [];
        this.processor = null;
        this.processing = false;
    }
    async add(data, options = {}) {
        const job = {
            id: Date.now() + Math.random(),
            data,
            options,
            timestamp: Date.now()
        };
        this.jobs.push(job);
        this.processNext();
        return job;
    }
    process(concurrency, processor) {
        this.processor = processor;
        this.processNext();
    }
    async processNext() {
        if (this.processing || !this.processor || this.jobs.length === 0) return;
        this.processing = true;
        while (this.jobs.length > 0) {
            const job = this.jobs.shift();
            try {
                await this.processor(job);
            } catch (err) {
                console.error(`InMemoryQueue ${this.name} job error:`, err);
            }
        }
        this.processing = false;
    }
}
class QueueManager {
    constructor() {
        this.queues = new Map();
        this.useRedis = false;
        this.Bull = null;
    }
    async init() {
        try {
            const BullModule = await import('bull');
            this.Bull = BullModule.default;
            const testQueue = new this.Bull('test-connection', {
                redis: { port: 6379, host: '127.0.0.1' }
            });
            await testQueue.isReady();
            await testQueue.close();
            this.useRedis = true;
            console.log('📌 QueueManager: Redis disponible');
        } catch (err) {
            this.useRedis = false;
            console.log('⚠️ QueueManager: Redis no disponible, usando cola en memoria');
        }
    }
    getQueue(name, options = {}) {
        if (!this.queues.has(name)) {
            let queue;
            if (this.useRedis && this.Bull) {
                queue = new this.Bull(name, {
                    redis: { port: 6379, host: '127.0.0.1' },
                    ...options
                });
            } else {
                queue = new InMemoryQueue(name);
            }
            this.queues.set(name, queue);
        }
        return this.queues.get(name);
    }
    async addJob(queueName, data, options = {}) {
        const queue = this.getQueue(queueName);
        return await queue.add(data, options);
    }
    process(queueName, processor, concurrency = 1) {
        const queue = this.getQueue(queueName);
        queue.process(concurrency, processor);
    }
    isUsingRedis() {
        return this.useRedis;
    }
}

export default QueueManager;