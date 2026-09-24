export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validatePEBinary(buffer: Buffer): void {
  if (buffer.length < 2 || buffer[0] !== 0x4d || buffer[1] !== 0x5a) {
    throw new ValidationError(
      "File does not appear to be a PE binary (missing MZ header)"
    );
  }
  if (buffer.length < 0x40) {
    throw new ValidationError("File too small to be a valid PE binary");
  }
}
