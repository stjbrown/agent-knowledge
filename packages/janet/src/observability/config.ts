import { z } from "zod";
import {
  OBSERVABILITY_CAPTURE_MODES,
  OBSERVABILITY_REMOTE_KINDS,
  type ObservabilityCaptureMode,
  type ObservabilityRemoteKind,
  type ObservabilitySettings,
  type ResolvedObservabilityConfig,
  type ResolvedObservabilityRemote,
} from "./types.js";

export const DEFAULT_OBSERVABILITY_SETTINGS: ObservabilitySettings = {
  capture: "off",
  sampleRate: 1,
  local: {
    enabled: false,
    retentionDays: 7,
  },
};

const captureModeSchema = z.enum(OBSERVABILITY_CAPTURE_MODES);
const remoteKindSchema = z.enum(OBSERVABILITY_REMOTE_KINDS);
const persistedEndpointSchema = z.string().min(1).refine((value) => {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
});

const observabilitySettingsSchema = z.object({
  capture: captureModeSchema,
  sampleRate: z.number().min(0).max(1).optional(),
  local: z
    .object({
      enabled: z.boolean(),
      retentionDays: z.number().int().min(1).max(3650).optional(),
    })
    .optional(),
  remote: z
    .object({
      kind: remoteKindSchema,
      endpoint: persistedEndpointSchema,
      projectName: z.string().min(1).optional(),
    })
    .optional(),
});

export function normalizeObservabilitySettings(value: unknown): ObservabilitySettings | undefined {
  if (value === undefined) return undefined;
  const parsed = observabilitySettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function enumValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && allowed.includes(normalized as T) ? (normalized as T) : undefined;
}

function numberValue(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validHttpEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeHeaderValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parse the standard comma-separated OTEL header format without logging values. */
export function parseOtelHeaders(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  const headers: Record<string, string> = {};
  for (const item of value.split(",")) {
    const separator = item.indexOf("=");
    if (separator <= 0) continue;
    const key = item.slice(0, separator).trim();
    const rawValue = item.slice(separator + 1).trim();
    if (key) headers[key] = decodeHeaderValue(rawValue);
  }
  return headers;
}

function remoteFromEnvironment(
  kind: ObservabilityRemoteKind,
  env: NodeJS.ProcessEnv,
  saved?: ObservabilitySettings["remote"],
): ResolvedObservabilityRemote | undefined {
  const endpoint =
    kind === "phoenix"
      ? env["PHOENIX_COLLECTOR_ENDPOINT"]?.trim() ||
        env["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"]?.trim() ||
        env["OTEL_EXPORTER_OTLP_ENDPOINT"]?.trim() ||
        saved?.endpoint ||
        "http://localhost:6006"
      : env["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"]?.trim() ||
        env["OTEL_EXPORTER_OTLP_ENDPOINT"]?.trim() ||
        saved?.endpoint;

  if (!endpoint) return undefined;

  const projectName =
    kind === "phoenix"
      ? env["PHOENIX_PROJECT_NAME"]?.trim() || saved?.projectName || "janet"
      : saved?.projectName;
  const headers = parseOtelHeaders(env["OTEL_EXPORTER_OTLP_HEADERS"]);
  const hasProjectHeader = Object.keys(headers).some(
    (key) => key.toLowerCase() === "x-project-name",
  );
  if (kind === "phoenix" && projectName && !hasProjectHeader) {
    headers["x-project-name"] = projectName;
  }

  return {
    kind,
    endpoint,
    ...(projectName ? { projectName } : {}),
    headers,
  };
}

/**
 * Resolve active observability configuration. Standard OTEL variables can
 * configure an explicitly enabled run, but cannot enable tracing by themselves.
 */
export function resolveObservabilityConfig(
  saved: ObservabilitySettings | undefined,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedObservabilityConfig {
  const warnings: string[] = [];
  const savedSettings = saved ?? DEFAULT_OBSERVABILITY_SETTINGS;

  const captureEnv = enumValue(env["JANET_OBSERVABILITY"], OBSERVABILITY_CAPTURE_MODES);
  if (env["JANET_OBSERVABILITY"] && !captureEnv) {
    warnings.push(
      "Ignoring invalid JANET_OBSERVABILITY value; use off, metadata, or full.",
    );
  }
  const capture: ObservabilityCaptureMode = captureEnv ?? savedSettings.capture;

  const rateEnv = numberValue(env["JANET_OBSERVABILITY_SAMPLE_RATE"]);
  if (
    env["JANET_OBSERVABILITY_SAMPLE_RATE"] !== undefined &&
    (rateEnv === undefined || rateEnv < 0 || rateEnv > 1)
  ) {
    warnings.push("Ignoring invalid JANET_OBSERVABILITY_SAMPLE_RATE; use a value from 0 to 1.");
  }
  const sampleRate =
    rateEnv !== undefined && rateEnv >= 0 && rateEnv <= 1
      ? rateEnv
      : savedSettings.sampleRate ?? 1;

  let local = {
    enabled: savedSettings.local?.enabled ?? false,
    retentionDays: savedSettings.local?.retentionDays ?? 7,
  };
  let remote: ResolvedObservabilityRemote | undefined;
  let explicitRemoteBackend = false;

  const backendEnv = enumValue(
    env["JANET_OBSERVABILITY_BACKEND"],
    ["local", ...OBSERVABILITY_REMOTE_KINDS] as const,
  );
  if (env["JANET_OBSERVABILITY_BACKEND"] && !backendEnv) {
    warnings.push(
      "Ignoring invalid JANET_OBSERVABILITY_BACKEND value; use local, phoenix, or otlp.",
    );
  }

  if (backendEnv === "local") {
    local = { ...local, enabled: true };
  } else if (backendEnv === "phoenix" || backendEnv === "otlp") {
    explicitRemoteBackend = true;
    local = { ...local, enabled: false };
    remote = remoteFromEnvironment(backendEnv, env, savedSettings.remote);
  } else if (savedSettings.remote) {
    remote = remoteFromEnvironment(savedSettings.remote.kind, env, savedSettings.remote);
  } else if (capture !== "off" && env["PHOENIX_COLLECTOR_ENDPOINT"]) {
    remote = remoteFromEnvironment("phoenix", env);
    local = { ...local, enabled: false };
  } else if (
    capture !== "off" &&
    (env["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"] || env["OTEL_EXPORTER_OTLP_ENDPOINT"])
  ) {
    remote = remoteFromEnvironment("otlp", env);
    local = { ...local, enabled: false };
  }

  if (remote && !validHttpEndpoint(remote.endpoint)) {
    warnings.push("The observability endpoint is not a valid HTTP(S) URL.");
    remote = undefined;
  }

  if (capture !== "off" && !local.enabled && !remote && !explicitRemoteBackend) {
    local = { ...local, enabled: true };
  }
  if (capture !== "off" && explicitRemoteBackend && !remote) {
    warnings.push("The selected remote observability backend has no endpoint.");
  }

  const enabled = capture !== "off" && (local.enabled || remote !== undefined);
  return {
    enabled,
    capture,
    sampleRate,
    local: enabled ? local : { ...local, enabled: false },
    ...(enabled && remote ? { remote } : {}),
    warnings,
  };
}
