import { unstable_dev } from 'wrangler';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

describe('Worker', () => {
  let worker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.js', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return 404 for non-existent path', async () => {
    const resp = await worker.fetch('/non-existent');
    expect(resp.status).toBe(404);
  });

  it('should return welcome page for root path', async () => {
    const resp = await worker.fetch('/');
    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toContain('Welcome to GoGoKodo');
  });

  it('should render content with template when available', async () => {
    // First, we need to set up test data in KV
    const testTemplate = {
      structure: '<div class="test-template">{{content}}</div>'
    };
    const testContent = {
      templateId: 1,
      title: 'Test Page',
      content: 'Test content'
    };

    // Set the test data in KV namespaces
    await worker.env.TEMPLATES.put('1', JSON.stringify(testTemplate));
    await worker.env.CONTENT.put('test', JSON.stringify(testContent));

    // Test the endpoint
    const resp = await worker.fetch('/test');
    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toContain('Test Page');
    expect(text).toContain('Test content');
    expect(text).toContain('test-template');
  });
});
