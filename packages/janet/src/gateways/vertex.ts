import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createVertex } from "@ai-sdk/google-vertex";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { MastraModelGateway } from "@mastra/core/llm";
import type {
  GatewayAuthRequest,
  GatewayAuthResult,
  GatewayLanguageModel,
  ProviderConfig,
} from "@mastra/core/llm";

export const VERTEX_GATEWAY_ID = "vertex";

/**
 * Google Vertex AI gateway — NET-NEW (mastracode has no Vertex). Modeled on the
 * Bedrock gateway: authenticates via Google Application Default Credentials
 * (ADC) or a service-account file rather than a bearer key.
 *
 * Model id form is `vertex/<model>`. Anthropic (Claude) models on Vertex go
 * through `@ai-sdk/google-vertex/anthropic` (`createVertexAnthropic`); Gemini
 * and everything else go through `createVertex`. Project/location come from
 * `GOOGLE_VERTEX_PROJECT` / `GOOGLE_VERTEX_LOCATION` (the AI SDK reads these
 * itself; we also honor `GOOGLE_CLOUD_*` fallbacks).
 */
export function hasGoogleCredentials(): boolean {
  if (
    process.env["GOOGLE_APPLICATION_CREDENTIALS"] ||
    process.env["GOOGLE_VERTEX_PROJECT"] ||
    process.env["GOOGLE_CLOUD_PROJECT"]
  ) {
    return true;
  }
  const home = process.env["HOME"] || process.env["USERPROFILE"] || homedir();
  return existsSync(join(home, ".config", "gcloud", "application_default_credentials.json"));
}

function vertexProject(): string | undefined {
  return (
    process.env["GOOGLE_VERTEX_PROJECT"] ||
    process.env["GOOGLE_CLOUD_PROJECT"] ||
    undefined
  );
}

function vertexLocation(): string {
  return (
    process.env["GOOGLE_VERTEX_LOCATION"] ||
    process.env["GOOGLE_CLOUD_LOCATION"] ||
    // Default to the `global` endpoint: it serves the newest Claude models
    // (e.g. claude-opus-4-8) that regional endpoints like us-east5 may not, and
    // the AI SDK special-cases it to the region-less aiplatform.googleapis.com
    // host. Overridable via env for region-pinned deployments.
    "global"
  );
}

/** Build a Vertex language model for a bare model id (no `vertex/` prefix). */
export function createVertexModel(
  bareModelId: string,
  headers?: Record<string, string>,
): GatewayLanguageModel {
  const project = vertexProject();
  const location = vertexLocation();
  const isAnthropic = /^claude/i.test(bareModelId);
  if (isAnthropic) {
    const provider = createVertexAnthropic({ project, location, headers });
    return provider(bareModelId) as unknown as GatewayLanguageModel;
  }
  const provider = createVertex({ project, location, headers });
  return provider(bareModelId) as unknown as GatewayLanguageModel;
}

export class VertexGateway extends MastraModelGateway {
  readonly id = VERTEX_GATEWAY_ID;
  readonly name = "Google Vertex AI";

  shouldEnable(): boolean {
    return hasGoogleCredentials();
  }

  handlesModel(modelId: string): boolean {
    return modelId === VERTEX_GATEWAY_ID || modelId.startsWith(`${VERTEX_GATEWAY_ID}/`);
  }

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      vertex: {
        name: "Google Vertex AI",
        apiKeyEnvVar: "",
        apiKeyHeader: "Authorization",
        gateway: this.id,
        models: [
          "claude-opus-4-8",
          "claude-sonnet-4-5",
          "gemini-2.5-pro",
          "gemini-2.5-flash",
        ],
      },
    };
  }

  buildUrl(_modelId: string): string | undefined {
    return undefined;
  }

  async getApiKey(_modelId: string): Promise<string> {
    return hasGoogleCredentials() ? "google-adc" : "";
  }

  resolveAuth(_request: GatewayAuthRequest): GatewayAuthResult | undefined {
    return hasGoogleCredentials() ? { apiKey: "google-adc", source: "gateway" } : undefined;
  }

  resolveLanguageModel(args: {
    modelId: string;
    providerId: string;
    apiKey: string;
    headers?: Record<string, string>;
  }): GatewayLanguageModel {
    const bare = args.modelId.startsWith(`${VERTEX_GATEWAY_ID}/`)
      ? args.modelId.slice(VERTEX_GATEWAY_ID.length + 1)
      : args.modelId;
    return createVertexModel(bare, args.headers);
  }
}

export function createVertexGateway(): VertexGateway {
  return new VertexGateway();
}
