import type { ToolCategory } from "@mastra/core/agent-controller";

/**
 * Classify janet's tools into permission categories (pattern: mastracode's
 * `permissions.ts`). The AgentController uses this to decide what needs
 * approval. Returning `null` means "always allow, never prompt" — reads,
 * skill loading, task bookkeeping, and ask_user are pure/interactive and never
 * mutate the project, so they should never interrupt the user.
 *
 * Without this resolver every tool falls to the default "ask" policy, which is
 * why an un-wired janet prompted for even read_file and skill.
 */
const ALWAYS_ALLOW = new Set([
  "skill",
  "skill_read",
  "skill_search",
  "ask_user",
  "task_write",
  "task_update",
  "task_complete",
  "task_check",
  "submit_plan",
]);

const CATEGORY: Record<string, ToolCategory> = {
  mastra_workspace_read_file: "read",
  mastra_workspace_list_files: "read",
  mastra_workspace_file_stat: "read",
  mastra_workspace_search: "read",
  mastra_workspace_write_file: "edit",
  mastra_workspace_edit_file: "edit",
  mastra_workspace_delete: "edit",
  mastra_workspace_mkdir: "edit",
  mastra_workspace_execute_command: "execute",
};

export function janetToolCategory(toolName: string): ToolCategory | null {
  if (ALWAYS_ALLOW.has(toolName)) return null;
  return CATEGORY[toolName] ?? "other";
}
