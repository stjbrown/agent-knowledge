import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readPdf,
  readPdfChunk,
  type PdfTextExtractor,
} from "../src/tools/pdf.js";

const roots: string[] = [];

function escapePdfText(text: string): string {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function makePdf(text: string): Buffer {
  const stream = text
    ? `BT\n/F1 12 Tf\n72 720 Td\n(${escapePdfText(text)}) Tj\nET\n`
    : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`,
  ];
  let source = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(source, "latin1"));
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(source, "latin1");
  source += `xref\n0 ${objects.length + 1}\n`;
  source += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    source += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  source += `startxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(source, "latin1");
}

function workspace(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `janet-pdf-${name}-`));
  roots.push(root);
  return root;
}

function writePdf(projectPath: string, relativePath: string, text: string): Buffer {
  const bytes = makePdf(text);
  const absolutePath = join(projectPath, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes);
  return bytes;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("local PDF tools", () => {
  it("extracts a real PDF locally and never returns raw document bytes", async () => {
    const projectPath = workspace("real");
    const sourceText =
      "Janet can safely extract this PDF text locally without sending binary document data.";
    const bytes = writePdf(projectPath, "raw/source.pdf", sourceText);

    const result = await readPdf({ projectPath }, "raw/source.pdf");
    const persistedResult = JSON.stringify(result);

    expect(result.mode).toBe("inline");
    expect(result.quality).toBe("good");
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain(sourceText);
    expect(result.artifactPath).toMatch(
      /^\.agent-knowledge\/cache\/pdf\/[a-f0-9]{64}\.md$/,
    );
    expect(readFileSync(join(projectPath, result.artifactPath), "utf8")).toContain(
      sourceText,
    );
    expect(persistedResult).not.toContain("%PDF-1.4");
    expect(persistedResult).not.toContain(bytes.toString("base64").slice(0, 80));
    expect(persistedResult).not.toContain('"data"');
  });

  it("returns only a preview for large extraction and reads the artifact in bounded chunks", async () => {
    const projectPath = workspace("chunks");
    writePdf(projectPath, "large.pdf", "fixture");
    const extractedText = "A long local extraction. ".repeat(80);
    const extractor: PdfTextExtractor = {
      id: "test-extractor",
      async extract() {
        return [{ pageNumber: 1, text: extractedText }];
      },
    };

    const result = await readPdf(
      {
        projectPath,
        extractor,
        inlineCharacterLimit: 100,
        previewCharacterLimit: 60,
        chunkCharacterLimit: 75,
      },
      "large.pdf",
    );

    expect(result.mode).toBe("cached");
    expect(result.text.length).toBeLessThanOrEqual(60);
    expect(result.nextOffset).toBe(result.text.length);

    let offset = result.nextOffset;
    let reconstructed = result.text;
    while (offset !== null) {
      const chunk = await readPdfChunk(
        { projectPath, chunkCharacterLimit: 75 },
        result.artifactPath,
        offset,
      );
      expect(chunk.text.length).toBeLessThanOrEqual(75);
      reconstructed += chunk.text;
      offset = chunk.nextOffset;
    }

    expect(reconstructed.length).toBe(result.totalArtifactCharacters);
    expect(reconstructed).toContain(extractedText.trim());
  });

  it("reports image-only or otherwise empty extraction as poor quality", async () => {
    const projectPath = workspace("poor");
    writePdf(projectPath, "scan.pdf", "fixture");
    const extractor: PdfTextExtractor = {
      id: "empty-extractor",
      async extract() {
        return [{ pageNumber: 1, text: "" }];
      },
    };

    const result = await readPdf({ projectPath, extractor }, "scan.pdf");

    expect(result.quality).toBe("poor");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("No extractable text"),
        expect.stringContaining("Visual/OCR fallback is not configured"),
      ]),
    );
  });

  it("rejects traversal, non-PDF input, and symlinks escaping the workspace", async () => {
    const root = workspace("paths");
    const projectPath = join(root, "project");
    const outsidePath = join(root, "outside.pdf");
    mkdirSync(projectPath, { recursive: true });
    writeFileSync(outsidePath, makePdf("outside"));
    writeFileSync(join(projectPath, "note.txt"), "not a PDF");
    symlinkSync(outsidePath, join(projectPath, "escape.pdf"));

    await expect(readPdf({ projectPath }, "../outside.pdf")).rejects.toThrow(
      "outside the workspace",
    );
    await expect(readPdf({ projectPath }, "note.txt")).rejects.toThrow(
      "Expected a .pdf file",
    );
    await expect(readPdf({ projectPath }, "escape.pdf")).rejects.toThrow(
      "resolves outside the workspace",
    );
  });

  it("only permits bounded reads from PDF cache artifacts", async () => {
    const projectPath = workspace("artifact-paths");
    writePdf(projectPath, "source.pdf", "fixture");
    const result = await readPdf(
      {
        projectPath,
        extractor: {
          id: "fixture",
          async extract() {
            return [{ pageNumber: 1, text: "safe text" }];
          },
        },
      },
      "source.pdf",
    );
    writeFileSync(join(projectPath, "other.md"), "outside cache");

    await expect(
      readPdfChunk({ projectPath }, "other.md", 0),
    ).rejects.toThrow("Only artifacts returned by janet_read_pdf");
    await expect(
      readPdfChunk({ projectPath }, "../outside.md", 0),
    ).rejects.toThrow("Only artifacts returned by janet_read_pdf");
    await expect(
      readPdfChunk({ projectPath }, result.artifactPath, -1),
    ).rejects.toThrow("offset must be a non-negative integer");
  });
});
