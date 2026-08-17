import { sanitizeJsonStrings, sanitizeRichHtml } from "./sanitize-html";

describe("sanitizeRichHtml", () => {
  it("strips script tags and event handlers", () => {
    const dirty = `<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="steal()">link</a>`;
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<p>Hello</p>");
  });

  it("walks CMS fields JSON", () => {
    const result = sanitizeJsonStrings({
      bodyHtml: `<p>ok</p><script>x</script>`,
      items: [{ question: "Q", answer: "<img onerror=alert(1) src=x>" }],
    }) as { bodyHtml: string; items: Array<{ answer: string }> };
    expect(result.bodyHtml).toBe("<p>ok</p>");
    expect(result.items[0]?.answer).not.toContain("onerror");
  });
});
