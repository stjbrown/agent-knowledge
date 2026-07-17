import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { MastraModelGateway } from "@mastra/core/llm";
import type {
  GatewayAuthRequest,
  GatewayAuthResult,
  GatewayLanguageModel,
  ProviderConfig,
} from "@mastra/core/llm";

export const BEDROCK_GATEWAY_ID = "amazon-bedrock";

/**
 * Amazon Bedrock gateway — lifted from mastracode's
 * `sdk/src/providers/amazon-bedrock-gateway.ts` (Apache-2.0; see NOTICE).
 * Bedrock authenticates with AWS SigV4 (or a bearer token) rather than an API
 * key, resolved through the standard AWS provider chain.
 */
export function hasAwsCredentials(): boolean {
  if (
    process.env["AWS_BEARER_TOKEN_BEDROCK"] ||
    (process.env["AWS_ACCESS_KEY_ID"] && process.env["AWS_SECRET_ACCESS_KEY"]) ||
    process.env["AWS_SHARED_CREDENTIALS_FILE"] ||
    process.env["AWS_CONFIG_FILE"] ||
    process.env["AWS_PROFILE"] ||
    process.env["AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"] ||
    process.env["AWS_CONTAINER_CREDENTIALS_FULL_URI"] ||
    process.env["AWS_WEB_IDENTITY_TOKEN_FILE"]
  ) {
    return true;
  }
  const home = process.env["HOME"] || process.env["USERPROFILE"] || homedir();
  if (home) {
    const awsDir = join(home, ".aws");
    const credentialsPath = process.env["AWS_SHARED_CREDENTIALS_FILE"] ?? join(awsDir, "credentials");
    const configPath = process.env["AWS_CONFIG_FILE"] ?? join(awsDir, "config");
    if (existsSync(credentialsPath) || existsSync(configPath)) return true;
  }
  return false;
}

/** Build a Bedrock model for a bare model id (no `amazon-bedrock/` prefix). */
export function createBedrockModel(
  bareModelId: string,
  headers?: Record<string, string>,
): GatewayLanguageModel {
  const region =
    process.env["AWS_REGION"] || process.env["AWS_DEFAULT_REGION"] || "us-east-1";
  const bedrock = createAmazonBedrock({
    region,
    credentialProvider: fromNodeProviderChain(),
    headers,
  });
  return bedrock(bareModelId) as unknown as GatewayLanguageModel;
}

export class BedrockGateway extends MastraModelGateway {
  readonly id = BEDROCK_GATEWAY_ID;
  readonly name = "Amazon Bedrock";

  shouldEnable(): boolean {
    return hasAwsCredentials();
  }

  handlesModel(modelId: string): boolean {
    return modelId === BEDROCK_GATEWAY_ID || modelId.startsWith(`${BEDROCK_GATEWAY_ID}/`);
  }

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      "amazon-bedrock": {
        name: "Amazon Bedrock",
        apiKeyEnvVar: "",
        apiKeyHeader: "Authorization",
        gateway: this.id,
        models: [
          "anthropic.claude-opus-4-1-20250805-v1:0",
          "anthropic.claude-sonnet-4-20250514-v1:0",
        ],
      },
    };
  }

  buildUrl(_modelId: string): string | undefined {
    return undefined;
  }

  async getApiKey(_modelId: string): Promise<string> {
    return hasAwsCredentials() ? "aws-credential-chain" : "";
  }

  resolveAuth(_request: GatewayAuthRequest): GatewayAuthResult | undefined {
    return hasAwsCredentials() ? { apiKey: "aws-credential-chain", source: "gateway" } : undefined;
  }

  resolveLanguageModel(args: {
    modelId: string;
    providerId: string;
    apiKey: string;
    headers?: Record<string, string>;
  }): GatewayLanguageModel {
    const bare = args.modelId.startsWith(`${BEDROCK_GATEWAY_ID}/`)
      ? args.modelId.slice(BEDROCK_GATEWAY_ID.length + 1)
      : args.modelId;
    return createBedrockModel(bare, args.headers);
  }
}

export function createBedrockGateway(): BedrockGateway {
  return new BedrockGateway();
}
