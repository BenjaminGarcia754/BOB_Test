"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
exports.validatePEBinary = validatePEBinary;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
function validatePEBinary(buffer) {
    if (buffer.length < 2 || buffer[0] !== 0x4d || buffer[1] !== 0x5a) {
        throw new ValidationError("File does not appear to be a PE binary (missing MZ header)");
    }
    if (buffer.length < 0x40) {
        throw new ValidationError("File too small to be a valid PE binary");
    }
}
//# sourceMappingURL=validate.js.map