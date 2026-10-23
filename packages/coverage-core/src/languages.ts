import type { IgnoredLine, SourceLanguage } from "./types.js";

export interface LanguageDefinition {
  id: SourceLanguage;
  label: string;
  extensions: string[];
  detectIgnoredLines?: (lines: string[]) => IgnoredLine[];
}

export const LANGUAGE_DEFINITIONS: LanguageDefinition[] = [
  {
    id: "solidity",
    label: "Solidity",
    extensions: [".sol"],
    detectIgnoredLines: detectSolidityAssemblyLines,
  },
  {
    id: "cpp",
    label: "C++",
    extensions: [".cc", ".cpp", ".cxx", ".hh", ".hpp", ".hxx"],
  },
  { id: "c", label: "C", extensions: [".c", ".h"] },
  {
    id: "typescript",
    label: "TypeScript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
  },
  {
    id: "javascript",
    label: "JavaScript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
  },
  { id: "rust", label: "Rust", extensions: [".rs"] },
  { id: "python", label: "Python", extensions: [".py", ".pyw"] },
  { id: "go", label: "Go", extensions: [".go"] },
  { id: "java", label: "Java", extensions: [".java"] },
  { id: "csharp", label: "C#", extensions: [".cs"] },
  { id: "kotlin", label: "Kotlin", extensions: [".kt", ".kts"] },
  { id: "php", label: "PHP", extensions: [".php"] },
  { id: "ruby", label: "Ruby", extensions: [".rb"] },
  { id: "swift", label: "Swift", extensions: [".swift"] },
  { id: "scala", label: "Scala", extensions: [".scala", ".sc"] },
  { id: "dart", label: "Dart", extensions: [".dart"] },
  { id: "lua", label: "Lua", extensions: [".lua"] },
  { id: "r", label: "R", extensions: [".r", ".R"] },
  { id: "shell", label: "Shell", extensions: [".sh", ".bash", ".zsh"] },
  { id: "css", label: "CSS", extensions: [".css"] },
  { id: "html", label: "HTML", extensions: [".html", ".htm"] },
  { id: "xml", label: "XML", extensions: [".xml", ".svg"] },
  { id: "vue", label: "Vue", extensions: [".vue"] },
  { id: "json", label: "JSON", extensions: [".json", ".jsonc"] },
  { id: "yaml", label: "YAML", extensions: [".yaml", ".yml"] },
  { id: "toml", label: "TOML", extensions: [".toml"] },
  { id: "markdown", label: "Markdown", extensions: [".md", ".mdx"] },
];

export const DEFAULT_SOURCE_EXTENSIONS = sourceExtensionsForLanguages();

const languagesByExtension = new Map(
  LANGUAGE_DEFINITIONS.flatMap((language) =>
    language.extensions.map(
      (extension) => [extension.toLowerCase(), language] as const,
    ),
  ),
);
const languagesById = new Map(
  LANGUAGE_DEFINITIONS.map((language) => [language.id, language] as const),
);

export function registerLanguageDefinition(language: LanguageDefinition): void {
  const normalized = {
    ...language,
    extensions: language.extensions.map(normalizeExtension),
  };
  const existing = languagesById.get(normalized.id);
  if (existing) {
    const index = LANGUAGE_DEFINITIONS.findIndex(
      (candidate) => candidate.id === normalized.id,
    );
    if (index !== -1) {
      LANGUAGE_DEFINITIONS.splice(index, 1, normalized);
    } else {
      LANGUAGE_DEFINITIONS.push(normalized);
    }
    for (const [extension, candidate] of languagesByExtension) {
      if (candidate.id === normalized.id)
        languagesByExtension.delete(extension);
    }
  } else {
    LANGUAGE_DEFINITIONS.push(normalized);
  }

  languagesById.set(normalized.id, normalized);
  for (const extension of normalized.extensions)
    languagesByExtension.set(extension, normalized);
}

export function resolveLanguageDefinition(
  language: SourceLanguage,
): LanguageDefinition | undefined {
  return languagesById.get(language);
}

export function sourceExtensionsForLanguages(
  languages = LANGUAGE_DEFINITIONS,
): string[] {
  return [
    ...new Set(
      languages.flatMap((language) =>
        language.extensions.map(normalizeExtension),
      ),
    ),
  ];
}

export function detectSourceLanguage(filePath: string): SourceLanguage {
  return languagesByExtension.get(extensionForPath(filePath))?.id ?? "plain";
}

export function sourceLanguageLabel(language: SourceLanguage): string {
  return languagesById.get(language)?.label ?? language;
}

export function detectIgnoredLines(
  lines: string[],
  language: SourceLanguage,
): IgnoredLine[] {
  return languagesById.get(language)?.detectIgnoredLines?.(lines) ?? [];
}

function detectSolidityAssemblyLines(lines: string[]): IgnoredLine[] {
  const ignoredLines = new Set<number>();
  const code = stripStringsAndComments(lines.join("\n"));
  const tokens = /(?<![\w$])assembly(?![\w$])\s*(?:\([^)]*\)\s*)?\{|[{}]|\n/g;
  let depth = 0;
  let line = 1;
  let startLine = 1;
  let startOffset = 0;
  let previousEnd = 0;
  const outsideAssembly: string[] = [];

  const finishAssembly = (endOffset: number): void => {
    for (let current = startLine; current <= line; current += 1)
      ignoredLines.add(current);
    outsideAssembly.push(
      code.slice(previousEnd, startOffset),
      "\n".repeat(line - startLine),
    );
    previousEnd = endOffset;
  };

  for (const match of code.matchAll(tokens)) {
    const token = match[0];
    if (token === "\n") {
      line += 1;
    } else if (token.endsWith("{")) {
      if (depth === 0 && token !== "{") {
        startLine = line;
        startOffset = match.index;
        depth = 1;
      } else if (depth > 0) {
        depth += 1;
      }
      line += token.split("\n").length - 1;
    } else if (depth > 0 && --depth === 0) {
      finishAssembly(match.index + token.length);
    }
  }
  if (depth > 0) finishAssembly(code.length);
  outsideAssembly.push(code.slice(previousEnd));
  const remainingLines = outsideAssembly.join("").split("\n");

  // A line that also contains Solidity must keep its line, function, and
  // branch coverpoints; an assembly exclusion cannot describe only part of it.
  return [...ignoredLines]
    .filter((line) => !remainingLines[line - 1]?.trim())
    .map((line) => ({
      line,
      reason: "solidity-assembly",
      label: "Solidity assembly",
    }));
}

function extensionForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jsonc")) return ".jsonc";
  return lower.match(/(\.[^./\\]+)$/)?.[1] ?? "";
}

function normalizeExtension(extension: string): string {
  const trimmed = extension.trim().toLowerCase();
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function stripStringsAndComments(input: string): string {
  // Keep newlines and token boundaries so multiline headers and comments do
  // not change line numbers or turn ordinary Solidity into assembly.
  let result = "";
  let state: "code" | "line-comment" | "block-comment" | '"' | "'" = "code";
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    const next = input[index + 1];
    if (char === "\n") {
      result += char;
      if (state === "line-comment") state = "code";
    } else if (state === "line-comment") {
      continue;
    } else if (state === "block-comment") {
      if (char === "*" && next === "/") {
        state = "code";
        index += 1;
      }
    } else if (state !== "code") {
      if (char === "\\" && next !== undefined) {
        if (next === "\n") result += "\n";
        index += 1;
      } else if (char === state) {
        state = "code";
      }
    } else if (char === "/" && (next === "/" || next === "*")) {
      state = next === "/" ? "line-comment" : "block-comment";
      result += " ";
      index += 1;
    } else if (char === '"' || char === "'") {
      state = char;
      result += " ";
    } else {
      result += char;
    }
  }
  return result;
}
