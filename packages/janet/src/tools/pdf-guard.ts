/** Keep media-aware workspace reads from bypassing Janet's bounded PDF tool. */
const PDF_READER_MESSAGE =
  "PDF files must be read with janet_read_pdf. The generic workspace reader is blocked because it can return raw document bytes that are unsafe to persist in model history.";

const PDF_ARTIFACT_MESSAGE =
  "Cached PDF artifacts must be read with janet_read_pdf_chunk so each tool result stays bounded.";

function inputPath(input: unknown): string | undefined {
  if (!input || typeof input !== "object" || !("path" in input)) return;
  const value = input.path;
  return typeof value === "string" ? value.replaceAll("\\", "/") : undefined;
}

export function guardPdfWorkspaceRead(toolName: string, input: unknown) {
  if (toolName !== "mastra_workspace_read_file") return;
  const requestedPath = inputPath(input);
  if (!requestedPath) return;
  if (requestedPath.toLowerCase().endsWith(".pdf")) {
    return { proceed: false as const, output: PDF_READER_MESSAGE };
  }
  if (
    /(?:^|\/)\.agent-knowledge\/cache\/pdf\/[a-f0-9]{64}\.md$/i.test(
      requestedPath,
    )
  ) {
    return { proceed: false as const, output: PDF_ARTIFACT_MESSAGE };
  }
}
