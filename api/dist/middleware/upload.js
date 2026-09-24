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
exports.binaryUpload = exports.sourceZipUpload = void 0;
exports.validateZipMagic = validateZipMagic;
exports.validatePEMagic = validatePEMagic;
exports.handleMulterError = handleMulterError;
exports.saveUploadToDisk = saveUploadToDisk;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const config_js_1 = require("../config.js");
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const PE_MAGIC = [0x4d, 0x5a];
function checkMagicBytes(buffer, magic) {
    if (buffer.length < magic.length)
        return false;
    return magic.every((byte, i) => buffer[i] === byte);
}
exports.sourceZipUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: config_js_1.config.maxSourceZipBytes },
});
exports.binaryUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: config_js_1.config.maxBinaryBytes },
});
function validateZipMagic(req, res, next) {
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
function validatePEMagic(req, res, next) {
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
function handleMulterError(err, _req, res, next) {
    if (err instanceof multer_1.default.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
            error: { code: "FILE_TOO_LARGE", message: "Uploaded file exceeds size limit" },
        });
        return;
    }
    next(err);
}
function saveUploadToDisk(destFilename) {
    return async (req, _res, next) => {
        if (req.file) {
            const fs = await Promise.resolve().then(() => __importStar(require("fs")));
            const jobId = req.jobId ?? "tmp";
            const workDir = path_1.default.join(config_js_1.config.workDir, jobId, "input");
            fs.mkdirSync(workDir, { recursive: true });
            const destPath = path_1.default.join(workDir, destFilename);
            fs.writeFileSync(destPath, req.file.buffer);
            req.uploadPath = destPath;
        }
        next();
    };
}
//# sourceMappingURL=upload.js.map