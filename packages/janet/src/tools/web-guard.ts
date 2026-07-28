const WEB_ARTIFACT_MESSAGE =
  "Cached web artifacts must be read with janet_web_fetch_chunk so each tool result stays bounded.";

function inputPath(input: unknown): string | undefined {
  if (!input || typeof input !== "object" || !("path" in input)) return;
  const value = input.path;
  return typeof value === "string" ? value.replaceAll("\\", "/") : undefined;
}

/** Keep generic workspace reads from bypassing Janet's bounded web cache tool. */
export function guardWebWorkspaceRead(toolName: string, input: unknown) {
  if (toolName !== "mastra_workspace_read_file") return;
  const requestedPath = inputPath(input);
  if (!requestedPath) return;
  if (
    /(?:^|\/)\.agent-knowledge\/cache\/web\/[a-f0-9]{64}\.md$/i.test(
      requestedPath,
    )
  ) {
    return { proceed: false as const, output: WEB_ARTIFACT_MESSAGE };
  }
}
