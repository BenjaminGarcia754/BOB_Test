"use strict";
/**
 * Strips potential secrets from strings before they are written to observations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRedactString = shouldRedactString;
exports.stripSecrets = stripSecrets;
const PRIVATE_KEY_PATTERN = /-----BEGIN\s+[\w\s]*PRIVATE KEY-----/i;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+/;
const PASSWORD_PATTERN = /(?:password|pwd)\s*=\s*\S+/i;
/**
 * Returns Shannon entropy of a string.
 */
function shannonEntropy(s) {
    const freq = new Map();
    for (const ch of s)
        freq.set(ch, (freq.get(ch) ?? 0) + 1);
    const len = s.length;
    let entropy = 0;
    for (const count of freq.values()) {
        const p = count / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}
/**
 * Returns true if the string should be excluded from observations.
 */
function shouldRedactString(value) {
    if (PRIVATE_KEY_PATTERN.test(value))
        return true;
    if (JWT_PATTERN.test(value))
        return true;
    if (PASSWORD_PATTERN.test(value))
        return true;
    if (value.length > 20 && shannonEntropy(value) > 4.5)
        return true;
    return false;
}
/**
 * Replaces secret patterns inside a string (for detail fields).
 */
function stripSecrets(text) {
    if (!text)
        return text;
    let result = text;
    result = result.replace(PRIVATE_KEY_PATTERN, "[REDACTED — potential secret]");
    result = result.replace(JWT_PATTERN, "[REDACTED — potential secret]");
    result = result.replace(PASSWORD_PATTERN, "[REDACTED — potential secret]");
    return result;
}
//# sourceMappingURL=secrets.js.map