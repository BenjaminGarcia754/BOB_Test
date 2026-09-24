import multer from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const PE_MAGIC = [0x4d, 0x5a];

function checkMagicBytes(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

export const sourceZipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxSourceZipBytes },
});

export const binaryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxBinaryBytes },
});

export function validateZipMagic(req: Request, res: Response, next: NextFunction): void {
  const file = req.file;
  if (!file) {
    res.status(400).json({
      error: { code: "UNSUPPORTED_FILE", message: "No file uploaded" },
    });
    return;
  }
  if (!checkMagicBytes(file.buffer, ZIP_MAGIC)) {
    res.status(400).json({
      error: {
        code: "UNSUPPORTED_FILE",
        message: "File does not appear to be a ZIP archive (missing PK magic bytes)",
      },
    });
    return;
  }
  next();
}

export function validatePEMagic(req: Request, res: Response, next: NextFunction): void {
  const file = req.file;
  if (!file) {
    res.status(400).json({
      error: { code: "UNSUPPORTED_FILE", message: "No file uploaded" },
    });
    return;
  }
  if (!checkMagicBytes(file.buffer, PE_MAGIC)) {
    res.status(400).json({
      error: {
        code: "UNSUPPORTED_FILE",
        message: "File does not appear to be a PE binary (missing MZ header)",
      },
    });
    return;
  }
  next();
}

export function handleMulterError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      error: { code: "FILE_TOO_LARGE", message: "Uploaded file exceeds size limit" },
    });
    return;
  }
  next(err);
}

export function saveUploadToDisk(destFilename: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.file) {
      const fs = await import("fs");
      const jobId = (req as Request & { jobId?: string }).jobId ?? "tmp";
      const workDir = path.join(config.workDir, jobId, "input");
      fs.mkdirSync(workDir, { recursive: true });
      const destPath = path.join(workDir, destFilename);
      fs.writeFileSync(destPath, req.file.buffer);
      (req as Request & { uploadPath?: string }).uploadPath = destPath;
    }
    next();
  };
}
