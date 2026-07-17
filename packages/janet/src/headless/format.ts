import type { AgentControllerMessage } from "@mastra/core/agent-controller";

/** Concatenate the text parts of an assistant message (drops thinking/tools). */
export function messageText(message: AgentControllerMessage): string {
  if (message.role !== "assistant") return "";
  return message.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("");
}
