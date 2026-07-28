import { join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import { MastraCompositeStore } from "@mastra/core/storage";
import { ensureDir } from "./paths.js";

export interface JanetStorageOptions {
  localObservability?: {
    enabled: boolean;
    retentionDays: number;
  };
}

export function observabilityDbPath(globalConfigDir: string): string {
  return join(globalConfigDir, "observability.db");
}

class JanetCompositeStorage extends MastraCompositeStore {
  constructor(
    private readonly threadStore: LibSQLStore,
    private readonly observabilityStore: LibSQLStore,
    retentionDays: number,
  ) {
    super({
      id: "agent-knowledge-storage",
      default: threadStore,
      domains: {
        observability: observabilityStore.stores.observability,
      },
      retention: {
        observability: {
          spans: { maxAge: `${retentionDays}d` },
        },
      },
    });
  }

  override async close(): Promise<void> {
    const results = await Promise.allSettled([
      this.threadStore.close(),
      this.observabilityStore.close(),
    ]);
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
  }
}

/**
 * Build the controller's storage. Threads/history live in a per-machine libSQL
 * file in the GLOBAL config dir, keyed at query time by the project's
 * `resourceId` (so continuity is per-project, shared across clones/worktrees).
 *
 * `LibSQLStore extends MastraCompositeStore`, so it satisfies the controller's
 * `storage` field directly when local trace history is off. When it is on, a
 * composite routes only the observability domain to a separate database.
 */
export function createStorage(
  globalConfigDir: string,
  options: JanetStorageOptions = {},
): MastraCompositeStore {
  ensureDir(globalConfigDir);
  const threadStore = new LibSQLStore({
    id: "agent-knowledge-threads",
    url: `file:${join(globalConfigDir, "threads.db")}`,
  });
  if (!options.localObservability?.enabled) return threadStore;

  const observabilityStore = new LibSQLStore({
    id: "agent-knowledge-observability",
    url: `file:${observabilityDbPath(globalConfigDir)}`,
  });
  return new JanetCompositeStorage(
    threadStore,
    observabilityStore,
    options.localObservability.retentionDays,
  );
}
