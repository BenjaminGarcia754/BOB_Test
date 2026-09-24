"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnSafe = spawnSafe;
const child_process_1 = require("child_process");
function spawnSafe(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(cmd, args, {
            cwd: options.cwd,
            env: options.env ?? process.env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => { stdout += d.toString(); });
        child.stderr.on("data", (d) => { stderr += d.toString(); });
        let timedOut = false;
        let timer;
        if (options.timeout) {
            timer = setTimeout(() => {
                timedOut = true;
                child.kill("SIGTERM");
                setTimeout(() => { try {
                    child.kill("SIGKILL");
                }
                catch { /* ignore */ } }, 5000);
                reject(new Error(`TIMEOUT: ${cmd} exceeded ${options.timeout}ms`));
            }, options.timeout);
        }
        child.on("error", (err) => {
            if (timer)
                clearTimeout(timer);
            if (!timedOut)
                reject(err);
        });
        child.on("close", (code) => {
            if (timer)
                clearTimeout(timer);
            if (!timedOut) {
                resolve({ stdout, stderr, code: code ?? 1 });
            }
        });
    });
}
//# sourceMappingURL=spawn.js.map