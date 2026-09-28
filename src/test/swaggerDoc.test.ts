// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("OpenAPI / Swagger Documentation (Issue #212)", () => {
  const yamlPath = path.resolve(__dirname, "../../server/spec/openapi.yaml");
  const jsonPath = path.resolve(__dirname, "../../server/src/docs/openapi.json");
  const routesPath = path.resolve(__dirname, "../../server/src/routes/docsRoutes.ts");

  it("should have an OpenAPI 3.0 specification file", () => {
    const yamlExists = fs.existsSync(yamlPath);
    const jsonExists = fs.existsSync(jsonPath);
    expect(yamlExists || jsonExists).toBe(true);

    const specContent = fs.readFileSync(yamlExists ? yamlPath : jsonPath, "utf-8");
    expect(specContent).toContain("openapi:");
    expect(specContent).toContain("Prompt Mint");
  });

  it("should define docsRoutes exporting Swagger UI route handler", () => {
    expect(fs.existsSync(routesPath)).toBe(true);
    const routesContent = fs.readFileSync(routesPath, "utf-8");
    expect(routesContent).toContain("docsRouter");
    expect(routesContent).toContain("SwaggerUIBundle");
    expect(routesContent).toContain("/api/docs/openapi.json");
  });

  it("should mount /api/docs router in server.ts", () => {
    const serverPath = path.resolve(__dirname, "../../server/src/server.ts");
    const serverContent = fs.readFileSync(serverPath, "utf-8");
    expect(serverContent).toContain("docsRouter");
    expect(serverContent).toContain("/api/docs");
  });
});
