import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress, LookupOptions } from "node:dns";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_HOSTNAMES = new Set([
  "instance-data",
  "metadata",
  "metadata.google.internal",
  "metadata.google.internal.",
]);
const BLOCKED_HOSTNAME_SUFFIXES = [
  ".home.arpa",
  ".internal",
  ".invalid",
  ".lan",
  ".local",
  ".localhost",
  ".localdomain",
  ".test",
] as const;

export const WEB_NETWORK_DEFAULTS = {
  maxResponseBytes: 5 * 1024 * 1024,
  maxRedirects: 5,
  timeoutMs: 20_000,
} as const;

export interface WebNetworkResponse {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: Uint8Array;
  redirectCount: number;
}

export type WebDnsLookup = (
  hostname: string,
  options: LookupOptions & { all: true },
) => Promise<LookupAddress[]>;

export interface WebNetworkOptions {
  maxResponseBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  dnsLookup?: WebDnsLookup;
}

function positiveLimit(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return resolved;
}

function nonNegativeLimit(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return resolved;
}

function hostnameWithoutBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

/**
 * Enforce the open-web boundary before DNS and again on the address that is
 * pinned into the HTTP connection. Only globally routable unicast addresses
 * are allowed.
 */
export function assertPublicIpAddress(address: string): void {
  let parsed: ReturnType<typeof ipaddr.parse>;
  try {
    parsed = ipaddr.parse(hostnameWithoutBrackets(address));
  } catch {
    throw new Error(`Web fetch resolved an invalid IP address: ${address}`);
  }

  if (parsed.range() !== "unicast") {
    throw new Error(
      `Web fetch blocked non-public network address ${address} (${parsed.range()}).`,
    );
  }
}

export function parsePublicWebUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A valid absolute HTTP or HTTPS URL is required.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Web fetch only supports HTTP and HTTPS URLs.");
  }
  if (url.username || url.password) {
    throw new Error("Web fetch URLs must not contain credentials.");
  }
  if (!url.hostname) {
    throw new Error("Web fetch URL must include a hostname.");
  }

  const hostname = url.hostname.toLowerCase();
  const bareHostname = hostnameWithoutBrackets(hostname).replace(/\.$/, "");
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    BLOCKED_HOSTNAMES.has(bareHostname) ||
    BLOCKED_HOSTNAME_SUFFIXES.some(
      (suffix) => bareHostname === suffix.slice(1) || bareHostname.endsWith(suffix),
    )
  ) {
    throw new Error(`Web fetch blocked local or metadata hostname: ${url.hostname}`);
  }

  if (ipaddr.isValid(bareHostname)) {
    assertPublicIpAddress(bareHostname);
  }
  return url;
}

export async function resolvePublicAddresses(
  hostname: string,
  resolver: WebDnsLookup = dnsLookup,
): Promise<LookupAddress[]> {
  const bareHostname = hostnameWithoutBrackets(hostname);
  if (ipaddr.isValid(bareHostname)) {
    assertPublicIpAddress(bareHostname);
    const parsed = ipaddr.parse(bareHostname);
    return [{ address: bareHostname, family: parsed.kind() === "ipv4" ? 4 : 6 }];
  }

  let addresses: LookupAddress[];
  try {
    addresses = await resolver(bareHostname, { all: true, verbatim: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown DNS error";
    throw new Error(`Web fetch could not resolve ${hostname}: ${detail}`);
  }
  if (addresses.length === 0) {
    throw new Error(`Web fetch could not resolve ${hostname}.`);
  }

  for (const address of addresses) assertPublicIpAddress(address.address);
  return addresses;
}

function combineAbortSignals(signal: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function pinnedLookup(address: LookupAddress) {
  return (
    _hostname: string,
    options: LookupOptions,
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | LookupAddress[],
      family?: number,
    ) => void,
  ) => {
    if (options.all) {
      callback(null, [address]);
      return;
    }
    callback(null, address.address, address.family);
  };
}

async function readBoundedBody(
  response: Awaited<ReturnType<typeof undiciFetch>>,
  maxResponseBytes: number,
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredLength = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      await response.body?.cancel();
      throw new Error(
        `Web response declares ${declaredLength} bytes; the configured limit is ${maxResponseBytes} bytes.`,
      );
    }
  }

  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      total += bytes.byteLength;
      if (total > maxResponseBytes) {
        await reader.cancel();
        throw new Error(
          `Web response exceeded the configured ${maxResponseBytes} byte limit.`,
        );
      }
      chunks.push(bytes);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * Fetch a public URL with manual redirect validation and a DNS-pinned
 * dispatcher. The pin closes the validation-to-connect gap that otherwise
 * permits DNS rebinding after a preflight check.
 */
export async function fetchPublicWebUrl(
  requestedUrl: string,
  options: WebNetworkOptions = {},
): Promise<WebNetworkResponse> {
  const maxResponseBytes = positiveLimit(
    options.maxResponseBytes,
    WEB_NETWORK_DEFAULTS.maxResponseBytes,
    "maxResponseBytes",
  );
  const maxRedirects = nonNegativeLimit(
    options.maxRedirects,
    WEB_NETWORK_DEFAULTS.maxRedirects,
    "maxRedirects",
  );
  const timeoutMs = positiveLimit(
    options.timeoutMs,
    WEB_NETWORK_DEFAULTS.timeoutMs,
    "timeoutMs",
  );
  const signal = combineAbortSignals(options.signal, timeoutMs);
  const original = parsePublicWebUrl(requestedUrl);
  let current = original;
  let redirectCount = 0;

  while (true) {
    if (signal.aborted) throw signal.reason;
    const addresses = await resolvePublicAddresses(
      current.hostname,
      options.dnsLookup,
    );
    const pinnedAddress = addresses[0];
    if (!pinnedAddress) {
      throw new Error(`Web fetch could not resolve ${current.hostname}.`);
    }

    const dispatcher = new Agent({
      connect: {
        lookup: pinnedLookup(pinnedAddress),
      },
    });
    try {
      const response = await undiciFetch(current, {
        dispatcher,
        method: "GET",
        redirect: "manual",
        signal,
        headers: {
          accept:
            "text/html, application/xhtml+xml, text/markdown, text/plain, application/json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.1",
          "accept-encoding": "gzip, br, deflate",
          "user-agent": "JanetWebFetch/1.0 (+https://github.com/stjbrown/agent-knowledge)",
        },
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        await response.body?.cancel();
        if (redirectCount >= maxRedirects) {
          throw new Error(`Web fetch exceeded the ${maxRedirects} redirect limit.`);
        }
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Web fetch received HTTP ${response.status} without Location.`);
        }
        current = parsePublicWebUrl(new URL(location, current).href);
        redirectCount += 1;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        await response.body?.cancel();
        throw new Error(`Web fetch failed with HTTP ${response.status} ${response.statusText}.`);
      }

      const body = await readBoundedBody(response, maxResponseBytes);
      return {
        requestedUrl: original.href,
        finalUrl: current.href,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        body,
        redirectCount,
      };
    } catch (error) {
      if (signal.aborted) {
        const reason =
          signal.reason instanceof Error ? signal.reason.message : "request aborted";
        throw new Error(`Web fetch was aborted or timed out: ${reason}`);
      }
      throw error;
    } finally {
      await dispatcher.destroy();
    }
  }
}
