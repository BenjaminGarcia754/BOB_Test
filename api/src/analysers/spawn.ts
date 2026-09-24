import { spawn } from "child_process";

export interface SpawnOptions {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export function spawnSafe(
  cmd: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (options.timeout) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* ignore */ } }, 5000);
        reject(new Error(`TIMEOUT: ${cmd} exceeded ${options.timeout}ms`));
      }, options.timeout);
    }

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      if (!timedOut) reject(err);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (!timedOut) {
        resolve({ stdout, stderr, code: code ?? 1 });
      }
    });
  });
}
