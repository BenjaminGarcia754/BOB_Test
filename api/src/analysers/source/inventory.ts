import fs from "fs";
import path from "path";
import { Observation } from "../../schemas/index.js";

const MANIFEST_FILES = [
  "package.json",
  "requirements.txt",
  "composer.json",
  "go.mod",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "Cargo.toml",
];

const MANIFEST_GLOB_PATTERNS = [".csproj"];

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".py": "Python",
  ".java": "Java",
  ".cs": "C#",
  ".go": "Go",
  ".rb": "Ruby",
  ".php": "PHP",
  ".rs": "Rust",
  ".cpp": "C++",
  ".cc": "C++",
  ".c": "C",
  ".h": "C/C++",
  ".swift": "Swift",
  ".kt": "Kotlin",
};

export interface InventoryResult {
  fileObservations: Observation[];
  dependencyObservations: Observation[];
  allFiles: string[];
  languages: string[];
}

function walkDir(dir: string, base: string, result: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const rel = path.join(base, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      walkDir(path.join(dir, entry.name), rel, result);
    } else if (entry.isFile()) {
      result.push(rel);
    }
  }
}

function parseDependencies(manifestPath: string, content: string): { name: string; version: string }[] {
  const base = path.basename(manifestPath);
  try {
    if (base === "package.json") {
      const pkg = JSON.parse(content) as Record<string, unknown>;
      const deps = { ...(pkg.dependencies as Record<string, string> | undefined), ...(pkg.devDependencies as Record<string, string> | undefined) };
      return Object.entries(deps).map(([name, version]) => ({ name, version: String(version) }));
    }
    if (base === "requirements.txt") {
      return content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => {
          const [name, ...rest] = l.split(/[>=<!~^]/);
          return { name: name.trim(), version: rest.join("").trim() || "unspecified" };
        });
    }
    if (base === "go.mod") {
      const lines = content.split("\n").filter((l) => l.trim().startsWith("require") || l.includes(" v"));
      return lines
        .filter((l) => /^\s+\S+ v/.test(l))
        .map((l) => {
          const parts = l.trim().split(/\s+/);
          return { name: parts[0], version: parts[1] || "unspecified" };
        });
    }
    if (base === "Cargo.toml") {
      const deps: { name: string; version: string }[] = [];
      let inDeps = false;
      for (const line of content.split("\n")) {
        if (line.trim() === "[dependencies]" || line.trim() === "[dev-dependencies]") {
          inDeps = true;
          continue;
        }
        if (line.startsWith("[") && inDeps) { inDeps = false; continue; }
        if (inDeps && line.includes("=")) {
          const [name, val] = line.split("=").map((s) => s.trim().replace(/"/g, ""));
          deps.push({ name, version: val || "unspecified" });
        }
      }
      return deps;
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function runInventory(sourceDir: string): InventoryResult {
  const allFiles: string[] = [];
  walkDir(sourceDir, "", allFiles);

  const relFiles = allFiles.map((f) => f.replace(/\\/g, "/"));
  const langSet = new Set<string>();
  for (const f of relFiles) {
    const ext = path.extname(f).toLowerCase();
    if (LANGUAGE_MAP[ext]) langSet.add(LANGUAGE_MAP[ext]);
  }

  const fileObservations: Observation[] = relFiles.map((relPath) => ({
    id: "obs-tmp",
    kind: "file" as const,
    summary: `File: ${relPath}`.slice(0, 500),
    detail: null,
    source: { tool: "inventory", path: relPath, line: null, address: null, ruleId: null },
    tags: (() => {
      const ext = path.extname(relPath).toLowerCase();
      const lang = LANGUAGE_MAP[ext];
      const tags: string[] = [];
      if (lang) tags.push(`lang:${lang.toLowerCase()}`);
      const base = path.basename(relPath).toLowerCase();
      if (/^(main|index|app|server)\.[a-z]+$/.test(base)) tags.push("entry-point");
      return tags;
    })(),
  }));

  const dependencyObservations: Observation[] = [];

  for (const relPath of relFiles) {
    const base = path.basename(relPath);
    const isManifest = MANIFEST_FILES.includes(base) ||
      MANIFEST_GLOB_PATTERNS.some((p) => relPath.endsWith(p));

    if (!isManifest) continue;

    let content: string;
    try {
      content = fs.readFileSync(path.join(sourceDir, relPath), "utf-8");
    } catch {
      continue;
    }

    const deps = parseDependencies(relPath, content);
    for (const dep of deps) {
      dependencyObservations.push({
        id: "obs-tmp",
        kind: "dependency" as const,
        summary: `${dep.name}@${dep.version} (from ${base})`.slice(0, 500),
        detail: null,
        source: { tool: "inventory", path: relPath, line: null, address: null, ruleId: null },
        tags: [`manifest:${base}`],
      });
    }
  }

  return {
    fileObservations,
    dependencyObservations,
    allFiles: relFiles,
    languages: Array.from(langSet),
  };
}
