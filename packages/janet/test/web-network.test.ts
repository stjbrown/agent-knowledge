import { describe, expect, it } from "vitest";
import {
  assertPublicIpAddress,
  parsePublicWebUrl,
  resolvePublicAddresses,
} from "../src/tools/web/network.js";

describe("safe web network boundary", () => {
  it("accepts only absolute credential-free HTTP(S) URLs", () => {
    expect(parsePublicWebUrl("https://example.com/docs").href).toBe(
      "https://example.com/docs",
    );
    expect(parsePublicWebUrl("http://8.8.8.8/").href).toBe("http://8.8.8.8/");

    expect(() => parsePublicWebUrl("file:///etc/passwd")).toThrow(
      "only supports HTTP and HTTPS",
    );
    expect(() => parsePublicWebUrl("https://user:secret@example.com/")).toThrow(
      "must not contain credentials",
    );
    expect(() => parsePublicWebUrl("/relative")).toThrow("valid absolute");
  });

  it("blocks local, metadata, and private literal targets", () => {
    for (const value of [
      "http://localhost/",
      "http://service.internal/",
      "http://metadata.google.internal/",
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/",
      "http://[::1]/",
      "http://[fc00::1]/",
      "http://[::ffff:127.0.0.1]/",
    ]) {
      expect(() => parsePublicWebUrl(value), value).toThrow(/blocked|non-public/);
    }
  });

  it("permits globally routable unicast addresses and rejects special ranges", () => {
    expect(() => assertPublicIpAddress("8.8.8.8")).not.toThrow();
    expect(() =>
      assertPublicIpAddress("2606:4700:4700::1111"),
    ).not.toThrow();

    for (const address of [
      "0.0.0.0",
      "100.64.0.1",
      "192.168.1.1",
      "198.51.100.1",
      "224.0.0.1",
      "fe80::1",
      "2001:db8::1",
      "64:ff9b::7f00:1",
    ]) {
      expect(() => assertPublicIpAddress(address), address).toThrow("non-public");
    }
  });

  it("rejects a hostname when any returned address is not public", async () => {
    const mixedResolver = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ];
    await expect(
      resolvePublicAddresses("example.com", mixedResolver),
    ).rejects.toThrow("non-public");
  });

  it("returns all validated public DNS candidates for connection pinning", async () => {
    const resolver = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ];
    await expect(resolvePublicAddresses("example.com", resolver)).resolves.toEqual(
      await resolver(),
    );
  });
});
