import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Mastra } from "@mastra/core";
import { SpanType } from "@mastra/core/observability";
import { observabilityDbPath } from "../src/agent/storage.js";
import {
  createObservabilityRuntime,
  safeObservabilityEndpoint,
} from "../src/observability/runtime.js";
import type { ResolvedObservabilityConfig } from "../src/observability/types.js";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "janet-observability-"));
  roots.push(root);
  return root;
}

function config(
  overrides: Partial<ResolvedObservabilityConfig> = {},
): ResolvedObservabilityConfig {
  return {
    enabled: false,
    capture: "off",
    sampleRate: 1,
    local: {
      enabled: false,
      retentionDays: 7,
    },
    warnings: [],
    ...overrides,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("createObservabilityRuntime", () => {
  it("does not construct observability or create its database while off", async () => {
    const root = tempRoot();
    const runtime = createObservabilityRuntime(root, config());

    expect(runtime.observability).toBeUndefined();
    expect(runtime.tracingOptionsForTurn({
      interactive: true,
      operation: "chat",
      resourceId: "janet-project",
    })).toBeUndefined();

    await runtime.storage.init();
    expect(existsSync(observabilityDbPath(root))).toBe(false);
    await runtime.storage.close?.();
  });

  it("creates a separate local trace database only when local capture is enabled", async () => {
    const root = tempRoot();
    const runtime = createObservabilityRuntime(
      root,
      config({
        enabled: true,
        capture: "metadata",
        local: {
          enabled: true,
          retentionDays: 7,
        },
      }),
    );

    await runtime.storage.init();
    expect(existsSync(observabilityDbPath(root))).toBe(true);
    expect(await runtime.storage.getStore("observability")).toBeDefined();
    await runtime.storage.close?.();
  });

  it("hides all inputs and outputs in metadata mode", async () => {
    const root = tempRoot();
    const runtime = createObservabilityRuntime(
      root,
      config({
        enabled: true,
        capture: "metadata",
        local: {
          enabled: true,
          retentionDays: 7,
        },
      }),
    );

    const options = runtime.tracingOptionsForTurn({
      interactive: false,
      operation: "ingest",
      resourceId: "janet-hash",
      threadId: "thread-id",
    });
    expect(options).toMatchObject({
      hideInput: true,
      hideOutput: true,
      tags: ["janet", "ingest"],
      metadata: {
        "janet.mode": "headless",
        "janet.operation": "ingest",
        "janet.capture": "metadata",
        "janet.resource_id": "janet-hash",
        "janet.thread_id": "thread-id",
      },
    });
    await runtime.storage.close?.();
  });

  it("only exposes trace content after full capture was explicitly selected", async () => {
    const root = tempRoot();
    const runtime = createObservabilityRuntime(
      root,
      config({
        enabled: true,
        capture: "full",
        local: {
          enabled: true,
          retentionDays: 7,
        },
      }),
    );

    const options = runtime.tracingOptionsForTurn({
      interactive: true,
      operation: "chat",
      resourceId: "janet-hash",
    });
    expect(options?.hideInput).toBe(false);
    expect(options?.hideOutput).toBe(false);
    await runtime.storage.close?.();
  });

  it("flushes a local trace through Mastra storage", async () => {
    const root = tempRoot();
    const runtime = createObservabilityRuntime(
      root,
      config({
        enabled: true,
        capture: "metadata",
        local: {
          enabled: true,
          retentionDays: 7,
        },
      }),
    );
    if (!runtime.observability) throw new Error("expected observability to be enabled");

    const mastra = new Mastra({
      logger: false,
      storage: runtime.storage,
      observability: runtime.observability,
    });
    await runtime.storage.init();

    const instance = runtime.observability.getDefaultInstance();
    if (!instance) throw new Error("expected a default observability instance");
    const span = instance.startSpan({
      type: SpanType.GENERIC,
      name: "janet test trace",
      metadata: {
        "janet.operation": "test",
      },
    });
    span.end();
    await runtime.flush();

    const store = await runtime.storage.getStore("observability");
    if (!store) throw new Error("expected local observability storage");
    const traces = await store.listTraces({});
    expect(traces.spans).toHaveLength(1);
    expect(traces.spans[0]?.name).toBe("janet test trace");

    await mastra.shutdown();
  });

  it("supports two Janet runtimes writing to the same local trace store", async () => {
    const root = tempRoot();
    const localConfig = config({
      enabled: true,
      capture: "metadata",
      local: {
        enabled: true,
        retentionDays: 7,
      },
    });
    const first = createObservabilityRuntime(root, localConfig);
    const second = createObservabilityRuntime(root, localConfig);
    if (!first.observability || !second.observability) {
      throw new Error("expected observability to be enabled");
    }
    const firstMastra = new Mastra({
      logger: false,
      storage: first.storage,
      observability: first.observability,
    });
    const secondMastra = new Mastra({
      logger: false,
      storage: second.storage,
      observability: second.observability,
    });
    await Promise.all([first.storage.init(), second.storage.init()]);

    const firstInstance = first.observability.getDefaultInstance();
    const secondInstance = second.observability.getDefaultInstance();
    if (!firstInstance || !secondInstance) throw new Error("missing tracing instance");
    firstInstance.startSpan({
      type: SpanType.GENERIC,
      name: "first process",
    }).end();
    secondInstance.startSpan({
      type: SpanType.GENERIC,
      name: "second process",
    }).end();
    await Promise.all([first.flush(), second.flush()]);

    const store = await first.storage.getStore("observability");
    if (!store) throw new Error("missing local observability storage");
    const traces = await store.listTraces({});
    expect(traces.spans.map((span) => span.name).sort()).toEqual([
      "first process",
      "second process",
    ]);

    await Promise.all([firstMastra.shutdown(), secondMastra.shutdown()]);
  });

  it.runIf(process.env["JANET_OTLP_INTEGRATION"] === "1")(
    "exports Phoenix-compatible OTLP protobuf traces with the project header",
    async () => {
      const requests: Array<{
        path: string | undefined;
        contentType: string | undefined;
        projectName: string | undefined;
        bodyBytes: number;
      }> = [];
      const server = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => {
          requests.push({
            path: request.url,
            contentType: request.headers["content-type"],
            projectName: request.headers["x-project-name"] as string | undefined,
            bodyBytes: Buffer.concat(chunks).length,
          });
          response.writeHead(200, { "content-type": "application/x-protobuf" });
          response.end();
        });
      });
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => reject(error);
        server.once("error", onError);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", onError);
          resolve();
        });
      });
      const address = server.address() as AddressInfo;

      let mastra: Mastra | undefined;
      try {
        const root = tempRoot();
        const runtime = createObservabilityRuntime(
          root,
          config({
            enabled: true,
            capture: "metadata",
            remote: {
              kind: "phoenix",
              endpoint: `http://127.0.0.1:${address.port}`,
              projectName: "janet-test",
              headers: { "x-project-name": "janet-test" },
            },
          }),
        );
        if (!runtime.observability) {
          throw new Error("expected observability to be enabled");
        }
        mastra = new Mastra({
          logger: false,
          storage: runtime.storage,
          observability: runtime.observability,
        });
        await runtime.storage.init();

        const instance = runtime.observability.getDefaultInstance();
        if (!instance) throw new Error("expected a default observability instance");
        instance.startSpan({
          type: SpanType.GENERIC,
          name: "phoenix export",
        }).end();
        await runtime.flush();

        expect(requests).toEqual([
          {
            path: "/v1/traces",
            contentType: "application/x-protobuf",
            projectName: "janet-test",
            bodyBytes: expect.any(Number),
          },
        ]);
        expect(requests[0]!.bodyBytes).toBeGreaterThan(0);
      } finally {
        await mastra?.shutdown().catch(() => {});
        if (server.listening) {
          await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          });
        }
      }
    },
  );
});

describe("safeObservabilityEndpoint", () => {
  it("removes credentials, query strings, and fragments from status output", () => {
    expect(
      safeObservabilityEndpoint(
        "https://user:secret@example.com/v1/traces?api_key=hidden#debug",
      ),
    ).toBe("https://example.com/v1/traces");
  });
});
