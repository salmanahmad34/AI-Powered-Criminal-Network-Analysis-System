import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import prisma from '../config/database';
import { AIProviderManager } from '../services/ai/provider.manager';
import logger from '../utils/logger';

const router = Router();
router.use(authenticate);

const aiManager = new AIProviderManager();

/**
 * GET /api/ai/providers
 * Returns health status, enabled state, retry counts and priority rankings.
 */
router.get('/providers', authorize('audit:view'), async (req: Request, res: Response) => {
  try {
    const providers = await prisma.aIProvider.findMany({
      orderBy: { priority: 'asc' },
    });

    res.json({ providers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve AI provider configurations.' });
  }
});

/**
 * POST /api/ai/providers/:providerId/toggle
 * Toggle enabled state of a provider.
 */
router.post('/providers/:providerId/toggle', authorize('users:manage'), async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined || typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Missing field: enabled (boolean).' });
      return;
    }

    const provider = await prisma.aIProvider.findUnique({
      where: { providerId },
    });

    if (!provider) {
      res.status(404).json({ error: `AI provider ${providerId} not found.` });
      return;
    }

    const updated = await prisma.aIProvider.update({
      where: { id: provider.id },
      data: { enabled },
    });

    logger.info(`AI Provider ${providerId} toggled to enabled=${enabled} by admin.`);

    res.json({ provider: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle AI provider state.' });
  }
});

/**
 * POST /api/ai/query
 * Execute manual testing extraction run.
 */
router.post('/query', authorize('ai:query'), async (req: Request, res: Response) => {
  try {
    const { text, caseId } = req.body;

    if (!text || !caseId) {
      res.status(400).json({ error: 'Fields: text, caseId are required.' });
      return;
    }

    const result = await aiManager.extractDocument(text, {
      caseId,
      documentId: 'manual-test-id',
    });

    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: 'Direct manual query test failed.' });
  }
});

import { caseContextBuilderService } from '../services/ai/context-builder.service';

/**
 * POST /api/ai/chat
 * Execute case-grounded investigation query against real case evidence.
 */
router.post('/chat', authorize('ai:query'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, caseId } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: "Field 'message' is required." });
      return;
    }

    if (!caseId || typeof caseId !== 'string' || !caseId.trim()) {
      res.status(400).json({ error: "Field 'caseId' is required." });
      return;
    }

    // 1. Build Bounded Case Context with RBAC scoping check
    const contextResult = await caseContextBuilderService.buildCaseContext(
      caseId,
      req.user!.userId,
      req.user!.role
    );

    if (!contextResult.found) {
      res.status(404).json({ error: `Case ${caseId} not found.` });
      return;
    }

    if (!contextResult.authorized) {
      res.status(403).json({ error: 'Access denied: You are not authorized to query this case.' });
      return;
    }

    // 2. Anti-Hallucination System Prompt
    const systemPrompt = `
You are CrimeGraph AI's specialized Criminal Intelligence & Case Analysis Assistant.
Your task is to analyze evidence and answer the officer's question strictly grounded in the provided case investigation context.

RULES & CONSTRAINTS:
1. Grounding: Use ONLY the supplied CASE CONTEXT data below as factual evidence.
2. Anti-Hallucination: Do NOT invent people, phone numbers, email addresses, bank accounts, locations, transactions, relationships, dates, or FIR details.
3. Insufficient Evidence: If the provided case evidence does not contain enough information to answer the question, explicitly state: "Insufficient evidence in the available case data." Do NOT speculate or make up facts.
4. Analytical Distinction: Clearly distinguish observed evidence from analytical inferences. Label any reasoning as "Analytical inference: <explanation>".
5. Legal Neutrality: Never state that a subject or entity is guilty or a criminal. Use neutral intelligence terminology such as "subject of interest", "observed entity", "priority lead", "risk indicator", "observed relationship", and "confidence score".
6. Traceability: Where appropriate, reference the source document names, entity names, or relationship types from the provided context.

${contextResult.contextPrompt}
`;

    // 3. Execute AI provider selection & fallback chat completion
    const aiResult = await aiManager.generateChatCompletion(systemPrompt, message.trim());

    if (!aiResult.success || !aiResult.answer) {
      // Clean fallback if AI provider is missing API key or unavailable
      const docCount = contextResult.sources.filter(s => s.type === 'document').length;
      const entityCount = contextResult.entitiesReferenced.length;
      
      const fallbackAnswer = `AI chat service is currently unavailable as no conversational AI provider API keys are configured or reachable (${aiResult.error || 'Provider Cooldown'}).\n\nObserved Case Evidence Summary:\n- Case Envelope: ${contextResult.caseData?.caseNumber} (${contextResult.caseData?.title})\n- Evidence Documents: ${docCount}\n- Extracted Entities: ${entityCount}\n\nConfigure GEMINI_API_KEY or OPENROUTER_API_KEY in the backend environment to enable full conversational LLM answers.`;

      res.json({
        answer: fallbackAnswer,
        caseId,
        confidence: 0,
        sources: contextResult.sources,
        entitiesReferenced: contextResult.entitiesReferenced,
        relationshipsReferenced: contextResult.relationshipsReferenced,
        provider: 'none',
        grounded: true,
        aiAvailable: false,
      });
      return;
    }

    res.json({
      answer: aiResult.answer,
      caseId,
      confidence: aiResult.confidence || 0.90,
      sources: contextResult.sources,
      entitiesReferenced: contextResult.entitiesReferenced,
      relationshipsReferenced: contextResult.relationshipsReferenced,
      provider: aiResult.provider,
      model: aiResult.model,
      grounded: true,
      aiAvailable: true,
    });
  } catch (err) {
    logger.error('Error handling AI chat query', err);
    res.status(500).json({ error: 'Failed to process investigation AI chat query.' });
  }
});

export default router;
