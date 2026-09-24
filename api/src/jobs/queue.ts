import { JobRecord } from "../schemas/index.js";
import { config } from "../config.js";

const queue: JobRecord[] = [];

export function enqueue(job: JobRecord): void {
  queue.push(job);
}

export function dequeue(): JobRecord | undefined {
  return queue.shift();
}

export function depth(): number {
  return queue.length;
}

export function isFull(): boolean {
  return queue.length >= config.maxQueueDepth;
}
