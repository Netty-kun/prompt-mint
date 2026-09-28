import express from "express";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export const docsRouter = express.Router();

const yamlPath = path.join(__dirname, "../../spec/openapi.yaml");
const jsonPath = path.join(__dirname, "../docs/openapi.json");

// Serve raw OpenAPI JSON specification
docsRouter.get("/openapi.json", (req, res) => {
  try {
    if (fs.existsSync(yamlPath)) {
      const rawYaml = fs.readFileSync(yamlPath, "utf-8");
      const parsed = yaml.load(rawYaml);
      res.setHeader("Content-Type", "application/json");
      res.json(parsed);
      return;
    } else if (fs.existsSync(jsonPath)) {
      res.setHeader("Content-Type", "application/json");
      res.sendFile(jsonPath);
      return;
    }
  } catch {
    if (fs.existsSync(jsonPath)) {
      res.setHeader("Content-Type", "application/json");
      res.sendFile(jsonPath);
      return;
    }
  }
  res.status(404).json({ error: "OpenAPI specification not found" });
});

// Serve OpenAPI YAML specification
docsRouter.get("/openapi.yaml", (req, res) => {
  if (fs.existsSync(yamlPath)) {
    res.setHeader("Content-Type", "text/yaml");
    res.sendFile(yamlPath);
  } else {
    res.status(404).json({ error: "OpenAPI specification not found" });
  }
});

// Serve interactive Swagger UI at /api/docs
docsRouter.get("/", (req, res) => {
  const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PromptMint API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  res.send(swaggerHtml);
});
