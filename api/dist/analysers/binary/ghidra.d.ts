import { Observation, ToolRecord } from "../../schemas/index.js";
export interface GhidraRawOutput {
    format: string;
    architecture: string;
    compiler?: string;
    imageBase: string;
    imports: Array<{
        library: string;
        name: string;
        address: string;
    }>;
    strings: Array<{
        value: string;
        address: string;
        length: number;
    }>;
    functions: Array<{
        name: string;
        address: string;
        size: number;
        calledFunctions: string[];
        pseudocode: string;
    }>;
}
export declare function categoriseImport(name: string): string;
export declare function categoriseString(value: string): string[];
export declare function runGhidra(binaryPath: string, workDir: string, rawOutputPath: string): Promise<{
    observations: Observation[];
    toolRecord: ToolRecord;
}>;
//# sourceMappingURL=ghidra.d.ts.map