import type { ObservabilityEntrypoint, TracingOptions } from "@mastra/core/observability";
import { SpanType } from "@mastra/core/observability";
import type { MastraCompositeStore } from "@mastra/core/storage";
import {
  MastraStorageExporter,
  Observability,
  SamplingStrategyType,
} from "@mastra/observability";
import { OtelExporter } from "@mastra/otel-exporter";
import { createStorage } from "../agent/storage.js";
import { packageVersion } from "../version.js";
import type {
  ObservabilityStatus,
  ResolvedObservabilityConfig,
} from "./types.js";

export interface TraceTurnContext {
  interactive: boolean;
  operation: "chat" | "init" | "ingest" | "query" | "lint" | "viz";
  resourceId: string;
  threadId?: string;
}

export interface JanetObservabilityRuntime {
  config: ResolvedObservabilityConfig;
  status: ObservabilityStatus;
  observability?: ObservabilityEntrypoint;
  storage: MastraCompositeStore;
  tracingOptionsForTurn(context: TraceTurnContext): TracingOptions | undefined;
  flush(): Promise<void>;
  prune(): Promise<void>;
}

export function safeObservabilityEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "(invalid endpoint)";
  }
}

function statusFor(config: ResolvedObservabilityConfig): ObservabilityStatus {
  const destinations: string[] = [];
  if (config.local.enabled) destinations.push("local");
  if (config.remote) {
    destinations.push(
      config.remote.kind === "phoenix"
        ? `phoenix (${safeObservabilityEndpoint(config.remote.endpoint)})`
        : `otlp (${safeObservabilityEndpoint(config.remote.endpoint)})`,
    );
  }
  return {
    enabled: config.enabled,
    capture: config.capture,
    sampleRate: config.sampleRate,
    destinations,
    warnings: [...config.warnings],
  };
}

export function formatObservabilityStatus(status: ObservabilityStatus): string {
  if (!status.enabled) {
    return status.warnings.length
      ? `off (${status.warnings.join(" ")})`
      : "off";
  }
  const sample =
    status.sampleRate === 1
      ? ""
      : `, ${Math.round(status.sampleRate * 100)}% sampling`;
  return `${status.capture} to ${status.destinations.join(" + ")}${sample}`;
}

export function createObservabilityRuntime(
  globalConfigDir: string,
  config: ResolvedObservabilityConfig,
): JanetObservabilityRuntime {
  const storage = createStorage(globalConfigDir, {
    localObservability: config.local,
  });

  let observability: Observability | undefined;
  if (config.enabled) {
    const exporters = [];
    if (config.local.enabled) {
      exporters.push(
        new MastraStorageExporter({
          maxBatchSize: 50,
          maxBufferSize: 500,
          maxBatchWaitMs: 1_000,
          strategy: "auto",
        }),
      );
    }
    if (config.remote) {
      exporters.push(
        new OtelExporter({
          provider: {
            custom: {
              endpoint: config.remote.endpoint,
              protocol: "http/protobuf",
              headers: config.remote.headers,
            },
          },
          signals: {
            traces: true,
            logs: false,
          },
          timeout: 10_000,
          batchSize: 50,
          resourceAttributes:
            config.remote.kind === "phoenix" && config.remote.projectName
              ? { "openinference.project.name": config.remote.projectName }
              : undefined,
        }),
      );
    }

    observability = new Observability({
      configs: {
        janet: {
          serviceName: "janet",
          sampling:
            config.sampleRate === 1
              ? { type: SamplingStrategyType.ALWAYS }
              : {
                  type: SamplingStrategyType.RATIO,
                  probability: config.sampleRate,
                },
          exporters,
          includeInternalSpans: false,
          excludeSpanTypes: [SpanType.MODEL_CHUNK],
          requestContextKeys: [],
          serializationOptions: {
            maxStringLength: 2_000,
            maxDepth: 5,
            maxArrayLength: 50,
            maxObjectKeys: 50,
          },
          logging: {
            enabled: false,
          },
        },
      },
      sensitiveDataFilter: true,
    });
  }

  return {
    config,
    status: statusFor(config),
    observability,
    storage,
    tracingOptionsForTurn(context): TracingOptions | undefined {
      if (!config.enabled) return undefined;
      return {
        metadata: {
          "janet.version": packageVersion(),
          "janet.mode": context.interactive ? "interactive" : "headless",
          "janet.operation": context.operation,
          "janet.capture": config.capture,
          "janet.resource_id": context.resourceId,
          ...(context.threadId ? { "janet.thread_id": context.threadId } : {}),
        },
        tags: ["janet", context.operation],
        hideInput: config.capture !== "full",
        hideOutput: config.capture !== "full",
      };
    },
    async flush(): Promise<void> {
      await observability?.flush();
    },
    async prune(): Promise<void> {
      if (!config.local.enabled) return;
      await storage.prune({
        maxBatches: 1,
        maxRows: 1_000,
      });
    },
  };
}
