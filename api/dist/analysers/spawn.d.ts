export interface SpawnOptions {
    timeout?: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}
export declare function spawnSafe(cmd: string, args: string[], options?: SpawnOptions): Promise<{
    stdout: string;
    stderr: string;
    code: number;
}>;
//# sourceMappingURL=spawn.d.ts.map