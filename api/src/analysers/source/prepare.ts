import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawnSafe } from "../spawn.js";
import { config } from "../../config.js";

export async function cloneRepository(url: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const args = ["clone", "--depth", "1", "--", url, destDir];
  const result = await spawnSafe("git", args, { timeout: config.analysisTimeoutMs });
  if (result.code !== 0) {
    throw new Error(`TOOL_ERROR: git clone failed (exit ${result.code}): ${result.stderr.slice(0, 500)}`);
  }
  // Get commit SHA
  const headResult = await spawnSafe("git", ["rev-parse", "HEAD"], {
    cwd: destDir,
    timeout: 10_000,
  });
  return headResult.stdout.trim() || "unknown";
}

export async function extractZip(
  zipPath: string,
  destDir: string
): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const buffer = fs.readFileSync(zipPath);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  await safeExtract(buffer, destDir);
  return sha256;
}

async function safeExtract(buffer: Buffer, destDir: string): Promise<void> {
  // Use yauzl for safe ZIP extraction
  const yauzl = await import("yauzl");
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(new Error(`TOOL_ERROR: Failed to open ZIP: ${err?.message}`));
        return;
      }

      let fileCount = 0;
      let totalUncompressed = 0;

      zipfile.readEntry();
      zipfile.on("entry", (entry: import("yauzl").Entry) => {
        const entryName = entry.fileName;

        // Block path traversal
        if (entryName.includes("..") || path.isAbsolute(entryName)) {
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
        if (fileCount > config.maxZipFiles) {
          zipfile.close();
          reject(new Error(`VALIDATION_ERROR: ZIP contains more than ${config.maxZipFiles} files`));
          return;
        }

        totalUncompressed += entry.uncompressedSize;
        if (totalUncompressed > config.maxZipUncompressedBytes) {
          zipfile.close();
          reject(new Error(`VALIDATION_ERROR: ZIP uncompressed size exceeds ${config.maxZipUncompressedBytes} bytes`));
          return;
        }

        const destPath = path.join(destDir, entryName);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            reject(new Error(`TOOL_ERROR: Cannot read ZIP entry: ${streamErr?.message}`));
            return;
          }
          const writeStream = fs.createWriteStream(destPath);
          readStream.pipe(writeStream);
          writeStream.on("finish", () => zipfile.readEntry());
          writeStream.on("error", reject);
          readStream.on("error", reject);
        });
      });

      zipfile.on("end", resolve);
      zipfile.on("error", (e: Error) => reject(new Error(`TOOL_ERROR: ZIP read error: ${e.message}`)));
    });
  });
}
