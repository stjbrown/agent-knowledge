import { join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import type { MastraCompositeStore } from "@mastra/core/storage";
import { ensureDir } from "./paths.js";

/**
 * Build the controller's storage. Threads/history live in a per-machine libSQL
 * file in the GLOBAL config dir, keyed at query time by the project's
 * `resourceId` (so continuity is per-project, shared across clones/worktrees).
 *
 * `LibSQLStore extends MastraCompositeStore`, so it satisfies the controller's
 * `storage` field directly — no wrapping needed.
 */
export function createStorage(globalConfigDir: string): MastraCompositeStore {
  ensureDir(globalConfigDir);
  const dbPath = join(globalConfigDir, "threads.db");
  return new LibSQLStore({ id: "agent-knowledge-threads", url: `file:${dbPath}` });
}
