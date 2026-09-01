import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../config/database';
import { AIProviderManager } from '../services/ai/provider.manager';
import { runDocumentExtraction } from '../services/extraction/pipeline';
import { authorize } from '../middleware/rbac';
import fs from 'fs';
import path from 'path';

// Backup original environment and fetch
const originalFetch = global.fetch;
const originalEnv = { ...process.env };

describe('AI Gateway & Extraction Pipeline Integration Tests', () => {
  let aiManager: AIProviderManager;

  beforeAll(() => {
    // Seed fake files folder if not exists
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Reset env vars and database mocks
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    process.env.OPENROUTER_API_KEY = 'mock-openrouter-key';
    process.env.GEMINI_MODEL = 'gemini-1.5-pro';
    process.env.OPENROUTER_PRIMARY_MODEL = 'google/gemma-4-26b-a4b-it:free';

    // Clear requests and usage
    prisma.aiRequests = [];
    prisma.aiUsages = [];
    prisma.extractedEntities = [];
    prisma.extractedRelationships = [];
    prisma.entities = [];

    // Reset provider states
    for (const p of prisma.aiProviders) {
      p.enabled = true;
      p.healthStatus = 'HEALTHY';
      p.cooldownUntil = null;
    }

    aiManager = new AIProviderManager();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('handles successful Gemini extraction', async () => {
    const mockJson = {
      entities: [
        { value: 'Rahul Sharma', entityType: 'PERSON', confidence: 0.95, textSnippet: 'Rahul Sharma was here' }
      ],
      relationships: []
    };

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(mockJson) }] } }
          ],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 }
        })
      })
    ) as any;

    const result = await aiManager.extractDocument('Rahul Sharma was here', {
      caseId: 'case-1',
      documentId: 'doc-1'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('gemini');
    expect(result.extraction?.entities[0].value).toBe('Rahul Sharma');
    expect(prisma.aiRequests.length).toBe(1);
    expect(prisma.aiRequests[0].success).toBe(true);
    expect(prisma.aiUsages.length).toBe(1);
    expect(prisma.aiUsages[0].inputTokens).toBe(10);
  });

  it('handles Gemini 429 rate limit and falls back to OpenRouter Gemma', async () => {
    const mockJson = {
      entities: [
        { value: 'Gemma Extraction', entityType: 'PERSON', confidence: 0.90, textSnippet: 'Extracted by Gemma' }
      ],
      relationships: []
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        // Gemini call fails with rate limit
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({})
        });
      } else {
        // OpenRouter call succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            choices: [
              { message: { content: JSON.stringify(mockJson) } }
            ],
            usage: { prompt_tokens: 15, completion_tokens: 25 }
          })
        });
      }
    }) as any;

    const result = await aiManager.extractDocument('Extracted by Gemma', {
      caseId: 'case-1',
      documentId: 'doc-1'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('openrouter_gemma');
    expect(result.extraction?.entities[0].value).toBe('Gemma Extraction');

    // Gemini provider should be marked COOLDOWN
    const gemini = prisma.aiProviders.find((p: any) => p.providerId === 'gemini');
    expect(gemini.healthStatus).toBe('COOLDOWN');
    expect(gemini.cooldownUntil).not.toBeNull();
  });

  it('handles Gemini timeout and falls back to OpenRouter Gemma', async () => {
    const mockJson = {
      entities: [
        { value: 'Timeout Fallback', entityType: 'PERSON', confidence: 0.88, textSnippet: 'After timeout' }
      ],
      relationships: []
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        // Gemini throws AbortError for timeout
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        return Promise.reject(err);
      } else {
        // OpenRouter succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            choices: [
              { message: { content: JSON.stringify(mockJson) } }
            ]
          })
        });
      }
    }) as any;

    const result = await aiManager.extractDocument('After timeout', {
      caseId: 'case-1',
      documentId: 'doc-1'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('openrouter_gemma');
    expect(result.extraction?.entities[0].value).toBe('Timeout Fallback');
  });

  it('skips providers in cooldown', async () => {
    // Set Gemini to COOLDOWN
    const gemini = prisma.aiProviders.find((p: any) => p.providerId === 'gemini');
    gemini.healthStatus = 'COOLDOWN';
    gemini.cooldownUntil = new Date(Date.now() + 30000); // 30s in future

    const mockJson = { entities: [], relationships: [] };
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{ message: { content: JSON.stringify(mockJson) } }]
        })
      })
    ) as any;

    const result = await aiManager.extractDocument('Cooldown check', {
      caseId: 'case-1',
      documentId: 'doc-1'
    });

    // Request should hit OpenRouter Gemma first since Gemini is in cooldown
    expect(result.success).toBe(true);
    expect(result.provider).toBe('openrouter_gemma');
  });

  it('returns AI_EXTRACTION_UNAVAILABLE if all providers fail', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({})
      })
    ) as any;

    const result = await aiManager.extractDocument('Fail test', {
      caseId: 'case-1',
      documentId: 'doc-1'
    });

    expect(result.success).toBe(false);
    expect(result.errorClass).toBe('AI_EXTRACTION_UNAVAILABLE');
  });

  it('throws validation error if schema validation fails', async () => {
    // Return malformed entity JSON
    const malformedJson = {
      entities: [
        { value: '', entityType: 'INVALID_TYPE', confidence: 5 } // violates checks
      ]
    };

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(malformedJson) }] } }
          ]
        })
      })
    ) as any;

    // Seed mock document record
    const docPath = path.resolve(__dirname, '../../uploads/temp-test-file.txt');
    fs.writeFileSync(docPath, 'Sample plain text for parser');
    const doc = await prisma.document.create({
      data: {
        caseId: 'case-uuid-1',
        originalFilename: 'temp-test-file.txt',
        storedFilename: 'temp-test-file.txt',
        filePath: docPath,
        fileType: 'TXT',
        dataCategory: 'FIR_REPORT',
        fileSize: 100,
        sha256Hash: 'fake-hash',
        uploadedById: 'investigator-uuid-2222',
      }
    });

    const success = await runDocumentExtraction(doc.id, 'investigator-uuid-2222');
    expect(success).toBe(false);

    const updatedDoc = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(updatedDoc.validationStatus).toBe('ERROR');
    expect(updatedDoc.processingStatus).toBe('FAILED');

    // Cleanup
    if (fs.existsSync(docPath)) fs.unlinkSync(docPath);
  });

  it('asserts API key absence error classes', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const result = await aiManager.extractDocument('No keys', {
      caseId: 'case-1',
      documentId: 'doc-1'
    });

    expect(result.success).toBe(false);
    expect(result.errorClass).toBe('API_KEY_ABSENCE');
  });

  describe('RBAC around AI provider administration', () => {
    it('allows Admin user to access toggle and list providers', () => {
      const req: any = { user: { userId: 'admin-1111', role: 'ADMIN', email: 'admin@crimegraph.demo' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      const middleware = authorize('users:manage');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks Viewer user from accessing provider toggles', () => {
      const req: any = { user: { userId: 'viewer-4444', role: 'VIEWER', email: 'viewer@crimegraph.demo' } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      const middleware = authorize('users:manage');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
