import type { Agent } from "@mastra/core/agent";
import type { RequestContext } from "@mastra/core/di";
import type { Memory } from "@mastra/memory";

export interface CompactConversationOptions {
  memory: Memory;
  agent: Agent;
  threadId: string;
  resourceId: string;
  requestContext: RequestContext;
}

export interface CompactConversationResult {
  pendingTokensBefore: number;
  pendingTokensAfter: number;
  observationTokens: number;
  buffered: boolean;
  activated: boolean;
  reflected: boolean;
}

/**
 * Flush the current thread into the same OM record used by automatic
 * observation. Nothing is deleted: retrieval-mode ranges retain links back to
 * the raw messages, while the next agent step receives observations plus the
 * remaining unobserved tail.
 */
export async function compactConversation({
  memory,
  agent,
  threadId,
  resourceId,
  requestContext,
}: CompactConversationOptions): Promise<CompactConversationResult> {
  const om = await memory.omEngine;
  if (!om) {
    throw new Error("Observational Memory is unavailable for this storage.");
  }

  await om.waitForBuffering(threadId, resourceId);
  const before = await om.getStatus({ threadId, resourceId });

  let buffered = false;
  if (before.pendingTokens > 0) {
    const result = await om.buffer({
      threadId,
      resourceId,
      requestContext,
      agent,
      pendingTokens: before.pendingTokens,
      record: before.record,
      skipMinimumTokenCheck: true,
    });
    buffered = result.buffered;
  }

  await om.waitForBuffering(threadId, resourceId);
  const activation = await om.activate({
    threadId,
    resourceId,
    checkThreshold: false,
  });

  const afterActivation = await om.getStatus({ threadId, resourceId });
  let reflected = false;
  let record = activation.record;
  if (afterActivation.shouldReflect) {
    const reflection = await om.reflect(
      threadId,
      resourceId,
      undefined,
      requestContext,
    );
    reflected = reflection.reflected;
    record = reflection.record;
  }

  const after = await om.getStatus({ threadId, resourceId });
  return {
    pendingTokensBefore: before.pendingTokens,
    pendingTokensAfter: after.pendingTokens,
    observationTokens: record.observationTokenCount,
    buffered,
    activated: activation.activated,
    reflected,
  };
}
