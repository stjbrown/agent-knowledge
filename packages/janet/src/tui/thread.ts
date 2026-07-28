export interface JanetThreadBinding {
  getId(): string | null;
  create(args?: { title?: string }): Promise<{ id: string }>;
}

export interface ClearedConversation {
  previousThreadId: string | null;
  threadId: string;
}

/**
 * Start a blank conversation without deleting the previous thread.
 *
 * Mastra's thread lifecycle carries the selected model into the new thread,
 * releases the previous lock, resets usage, and rebinds the agent stream.
 */
export async function clearConversation(
  thread: JanetThreadBinding,
): Promise<ClearedConversation> {
  const previousThreadId = thread.getId();
  const created = await thread.create({ title: "Janet conversation" });
  return { previousThreadId, threadId: created.id };
}
