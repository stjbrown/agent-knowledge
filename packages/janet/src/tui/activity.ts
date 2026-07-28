const WORKSPACE_READ = new Set([
  "mastra_workspace_file_stat",
  "mastra_workspace_grep",
  "mastra_workspace_lsp_inspect",
  "mastra_workspace_list_files",
  "mastra_workspace_read_file",
  "mastra_workspace_search",
]);

const WORKSPACE_WRITE = new Set([
  "mastra_workspace_ast_edit",
  "mastra_workspace_delete",
  "mastra_workspace_edit_file",
  "mastra_workspace_index",
  "mastra_workspace_mkdir",
  "mastra_workspace_write_file",
]);

const WORKSPACE_EXECUTE = new Set([
  "mastra_workspace_execute_command",
  "mastra_workspace_get_process_output",
  "mastra_workspace_kill_process",
]);

const PDF_READ = new Set(["janet_read_pdf", "janet_read_pdf_chunk"]);
const WEB_READ = new Set(["janet_web_fetch", "janet_web_fetch_chunk"]);

/** Friendly transient status for routine tool work. */
export function toolActivityLabel(toolName: string): string {
  if (toolName === "skill" || toolName === "skill_read" || toolName === "skill_search") {
    return "Janet is reading the playbook…";
  }
  if (PDF_READ.has(toolName)) return "Janet is reading the document…";
  if (WEB_READ.has(toolName)) return "Janet is reading the page…";
  if (WORKSPACE_READ.has(toolName)) return "Janet is checking the workspace…";
  if (WORKSPACE_WRITE.has(toolName)) return "Janet is updating the bundle…";
  if (WORKSPACE_EXECUTE.has(toolName) || toolName.includes("shell")) {
    return "Janet is running a check…";
  }
  return "Janet is working…";
}

/** Turn recoverable workspace guard failures into useful user-facing status. */
export function toolErrorLabel(result: unknown): string {
  const detail = String(result);
  const readRequired = detail.match(
    /File "([^"]+)" (?:has not been read|was modified since last read)/,
  );
  if (readRequired) {
    return `Update paused: Janet needs to re-read "${readRequired[1]}" first.`;
  }
  return `Tool error: ${detail.slice(0, 140)}`;
}
