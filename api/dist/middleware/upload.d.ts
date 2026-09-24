import multer from "multer";
import { Request, Response, NextFunction } from "express";
export declare const sourceZipUpload: multer.Multer;
export declare const binaryUpload: multer.Multer;
export declare function validateZipMagic(req: Request, res: Response, next: NextFunction): void;
export declare function validatePEMagic(req: Request, res: Response, next: NextFunction): void;
export declare function handleMulterError(err: unknown, _req: Request, res: Response, next: NextFunction): void;
export declare function saveUploadToDisk(destFilename: string): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=upload.d.ts.map