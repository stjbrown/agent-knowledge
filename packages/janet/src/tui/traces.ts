export interface TraceSpanSummary {
  spanId: string;
  parentSpanId?: string | null;
  name: string;
  spanType: string;
  startedAt: Date;
  endedAt?: Date | null;
  error?: unknown;
}

function duration(span: TraceSpanSummary): string {
  if (!span.endedAt) return "running";
  const elapsed = Math.max(0, span.endedAt.getTime() - span.startedAt.getTime());
  return elapsed >= 1_000 ? `${(elapsed / 1_000).toFixed(1)}s` : `${elapsed}ms`;
}

export function traceStatus(span: TraceSpanSummary): "error" | "running" | "ok" {
  if (span.error) return "error";
  return span.endedAt ? "ok" : "running";
}

/** Render Mastra's flat span records as a compact, content-free tree. */
export function formatTraceTree(spans: TraceSpanSummary[]): string[] {
  const byParent = new Map<string | null, TraceSpanSummary[]>();
  const ids = new Set(spans.map((span) => span.spanId));
  for (const span of spans) {
    const parent =
      span.parentSpanId && ids.has(span.parentSpanId) ? span.parentSpanId : null;
    const children = byParent.get(parent) ?? [];
    children.push(span);
    byParent.set(parent, children);
  }
  for (const children of byParent.values()) {
    children.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  }

  const lines: string[] = [];
  const visited = new Set<string>();
  const visit = (span: TraceSpanSummary, depth: number): void => {
    if (visited.has(span.spanId)) return;
    visited.add(span.spanId);
    const status = traceStatus(span);
    const marker = status === "error" ? "✗" : status === "running" ? "…" : "✓";
    lines.push(
      `${"  ".repeat(depth)}${marker} ${span.name} · ${span.spanType} · ${duration(span)}`,
    );
    for (const child of byParent.get(span.spanId) ?? []) visit(child, depth + 1);
  };

  for (const root of byParent.get(null) ?? []) visit(root, 0);
  return lines;
}
