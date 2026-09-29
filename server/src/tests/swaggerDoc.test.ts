import request from 'supertest';
import express from 'express';
import { docsRouter } from '../routes/docsRoutes';

const app = express();
app.use('/api/docs', docsRouter);

describe('OpenAPI / Swagger Documentation API (Issue #212)', () => {
  it('should serve the OpenAPI 3.0 specification at /api/docs/openapi.json', async () => {
    const res = await request(app).get('/api/docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('PromptMint API Specification');
    expect(res.body.paths).toHaveProperty('/health');
    expect(res.body.paths).toHaveProperty('/api/prompts/unlock');
  });

  it('should serve the interactive Swagger UI at /api/docs', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('PromptMint API Documentation');
    expect(res.text).toContain('SwaggerUIBundle');
    expect(res.text).toContain('/api/docs/openapi.json');
  });
});
