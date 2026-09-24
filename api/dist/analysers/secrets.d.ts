/**
 * Strips potential secrets from strings before they are written to observations.
 */
/**
 * Returns true if the string should be excluded from observations.
 */
export declare function shouldRedactString(value: string): boolean;
/**
 * Replaces secret patterns inside a string (for detail fields).
 */
export declare function stripSecrets(text: string): string;
//# sourceMappingURL=secrets.d.ts.map