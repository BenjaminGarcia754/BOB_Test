import { Observation } from "../../schemas/index.js";
export interface InventoryResult {
    fileObservations: Observation[];
    dependencyObservations: Observation[];
    allFiles: string[];
    languages: string[];
}
export declare function runInventory(sourceDir: string): InventoryResult;
//# sourceMappingURL=inventory.d.ts.map