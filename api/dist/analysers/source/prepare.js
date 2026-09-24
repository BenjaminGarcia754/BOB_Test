"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepository = cloneRepository;
exports.extractZip = extractZip;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const spawn_js_1 = require("../spawn.js");
const config_js_1 = require("../../config.js");
async function cloneRepository(url, destDir) {
    fs_1.default.mkdirSync(destDir, { recursive: true });
    const args = ["clone", "--depth", "1", "--", url, destDir];
    const result = await (0, spawn_js_1.spawnSafe)("git", args, { timeout: config_js_1.config.analysisTimeoutMs });
    if (result.code !== 0) {
        throw new Error(`TOOL_ERROR: git clone failed (exit ${result.code}): ${result.stderr.slice(0, 500)}`);
    }
    // Get commit SHA
    const headResult = await (0, spawn_js_1.spawnSafe)("git", ["rev-parse", "HEAD"], {
        cwd: destDir,
        timeout: 10_000,
    });
    return headResult.stdout.trim() || "unknown";
}
async function extractZip(zipPath, destDir) {
    fs_1.default.mkdirSync(destDir, { recursive: true });
    const buffer = fs_1.default.readFileSync(zipPath);
    const sha256 = crypto_1.default.createHash("sha256").update(buffer).digest("hex");
    await safeExtract(buffer, destDir);
    return sha256;
}
async function safeExtract(buffer, destDir) {
    // Use yauzl for safe ZIP extraction
    const yauzl = await Promise.resolve().then(() => __importStar(require("yauzl")));
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
            if (err || !zipfile) {
                reject(new Error(`TOOL_ERROR: Failed to open ZIP: ${err?.message}`));
                return;
            }
            let fileCount = 0;
            let totalUncompressed = 0;
            zipfile.readEntry();
            zipfile.on("entry", (entry) => {
                const entryName = entry.fileName;
                // Block path traversal
                if (entryName.includes("..") || path_1.default.isAbsolute(entryName)) {
                    zipfile.close();
                    reject(new Error("VALIDATION_ERROR: ZIP contains path traversal entry"));
                    return;
                }
                // Block symlinks (Unix mode bits in externalFileAttributes)
                const isSymlink = (entry.externalFileAttributes >>> 16) === 0xa1ff ||
                    ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000;
                if (isSymlink) {
                    zipfile.close();
                    reject(new Error("VALIDATION_ERROR: ZIP contains symlink entry"));
                    return;
                }
                // Skip directory entries
                if (/\/$/.test(entryName)) {
                    zipfile.readEntry();
                    return;
                }
                fileCount++;
                if (fileCount > config_js_1.config.maxZipFiles) {
                    zipfile.close();
                    reject(new Error(`VALIDATION_ERROR: ZIP contains more than ${config_js_1.config.maxZipFiles} files`));
                    return;
                }
                totalUncompressed += entry.uncompressedSize;
                if (totalUncompressed > config_js_1.config.maxZipUncompressedBytes) {
                    zipfile.close();
                    reject(new Error(`VALIDATION_ERROR: ZIP uncompressed size exceeds ${config_js_1.config.maxZipUncompressedBytes} bytes`));
                    return;
                }
                const destPath = path_1.default.join(destDir, entryName);
                fs_1.default.mkdirSync(path_1.default.dirname(destPath), { recursive: true });
                zipfile.openReadStream(entry, (streamErr, readStream) => {
                    if (streamErr || !readStream) {
                        reject(new Error(`TOOL_ERROR: Cannot read ZIP entry: ${streamErr?.message}`));
                        return;
                    }
                    const writeStream = fs_1.default.createWriteStream(destPath);
                    readStream.pipe(writeStream);
                    writeStream.on("finish", () => zipfile.readEntry());
                    writeStream.on("error", reject);
                    readStream.on("error", reject);
                });
            });
            zipfile.on("end", resolve);
            zipfile.on("error", (e) => reject(new Error(`TOOL_ERROR: ZIP read error: ${e.message}`)));
        });
    });
}
//# sourceMappingURL=prepare.js.map