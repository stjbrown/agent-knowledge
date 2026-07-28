import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { createTool } from "@mastra/core/tools";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { CONFIG_DIR_NAME } from "../agent/paths.js";

const CACHE_DIR_SEGMENTS = [CONFIG_DIR_NAME, "cache", "pdf"] as const;
const PDF_ARTIFACT_NAME = /^[a-f0-9]{64}\.md$/;

export const PDF_TOOL_DEFAULTS = {
  maxFileBytes: 50 * 1024 * 1024,
  inlineCharacterLimit: 40_000,
  previewCharacterLimit: 12_000,
  chunkCharacterLimit: 40_000,
} as const;

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

/**
 * Provider-neutral extraction boundary. The first implementation is local
 * pdf.js text extraction; a future optional visual backend can implement this
 * contract without changing the Janet tool or its persisted result shape.
 */
export interface PdfTextExtractor {
  readonly id: string;
  extract(data: Uint8Array): Promise<PdfPageText[]>;
}

export const localPdfTextExtractor: PdfTextExtractor = {
  id: "pdf-parse",
  async extract(data) {
    const parser = new PDFParse({ data });
    try {
      const result = await parser.getText({
        pageJoiner: "",
        parseHyperlinks: true,
      });
      return result.pages.map((page) => ({
        pageNumber: page.num,
        text: page.text,
      }));
    } finally {
      await parser.destroy();
    }
  },
};

export interface PdfToolOptions {
  projectPath: string;
  extractor?: PdfTextExtractor;
  maxFileBytes?: number;
  inlineCharacterLimit?: number;
  previewCharacterLimit?: number;
  chunkCharacterLimit?: number;
}

export interface PdfReadResult {
  status: "ok";
  mode: "inline" | "cached";
  sourcePath: string;
  artifactPath: string;
  extractor: string;
  sha256: string;
  pageCount: number;
  characterCount: number;
  totalArtifactCharacters: number;
  quality: "good" | "poor";
  warnings: string[];
  text: string;
  offset: 0;
  nextOffset: number | null;
}

export interface PdfChunkResult {
  status: "ok";
  artifactPath: string;
  text: string;
  offset: number;
  nextOffset: number | null;
  totalArtifactCharacters: number;
}

function positiveLimit(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return resolved;
}

function relativeForDisplay(projectPath: string, absolutePath: string): string {
  return path.relative(projectPath, absolutePath).split(path.sep).join("/");
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function resolveProjectFile(
  projectPath: string,
  requestedPath: string,
  extension: string,
): Promise<{ projectRealPath: string; fileRealPath: string; sourcePath: string }> {
  if (!requestedPath.trim()) throw new Error("A workspace-relative path is required.");
  if (path.isAbsolute(requestedPath)) {
    throw new Error("PDF paths must be relative to the workspace.");
  }

  const projectRealPath = await realpath(projectPath);
  const candidate = path.resolve(projectRealPath, requestedPath);
  if (!isInside(projectRealPath, candidate)) {
    throw new Error("The requested PDF path is outside the workspace.");
  }
  if (path.extname(candidate).toLowerCase() !== extension) {
    throw new Error(`Expected a ${extension} file.`);
  }

  let fileRealPath: string;
  try {
    fileRealPath = await realpath(candidate);
  } catch {
    throw new Error(`PDF file not found: ${requestedPath}`);
  }
  if (!isInside(projectRealPath, fileRealPath)) {
    throw new Error("The requested PDF resolves outside the workspace.");
  }

  const fileStat = await stat(fileRealPath);
  if (!fileStat.isFile()) throw new Error("The requested PDF path is not a regular file.");

  return {
    projectRealPath,
    fileRealPath,
    sourcePath: relativeForDisplay(projectRealPath, fileRealPath),
  };
}

function normalizePageText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replaceAll("\0", "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function assessQuality(pages: PdfPageText[]): {
  characterCount: number;
  quality: "good" | "poor";
  warnings: string[];
} {
  const text = pages.map((page) => page.text).join("\n");
  const characterCount = pages.reduce((total, page) => total + page.text.length, 0);
  const blankPages = pages.filter((page) => page.text.trim().length === 0).length;
  const replacementCharacters = text.match(/\uFFFD/g)?.length ?? 0;
  const controlCharacters =
    text.match(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g)?.length ?? 0;
  const warnings: string[] = [];

  if (characterCount === 0) {
    warnings.push("No extractable text was found; this PDF may be scanned or image-only.");
  } else if (pages.length > 0 && characterCount < pages.length * 4) {
    warnings.push("Very little text was extracted for the number of pages.");
  }
  if (blankPages > 0) {
    warnings.push(
      `${blankPages} of ${pages.length} page${pages.length === 1 ? "" : "s"} contained no extractable text.`,
    );
  }
  if (replacementCharacters / Math.max(characterCount, 1) > 0.02) {
    warnings.push("The extracted text contains many undecodable characters.");
  }
  if (controlCharacters / Math.max(characterCount, 1) > 0.01) {
    warnings.push("The extracted text contains an unusual number of control characters.");
  }

  const blankRatio = blankPages / Math.max(pages.length, 1);
  const quality =
    characterCount === 0 ||
    (pages.length > 0 && characterCount < pages.length * 4) ||
    blankRatio >= 0.8 ||
    replacementCharacters / Math.max(characterCount, 1) > 0.02 ||
    controlCharacters / Math.max(characterCount, 1) > 0.01
      ? "poor"
      : "good";

  if (quality === "poor") {
    warnings.push(
      "Visual/OCR fallback is not configured. Report this limitation instead of retrying with the generic file reader.",
    );
  }

  return { characterCount, quality, warnings };
}

function renderArtifact(pages: PdfPageText[], sha256: string): string {
  const sections = pages.map(
    (page) => `## Page ${page.pageNumber}\n\n${page.text || "_No extractable text on this page._"}`,
  );
  return [
    "<!-- janet-pdf-extraction: 1 -->",
    `<!-- source-sha256: ${sha256} -->`,
    "",
    "# PDF text extraction",
    "",
    ...sections,
    "",
  ].join("\n");
}

function boundedSlice(
  text: string,
  start: number,
  characterLimit: number,
): { text: string; end: number } {
  let end = Math.min(start + characterLimit, text.length);
  if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1] ?? "")) {
    end -= 1;
  }
  return { text: text.slice(start, end), end };
}

async function writeArtifact(
  projectRealPath: string,
  sha256: string,
  markdown: string,
): Promise<{ artifactPath: string; artifactRealPath: string }> {
  const cacheCandidate = path.join(projectRealPath, ...CACHE_DIR_SEGMENTS);
  await mkdir(cacheCandidate, { recursive: true });
  const cacheRealPath = await realpath(cacheCandidate);
  if (!isInside(projectRealPath, cacheRealPath)) {
    throw new Error("The PDF cache resolves outside the workspace.");
  }

  const artifactRealPath = path.join(cacheRealPath, `${sha256}.md`);
  const tempPath = path.join(cacheRealPath, `.${sha256}.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, markdown, { encoding: "utf8", flag: "wx" });
    await rename(tempPath, artifactRealPath);
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }

  return {
    artifactPath: relativeForDisplay(projectRealPath, artifactRealPath),
    artifactRealPath,
  };
}

export async function readPdf(
  options: PdfToolOptions,
  requestedPath: string,
): Promise<PdfReadResult> {
  const maxFileBytes = positiveLimit(
    options.maxFileBytes,
    PDF_TOOL_DEFAULTS.maxFileBytes,
    "maxFileBytes",
  );
  const inlineCharacterLimit = positiveLimit(
    options.inlineCharacterLimit,
    PDF_TOOL_DEFAULTS.inlineCharacterLimit,
    "inlineCharacterLimit",
  );
  const previewCharacterLimit = positiveLimit(
    options.previewCharacterLimit,
    PDF_TOOL_DEFAULTS.previewCharacterLimit,
    "previewCharacterLimit",
  );
  const { projectRealPath, fileRealPath, sourcePath } = await resolveProjectFile(
    options.projectPath,
    requestedPath,
    ".pdf",
  );
  const fileStat = await stat(fileRealPath);
  if (fileStat.size > maxFileBytes) {
    throw new Error(
      `PDF is ${fileStat.size} bytes; the configured limit is ${maxFileBytes} bytes.`,
    );
  }

  const bytes = await readFile(fileRealPath);
  if (!bytes.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
    throw new Error("The file does not have a valid PDF header.");
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const extractor = options.extractor ?? localPdfTextExtractor;
  let extractedPages: PdfPageText[];
  try {
    extractedPages = await extractor.extract(bytes);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown parser error";
    throw new Error(`Local PDF text extraction failed: ${detail}`);
  }
  const pages = extractedPages.map((page, index) => ({
    pageNumber:
      Number.isSafeInteger(page.pageNumber) && page.pageNumber > 0
        ? page.pageNumber
        : index + 1,
    text: normalizePageText(page.text),
  }));
  const quality = assessQuality(pages);
  const markdown = renderArtifact(pages, sha256);
  const { artifactPath } = await writeArtifact(projectRealPath, sha256, markdown);
  const mode = markdown.length <= inlineCharacterLimit ? "inline" : "cached";
  const preview =
    mode === "inline"
      ? { text: markdown, end: markdown.length }
      : boundedSlice(markdown, 0, previewCharacterLimit);
  const nextOffset = preview.end < markdown.length ? preview.end : null;

  return {
    status: "ok",
    mode,
    sourcePath,
    artifactPath,
    extractor: extractor.id,
    sha256,
    pageCount: pages.length,
    characterCount: quality.characterCount,
    totalArtifactCharacters: markdown.length,
    quality: quality.quality,
    warnings: quality.warnings,
    text: preview.text,
    offset: 0,
    nextOffset,
  };
}

async function resolvePdfArtifact(
  projectPath: string,
  requestedPath: string,
): Promise<{
  projectRealPath: string;
  artifactRealPath: string;
  artifactPath: string;
}> {
  if (!requestedPath.trim() || path.isAbsolute(requestedPath)) {
    throw new Error("A workspace-relative PDF artifact path is required.");
  }
  const projectRealPath = await realpath(projectPath);
  const cacheCandidate = path.join(projectRealPath, ...CACHE_DIR_SEGMENTS);
  let cacheRealPath: string;
  try {
    cacheRealPath = await realpath(cacheCandidate);
  } catch {
    throw new Error("The PDF artifact cache does not exist.");
  }
  if (!isInside(projectRealPath, cacheRealPath)) {
    throw new Error("The PDF cache resolves outside the workspace.");
  }

  const candidate = path.resolve(projectRealPath, requestedPath);
  if (
    path.dirname(candidate) !== cacheCandidate ||
    !PDF_ARTIFACT_NAME.test(path.basename(candidate))
  ) {
    throw new Error("Only artifacts returned by janet_read_pdf can be read.");
  }

  let artifactRealPath: string;
  try {
    artifactRealPath = await realpath(candidate);
  } catch {
    throw new Error(`PDF artifact not found: ${requestedPath}`);
  }
  if (
    path.dirname(artifactRealPath) !== cacheRealPath ||
    !PDF_ARTIFACT_NAME.test(path.basename(artifactRealPath))
  ) {
    throw new Error("The requested PDF artifact resolves outside the PDF cache.");
  }
  const artifactStat = await lstat(artifactRealPath);
  if (!artifactStat.isFile() || artifactStat.isSymbolicLink()) {
    throw new Error("The requested PDF artifact is not a regular cache file.");
  }

  return {
    projectRealPath,
    artifactRealPath,
    artifactPath: relativeForDisplay(projectRealPath, artifactRealPath),
  };
}

export async function readPdfChunk(
  options: PdfToolOptions,
  requestedPath: string,
  offset = 0,
): Promise<PdfChunkResult> {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("offset must be a non-negative integer.");
  }
  const chunkCharacterLimit = positiveLimit(
    options.chunkCharacterLimit,
    PDF_TOOL_DEFAULTS.chunkCharacterLimit,
    "chunkCharacterLimit",
  );
  const { artifactRealPath, artifactPath } = await resolvePdfArtifact(
    options.projectPath,
    requestedPath,
  );
  const markdown = await readFile(artifactRealPath, "utf8");
  const start = Math.min(offset, markdown.length);
  const chunk = boundedSlice(markdown, start, chunkCharacterLimit);

  return {
    status: "ok",
    artifactPath,
    text: chunk.text,
    offset: start,
    nextOffset: chunk.end < markdown.length ? chunk.end : null,
    totalArtifactCharacters: markdown.length,
  };
}

export function createPdfTools(options: PdfToolOptions) {
  return {
    janet_read_pdf: createTool({
      id: "janet_read_pdf",
      description:
        "Safely extract text from a workspace PDF without returning raw PDF bytes. Small results are inline; large results return a bounded preview and cached Markdown artifact.",
      inputSchema: z.object({
        path: z.string().describe("Workspace-relative path to a .pdf file"),
      }),
      execute: ({ path: requestedPath }) => readPdf(options, requestedPath),
    }),
    janet_read_pdf_chunk: createTool({
      id: "janet_read_pdf_chunk",
      description:
        "Read the next bounded section of a cached Markdown artifact returned by janet_read_pdf.",
      inputSchema: z.object({
        artifactPath: z
          .string()
          .describe("Workspace-relative artifactPath returned by janet_read_pdf"),
        offset: z.number().int().nonnegative().optional().default(0),
      }),
      execute: ({ artifactPath, offset }) =>
        readPdfChunk(options, artifactPath, offset),
    }),
  };
}
