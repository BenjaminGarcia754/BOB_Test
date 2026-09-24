import { Observation, ToolRecord } from "../../schemas/index.js";
export declare function runSemgrep(sourceDir: string, rawOutputPath: string): Promise<{
    observations: Observation[];
    toolRecord: ToolRecord;
}>;
//# sourceMappingURL=semgrep.d.ts.map