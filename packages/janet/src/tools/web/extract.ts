import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import TurndownService from "turndown";

export type WebExtractionMethod =
  | "readability"
  | "document"
  | "markdown"
  | "text"
  | "json"
  | "xml";

export interface ExtractedWebContent {
  title: string | null;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
  markdown: string;
  extraction: WebExtractionMethod;
  warnings: string[];
}

function mediaType(contentType: string): string {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function charset(contentType: string): string {
  const match = /(?:^|;)\s*charset\s*=\s*(?:"([^"]+)"|'([^']+)'|([^;\s]+))/i.exec(
    contentType,
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "utf-8";
}

function beginsLikeHtml(text: string): boolean {
  return /^\s*(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/i.test(text);
}

function normalizeMarkdown(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replaceAll("\0", "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function singleLine(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function decodeText(body: Uint8Array, contentType: string): {
  text: string;
  warning?: string;
} {
  const encoding = charset(contentType);
  try {
    return { text: new TextDecoder(encoding).decode(body) };
  } catch {
    return {
      text: new TextDecoder("utf-8").decode(body),
      warning: `Unsupported declared charset "${encoding}"; decoded as UTF-8.`,
    };
  }
}

function sanitizeDocument(document: Document, baseUrl: string): void {
  document
    .querySelectorAll(
      [
        "script",
        "style",
        "noscript",
        "template",
        "iframe",
        "object",
        "embed",
        "canvas",
        "svg",
        "form",
        "dialog",
        "[hidden]",
        '[aria-hidden="true"]',
      ].join(","),
    )
    .forEach((element) => element.remove());

  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const resolved = new URL(anchor.getAttribute("href") ?? "", baseUrl);
      if (["http:", "https:", "mailto:"].includes(resolved.protocol)) {
        anchor.setAttribute("href", resolved.href);
      } else {
        anchor.removeAttribute("href");
      }
    } catch {
      anchor.removeAttribute("href");
    }
  }

  for (const image of document.querySelectorAll<HTMLImageElement>("img[src]")) {
    try {
      const resolved = new URL(image.getAttribute("src") ?? "", baseUrl);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") {
        image.setAttribute("src", resolved.href);
      } else {
        image.removeAttribute("src");
      }
    } catch {
      image.removeAttribute("src");
    }
  }
}

function toMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });
  turndown.remove([
    "script",
    "style",
    "noscript",
    "template",
    "iframe",
    "object",
    "embed",
    "canvas",
    "form",
  ]);
  return normalizeMarkdown(turndown.turndown(html));
}

function extractHtml(text: string, finalUrl: string): ExtractedWebContent {
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(text, {
    url: finalUrl,
    contentType: "text/html",
    virtualConsole,
  });
  const { document } = dom.window;
  sanitizeDocument(document, finalUrl);
  const fallbackTitle = singleLine(document.title);
  const warnings: string[] = [];

  try {
    const article = new Readability(document.cloneNode(true) as Document, {
      charThreshold: 100,
      maxElemsToParse: 50_000,
    }).parse();
    if (article?.content && article.textContent?.trim()) {
      const markdown = toMarkdown(article.content);
      if (markdown) {
        dom.window.close();
        return {
          title: singleLine(article.title) ?? fallbackTitle,
          byline: singleLine(article.byline),
          siteName: singleLine(article.siteName),
          publishedTime: singleLine(article.publishedTime),
          markdown,
          extraction: "readability",
          warnings,
        };
      }
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown parser error";
    warnings.push(`Reader-mode extraction failed (${detail}); used document fallback.`);
  }

  document
    .querySelectorAll(
      [
        "nav",
        "header",
        "footer",
        "aside",
        '[role="banner"]',
        '[role="navigation"]',
        '[role="complementary"]',
      ].join(","),
    )
    .forEach((element) => element.remove());
  const content =
    document.querySelector("main, article, [role='main']") ?? document.body;
  const markdown = toMarkdown(content?.innerHTML ?? "");
  dom.window.close();
  warnings.push("Reader-mode extraction found no article; used the page's main document.");
  return {
    title: fallbackTitle,
    byline: null,
    siteName: null,
    publishedTime: null,
    markdown,
    extraction: "document",
    warnings,
  };
}

function isJsonType(type: string): boolean {
  return type === "application/json" || type.endsWith("+json");
}

function isXmlType(type: string): boolean {
  return (
    type === "application/xml" ||
    type === "text/xml" ||
    type.endsWith("+xml")
  );
}

function isHtmlType(type: string): boolean {
  return type === "text/html" || type === "application/xhtml+xml";
}

export function extractWebContent(
  body: Uint8Array,
  contentType: string,
  finalUrl: string,
): ExtractedWebContent {
  const type = mediaType(contentType);
  if (
    type === "application/pdf" ||
    new TextDecoder("latin1").decode(body.subarray(0, 8)).startsWith("%PDF-")
  ) {
    throw new Error(
      "The URL returned a PDF. Save it into the workspace and use janet_read_pdf; web fetch never returns document bytes.",
    );
  }

  const decoded = decodeText(body, contentType);
  const warnings = decoded.warning ? [decoded.warning] : [];
  const nullRatio =
    (decoded.text.match(/\0/g)?.length ?? 0) / Math.max(decoded.text.length, 1);
  if (nullRatio > 0.01) {
    throw new Error("The URL returned binary content; web fetch only accepts text.");
  }

  if (isHtmlType(type) || ((!type || type === "application/octet-stream") && beginsLikeHtml(decoded.text))) {
    const result = extractHtml(decoded.text, finalUrl);
    return { ...result, warnings: [...warnings, ...result.warnings] };
  }

  if (type === "text/markdown" || type === "text/x-markdown") {
    return {
      title: null,
      byline: null,
      siteName: null,
      publishedTime: null,
      markdown: normalizeMarkdown(decoded.text),
      extraction: "markdown",
      warnings,
    };
  }

  if (isJsonType(type)) {
    let markdown: string;
    try {
      markdown = JSON.stringify(JSON.parse(decoded.text), null, 2);
    } catch {
      markdown = decoded.text;
      warnings.push("The response declared JSON but could not be parsed.");
    }
    return {
      title: null,
      byline: null,
      siteName: null,
      publishedTime: null,
      markdown: normalizeMarkdown(markdown),
      extraction: "json",
      warnings,
    };
  }

  if (isXmlType(type)) {
    return {
      title: null,
      byline: null,
      siteName: null,
      publishedTime: null,
      markdown: normalizeMarkdown(decoded.text),
      extraction: "xml",
      warnings,
    };
  }

  if (type.startsWith("text/") || (!type && decoded.text.trim())) {
    return {
      title: null,
      byline: null,
      siteName: null,
      publishedTime: null,
      markdown: normalizeMarkdown(decoded.text),
      extraction: "text",
      warnings,
    };
  }

  throw new Error(
    `Unsupported web content type "${type || "unknown"}"; web fetch only accepts HTML, Markdown, JSON, XML, and plain text.`,
  );
}
