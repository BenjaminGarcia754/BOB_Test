import { JobRecord } from "../schemas/index.js";
export declare function enqueue(job: JobRecord): void;
export declare function dequeue(): JobRecord | undefined;
export declare function depth(): number;
export declare function isFull(): boolean;
//# sourceMappingURL=queue.d.ts.map