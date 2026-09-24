import { EvidenceDocument, Observation, Inference, ToolRecord } from "../schemas/index.js";
export declare function identificationSection(doc: EvidenceDocument): string;
export declare function analysisToolsSection(tools: ToolRecord[]): string;
export declare function observationEntry(obs: Observation): string;
export declare function inferenceEntry(inf: Inference): string;
export declare function dependencyEntry(obs: Observation): string;
export declare function unknownsSection(unknowns: string[]): string;
export declare function preservationSection(doc: EvidenceDocument): string;
export declare function limitationsSection(tools: ToolRecord[]): string;
export declare function evidenceIndexSection(doc: EvidenceDocument): string;
//# sourceMappingURL=templates.d.ts.map