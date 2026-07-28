export const OBSERVABILITY_CAPTURE_MODES = ["off", "metadata", "full"] as const;
export type ObservabilityCaptureMode = (typeof OBSERVABILITY_CAPTURE_MODES)[number];

export const OBSERVABILITY_REMOTE_KINDS = ["phoenix", "otlp"] as const;
export type ObservabilityRemoteKind = (typeof OBSERVABILITY_REMOTE_KINDS)[number];

/** Non-sensitive observability preferences persisted in settings.json. */
export interface ObservabilitySettings {
  capture: ObservabilityCaptureMode;
  sampleRate?: number;
  local?: {
    enabled: boolean;
    retentionDays?: number;
  };
  remote?: {
    kind: ObservabilityRemoteKind;
    endpoint: string;
    projectName?: string;
  };
}

export interface ResolvedObservabilityRemote {
  kind: ObservabilityRemoteKind;
  endpoint: string;
  projectName?: string;
  /** Runtime-only secrets. Never persist or include in status output. */
  headers: Record<string, string>;
}

export interface ResolvedObservabilityConfig {
  enabled: boolean;
  capture: ObservabilityCaptureMode;
  sampleRate: number;
  local: {
    enabled: boolean;
    retentionDays: number;
  };
  remote?: ResolvedObservabilityRemote;
  warnings: string[];
}

export interface ObservabilityStatus {
  enabled: boolean;
  capture: ObservabilityCaptureMode;
  sampleRate: number;
  destinations: string[];
  warnings: string[];
}
