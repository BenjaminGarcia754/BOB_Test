import { JobRecord, PhaseRecord } from "../schemas/index.js";
type PhaseName = "queued" | "preparing" | "scanning" | "reporting" | "completed";
export declare function transition(job: JobRecord, toPhase: PhaseName): void;
export declare function failJob(job: JobRecord, phase: string, err: unknown): Promise<void>;
export declare function createInitialPhases(): PhaseRecord[];
export declare function processJob(job: JobRecord): Promise<void>;
export declare function startWorker(): void;
export declare function startCleanupLoop(): void;
export {};
//# sourceMappingURL=worker.d.ts.map