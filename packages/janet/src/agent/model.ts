import type { RequestContext } from "@mastra/core/di";
import type { AgentControllerRequestContext } from "@mastra/core/agent-controller";
import type { MastraModelConfig } from "@mastra/core/llm";
import { VERTEX_GATEWAY_ID, createVertexModel } from "../gateways/vertex.js";
import { BEDROCK_GATEWAY_ID, createBedrockModel } from "../gateways/bedrock.js";
import { getAuthStorage, opencodeClaudeMaxProvider } from "../gateways/oauth/claude-max.js";
import { openaiCodexProvider } from "../gateways/oauth/openai-codex.js";

/** True when a Claude Max / Codex OAuth credential is stored for a provider. */
function hasOAuthCredential(authProviderId: string): boolean {
  try {
    const storage = getAuthStorage();
    storage.reload();
    return storage.get(authProviderId)?.type === "oauth";
  } catch {
    return false;
  }
}

/**
 * Dynamic model resolver (pattern: mastracode `sdk/src/agents/model.ts`).
 *
 * The agent's `model` is this function. It reads the session's currently
 * selected model id (set via `session.model.switch({ modelId })`) from the
 * request context and returns it. There is NO default provider or model — if
 * nothing is selected we throw, and the caller surfaces the "select a model"
 * message.
 *
 * A bare `provider/model` id resolves through the controller's registered
 * gateways (Bedrock, Vertex, custom) plus core's default gateways (models.dev),
 * which pick up API keys from the environment. Special providers that need
 * explicit construction are handled by their gateways via `handlesModel`.
 */
export function getDynamicModel({ requestContext }: { requestContext: RequestContext }): MastraModelConfig {
  const controller = requestContext.get("controller") as AgentControllerRequestContext<unknown> | undefined;
  const modelId = controller?.session?.modelId;
  if (!modelId) {
    throw new Error("No model selected. Use /models (or --model) to select a model first.");
  }

  // Special-case providers that need explicit construction (ADC/credential-chain
  // auth, no bearer key), mirroring mastracode's resolveModel. Everything else
  // is a `provider/model` id resolved through core's default gateways using env
  // API keys.
  const slash = modelId.indexOf("/");
  const providerId = slash >= 0 ? modelId.slice(0, slash) : modelId;
  const bareModelId = slash >= 0 ? modelId.slice(slash + 1) : modelId;

  if (providerId === VERTEX_GATEWAY_ID) {
    return createVertexModel(bareModelId) as MastraModelConfig;
  }
  if (providerId === BEDROCK_GATEWAY_ID) {
    return createBedrockModel(bareModelId) as MastraModelConfig;
  }
  // OAuth (Claude Max / Codex): only when a subscription credential is stored;
  // otherwise fall through to the API-key path via core's default gateways.
  if (providerId === "anthropic" && hasOAuthCredential("anthropic")) {
    return opencodeClaudeMaxProvider(bareModelId);
  }
  if (providerId === "openai" && hasOAuthCredential("openai-codex")) {
    return openaiCodexProvider(bareModelId);
  }
  return modelId;
}
