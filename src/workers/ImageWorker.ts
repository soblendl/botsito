import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface JobData {
    type: string;
    userJid: string;
    profilePicUrl: string;
    options: Record<string, unknown>;
}

interface Job {
    task: 'welcome';
    data: JobData;
    resolve: (buffer: Buffer) => void;
    reject: (error: Error) => void;
}

interface PoolStats {
    poolSize: number;
    activeJobs: number;
    queueSize: number;
}

class ImageWorkerPool {
    private poolSize: number;
    private workers: Worker[];
    private queue: Job[];
    private activeJobs: number;

    constructor(poolSize: number = 2) {
        this.poolSize = poolSize;
        this.workers = [];
        this.queue = [];
        this.activeJobs = 0;
    }

    async generateWelcomeImage(
        type: string,
        userJid: string,
        profilePicUrl: string,
        options: Record<string, unknown> = {}
    ): Promise<Buffer> {
        return new Promise < Buffer > ((resolve, reject) => {
            const job: Job = {
                task: 'welcome',
                data: { type, userJid, profilePicUrl, options },
                resolve,
                reject,
            };

            if (this.activeJobs < this.poolSize) {
                this.executeJob(job);
            } else {
                this.queue.push(job);
            }
        });
    }

    private executeJob(job: Job): void {
        this.activeJobs++;

        import('../utils/CanvasWelcome.js').then((module: { generateWelcomeImage: (type: string, userJid: string, profilePicUrl: string) => Promise<Buffer> }) => {
            const { generateWelcomeImage } = module;

            generateWelcomeImage(job.data.type, job.data.userJid, job.data.profilePicUrl)
                .then((buffer: Buffer) => {
                    job.resolve(buffer);
                    this.activeJobs--;
                    this.processQueue();
                })
                .catch((error: Error) => {
                    job.reject(error);
                    this.activeJobs--;
                    this.processQueue();
                });
        });
    }

    private processQueue(): void {
        if (this.queue.length > 0 && this.activeJobs < this.poolSize) {
            const nextJob = this.queue.shift() as Job;
            this.executeJob(nextJob);
        }
    }

    getStats(): PoolStats {
        return {
            poolSize: this.poolSize,
            activeJobs: this.activeJobs,
            queueSize: this.queue.length,
        };
    }
}

export const imageWorkerPool = new ImageWorkerPool(2);
export default imageWorkerPool;