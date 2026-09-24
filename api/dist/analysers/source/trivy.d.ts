import { Observation, ToolRecord } from "../../schemas/index.js";
export declare function runTrivy(sourceDir: string, rawOutputPath: string): Promise<{
    observations: Observation[];
    toolRecord: ToolRecord;
}>;
//# sourceMappingURL=trivy.d.ts.map