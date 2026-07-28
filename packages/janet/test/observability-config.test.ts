import { describe, expect, it } from "vitest";
import {
  normalizeObservabilitySettings,
  parseOtelHeaders,
  resolveObservabilityConfig,
} from "../src/observability/config.js";
import type { ObservabilitySettings } from "../src/observability/types.js";

const metadataLocal: ObservabilitySettings = {
  capture: "metadata",
  sampleRate: 1,
  local: {
    enabled: true,
    retentionDays: 7,
  },
};

describe("resolveObservabilityConfig", () => {
  it("stays fully off by default, even when standard OTEL variables exist", () => {
    const resolved = resolveObservabilityConfig(undefined, {
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
      OTEL_EXPORTER_OTLP_HEADERS: "authorization=secret",
    });

    expect(resolved.enabled).toBe(false);
    expect(resolved.capture).toBe("off");
    expect(resolved.local.enabled).toBe(false);
    expect(resolved.remote).toBeUndefined();
  });

  it("uses local metadata capture when explicitly enabled without a backend", () => {
    const resolved = resolveObservabilityConfig(undefined, {
      JANET_OBSERVABILITY: "metadata",
    });

    expect(resolved.enabled).toBe(true);
    expect(resolved.capture).toBe("metadata");
    expect(resolved.local).toEqual({ enabled: true, retentionDays: 7 });
  });

  it("lets an explicit off environment override disable saved settings", () => {
    const resolved = resolveObservabilityConfig(metadataLocal, {
      JANET_OBSERVABILITY: "off",
    });

    expect(resolved.enabled).toBe(false);
    expect(resolved.local.enabled).toBe(false);
    expect(resolved.remote).toBeUndefined();
  });

  it("configures Phoenix through generic OTLP without exposing headers in status data", () => {
    const resolved = resolveObservabilityConfig(undefined, {
      JANET_OBSERVABILITY: "metadata",
      JANET_OBSERVABILITY_BACKEND: "phoenix",
      PHOENIX_COLLECTOR_ENDPOINT: "http://localhost:6006",
      PHOENIX_PROJECT_NAME: "janet-test",
      OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer%20abc,custom=value",
    });

    expect(resolved.enabled).toBe(true);
    expect(resolved.local.enabled).toBe(false);
    expect(resolved.remote).toEqual({
      kind: "phoenix",
      endpoint: "http://localhost:6006",
      projectName: "janet-test",
      headers: {
        authorization: "Bearer abc",
        custom: "value",
        "x-project-name": "janet-test",
      },
    });
  });

  it("fails closed for an explicitly selected remote backend without an endpoint", () => {
    const resolved = resolveObservabilityConfig(undefined, {
      JANET_OBSERVABILITY: "metadata",
      JANET_OBSERVABILITY_BACKEND: "otlp",
    });

    expect(resolved.enabled).toBe(false);
    expect(resolved.warnings).toContain(
      "The selected remote observability backend has no endpoint.",
    );
  });

  it("ignores malformed environment overrides and preserves saved settings", () => {
    const resolved = resolveObservabilityConfig(metadataLocal, {
      JANET_OBSERVABILITY: "sometimes",
      JANET_OBSERVABILITY_SAMPLE_RATE: "4",
    });

    expect(resolved.enabled).toBe(true);
    expect(resolved.capture).toBe("metadata");
    expect(resolved.sampleRate).toBe(1);
    expect(resolved.warnings).toHaveLength(2);
  });
});

describe("parseOtelHeaders", () => {
  it("parses standard comma-separated and URL-encoded header values", () => {
    expect(parseOtelHeaders("authorization=Bearer%20abc,x-project-name=janet")).toEqual({
      authorization: "Bearer abc",
      "x-project-name": "janet",
    });
  });

  it("skips malformed header entries", () => {
    expect(parseOtelHeaders("missing,=empty,valid=yes")).toEqual({ valid: "yes" });
  });
});

describe("normalizeObservabilitySettings", () => {
  it("rejects saved endpoints that could persist credentials", () => {
    expect(
      normalizeObservabilitySettings({
        capture: "metadata",
        remote: {
          kind: "otlp",
          endpoint: "https://user:secret@example.com/v1/traces?token=also-secret",
        },
      }),
    ).toBeUndefined();
  });

  it("strips unknown runtime-only fields from persisted settings", () => {
    expect(
      normalizeObservabilitySettings({
        capture: "metadata",
        remote: {
          kind: "otlp",
          endpoint: "https://example.com/v1/traces",
          headers: { authorization: "secret" },
        },
      }),
    ).toEqual({
      capture: "metadata",
      remote: {
        kind: "otlp",
        endpoint: "https://example.com/v1/traces",
      },
    });
  });
});
