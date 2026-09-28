/**
 * Tests for SSRF-safe webhook URL validation (issue #23).
 */
import { validateWebhookUrl } from "./validateWebhookUrl";

describe("validateWebhookUrl", () => {
  it("rejects a malformed URL", async () => {
    const result = await validateWebhookUrl("not-a-url");
    expect(result.valid).toBe(false);
  });

  it("rejects non-http(s) protocols", async () => {
    const result = await validateWebhookUrl("ftp://example.com/hook");
    expect(result.valid).toBe(false);
  });

  it("rejects a loopback IP literal", async () => {
    const result = await validateWebhookUrl("http://127.0.0.1/hook");
    expect(result.valid).toBe(false);
  });

  it("rejects localhost by hostname", async () => {
    const result = await validateWebhookUrl("http://localhost:3000/hook");
    expect(result.valid).toBe(false);
  });

  it("rejects private 10.x.x.x range", async () => {
    const result = await validateWebhookUrl("http://10.0.0.5/hook");
    expect(result.valid).toBe(false);
  });

  it("rejects private 192.168.x.x range", async () => {
    const result = await validateWebhookUrl("http://192.168.1.1/hook");
    expect(result.valid).toBe(false);
  });

  it("rejects the cloud metadata link-local address", async () => {
    const result = await validateWebhookUrl("http://169.254.169.254/latest/meta-data/");
    expect(result.valid).toBe(false);
  });

  it("rejects IPv6 loopback", async () => {
    const result = await validateWebhookUrl("http://[::1]/hook");
    expect(result.valid).toBe(false);
  });

  it("accepts a public IP literal", async () => {
    const result = await validateWebhookUrl("http://93.184.216.34/hook");
    expect(result.valid).toBe(true);
  });
});
