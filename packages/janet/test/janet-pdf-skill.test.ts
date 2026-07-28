import { describe, expect, it } from "vitest";
import { janetPdfSkill } from "../src/skills/janet-pdf.js";

describe("embedded Janet PDF skill", () => {
  it("is an internal inline skill with the bounded PDF procedure", () => {
    expect(janetPdfSkill.__inline).toBe(true);
    expect(janetPdfSkill.name).toBe("janet-pdf");
    expect(janetPdfSkill["user-invocable"]).toBe(false);
    expect(janetPdfSkill.instructions).toContain("janet_read_pdf");
    expect(janetPdfSkill.instructions).toContain("janet_read_pdf_chunk");
    expect(janetPdfSkill.instructions).toContain(
      "raw PDF bytes never belong in tool results",
    );
  });
});
