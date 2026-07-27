interface MessageLike {
  role: string;
  content: unknown;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Mastra 1.51 emitted controller content as an array. Mastra 1.52 moved to its
 * DB-native `{ format: 2, parts: [...] }` shape. Accept both so a dependency
 * update or persisted message cannot crash the event listener.
 */
function messageParts(message: MessageLike): unknown[] {
  if (Array.isArray(message.content)) return message.content;

  const content = record(message.content);
  if (!content) return [];
  if (Array.isArray(content.parts)) return content.parts;
  if (Array.isArray(content.content)) return content.content;
  return [content];
}

/** Concatenate the text parts of an assistant message (drops thinking/tools). */
export function messageText(message: MessageLike): string {
  if (message.role !== "assistant") return "";

  if (typeof message.content === "string") return message.content;

  const text = messageParts(message)
    .map(record)
    .filter((part): part is Record<string, unknown> => part?.type === "text")
    .map((part) => part.text)
    .filter((value): value is string => typeof value === "string")
    .join("");

  if (text) return text;

  const content = record(message.content);
  return typeof content?.content === "string" ? content.content : "";
}

/** Extract tool names from either controller message format for debug output. */
export function messageToolNames(message: MessageLike): string[] {
  return messageParts(message).flatMap((value) => {
    const part = record(value);
    if (!part) return [];

    if (part.type === "tool_call" && typeof part.name === "string") {
      return [part.name];
    }

    if (part.type === "tool-invocation") {
      const invocation = record(part.toolInvocation);
      if (typeof invocation?.toolName === "string") return [invocation.toolName];
    }

    return [];
  });
}
