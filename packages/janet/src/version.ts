import { readFileSync } from "node:fs";

const packageJsonUrl = new URL("../package.json", import.meta.url);

export function packageVersion(): string {
  const metadata: unknown = JSON.parse(readFileSync(packageJsonUrl, "utf8"));

  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("version" in metadata) ||
    typeof metadata.version !== "string"
  ) {
    throw new Error("Janet's package metadata does not contain a version");
  }

  return metadata.version;
}
