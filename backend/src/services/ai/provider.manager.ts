import prisma from '../../config/database';
import { GeminiProvider } from './gemini.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { AIProvider, AIProviderConfig, NormalizedExtractionResult } from './provider.interface';
import logger from '../../utils/logger';

export class AIProviderManager {
  private providers: Record<string, AIProvider> = {};

  constructor() {
    this.providers['gemini'] = new GeminiProvider();
    const openRouter = new OpenRouterProvider();
    this.providers['openrouter_gemma'] = openRouter;
    this.providers['openrouter_glm'] = openRouter;
  }

  /**
   * Get active providers from the database, handling cooldown status updates
   */
  private async getActiveProviders(): Promise<AIProviderConfig[]> {
    try {
      const dbProviders = await prisma.aIProvider.findMany({
        orderBy: { priority: 'asc' },
      });

      const now = new Date();
      const activeConfigs: AIProviderConfig[] = [];

      for (const p of dbProviders) {
        let currentStatus = p.healthStatus;
        let cooldownUntil = p.cooldownUntil;

        // Reset cooldown status if timing has elapsed
        if (currentStatus === 'COOLDOWN' && cooldownUntil && new Date(cooldownUntil) <= now) {
          currentStatus = 'HEALTHY';
          cooldownUntil = null;

          await prisma.aIProvider.update({
            where: { id: p.id },
            data: { healthStatus: 'HEALTHY', cooldownUntil: null },
          });
        }

        if (p.enabled && currentStatus !== 'DISABLED') {
          activeConfigs.push({
            providerId: p.providerId,
            providerName: p.providerName,
            enabled: p.enabled,
            priority: p.priority,
            model: p.model,
            timeout: p.timeout,
            maxRetries: p.maxRetries,
            cooldown: p.cooldown,
            healthStatus: currentStatus as any,
            cooldownUntil,
            lastSuccess: p.lastSuccess,
            lastFailure: p.lastFailure,
          });
        }
      }

      // Sort by priority ascending, keeping healthy ones first
      return activeConfigs.sort((a, b) => {
        if (a.healthStatus === 'COOLDOWN' && b.healthStatus === 'HEALTHY') return 1;
        if (a.healthStatus === 'HEALTHY' && b.healthStatus === 'COOLDOWN') return -1;
        return a.priority - b.priority;
      });
    } catch (err) {
      logger.error('Failed to query providers from database, using env defaults', err);
      // Hardcoded fallback configs if database is offline or not seeded
      return [
        {
          providerId: 'gemini',
          providerName: 'Google Gemini',
          enabled: true,
          priority: 1,
          model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
          timeout: 30000,
          maxRetries: 2,
          cooldown: 60,
          healthStatus: 'HEALTHY',
          cooldownUntil: null,
          lastSuccess: null,
          lastFailure: null,
        },
        {
          providerId: 'openrouter_gemma',
          providerName: 'OpenRouter Gemma',
          enabled: true,
          priority: 2,
          model: process.env.OPENROUTER_PRIMARY_MODEL || 'google/gemma-4-26b-a4b-it:free',
          timeout: 30000,
          maxRetries: 2,
          cooldown: 60,
          healthStatus: 'HEALTHY',
          cooldownUntil: null,
          lastSuccess: null,
          lastFailure: null,
        },
        {
          providerId: 'openrouter_glm',
          providerName: 'OpenRouter GLM',
          enabled: true,
          priority: 3,
          model: process.env.OPENROUTER_FALLBACK_MODEL || 'z-ai/glm-5.2:free',
          timeout: 30000,
          maxRetries: 2,
          cooldown: 60,
          healthStatus: 'HEALTHY',
          cooldownUntil: null,
          lastSuccess: null,
          lastFailure: null,
        },
      ];
    }
  }

  /**
   * Determine if error triggers fallback circuit breaking
   */
  private isFallbackTriggering(errorClass?: string): boolean {
    if (!errorClass) return true;
    const fatalNonFallbacks = ['API_KEY_ABSENCE', 'INVALID_REQUEST', 'MALFORMED_JSON', 'MALFORMED_OUTPUT'];
    return !fatalNonFallbacks.includes(errorClass);
  }

  /**
   * Main abstraction method to extract structured data from text via provider routing
   */
  public async extractDocument(
    documentText: string,
    metadata: { caseId: string; documentId: string }
  ): Promise<NormalizedExtractionResult> {
    const activeConfigs = await this.getActiveProviders();
    const healthyConfigs = activeConfigs.filter(p => p.healthStatus === 'HEALTHY');

    if (healthyConfigs.length === 0) {
      logger.error('All AI providers are currently disabled or in cooldown.');
      return {
        success: false,
        provider: 'none',
        model: 'none',
        requestId: 'none',
        extraction: null,
        usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
        confidence: 0,
        error: 'AI extraction services are temporarily unavailable.',
        errorClass: 'AI_EXTRACTION_UNAVAILABLE',
      };
    }

    let finalResult: NormalizedExtractionResult | null = null;
    let fallbackUsed = false;
    const initialProviderId = healthyConfigs[0].providerId;

    for (let i = 0; i < healthyConfigs.length; i++) {
      const pConfig = healthyConfigs[i];
      const providerImpl = this.providers[pConfig.providerId];

      if (!providerImpl) {
        logger.warn(`Provider implementation not found for ID: ${pConfig.providerId}`);
        continue;
      }

      if (pConfig.providerId !== initialProviderId) {
        fallbackUsed = true;
      }

      logger.info(`Routing request to AI Provider: ${pConfig.providerName} (${pConfig.model})`);

      const startTime = new Date();
      let attempt = 0;
      let result: NormalizedExtractionResult | null = null;

      // Handle Retries
      while (attempt <= pConfig.maxRetries) {
        result = await providerImpl.extractDocument(documentText, metadata, pConfig);
        if (result.success) break;
        if (!this.isFallbackTriggering(result.errorClass)) break; // stop retries for fatal schemas/auth issues
        attempt++;
      }

      const duration = Date.now() - startTime.getTime();

      // Log AI Request
      try {
        await prisma.aIRequest.create({
          data: {
            requestId: result?.requestId || `req-fail-${Date.now()}`,
            providerId: pConfig.providerId,
            model: pConfig.model,
            startTime,
            duration,
            success: result?.success || false,
            errorClass: result?.errorClass || null,
            fallbackUsed,
            finalProvider: result?.success ? pConfig.providerId : null,
          },
        });
      } catch (logErr) {
        logger.error('Failed to log AI Request telemetry', logErr);
      }

      if (result && result.success) {
        // Update database provider health success metrics
        try {
          const dbP = await prisma.aIProvider.findUnique({ where: { providerId: pConfig.providerId } });
          if (dbP) {
            await prisma.aIProvider.update({
              where: { id: dbP.id },
              data: {
                healthStatus: 'HEALTHY',
                cooldownUntil: null,
                lastSuccess: new Date(),
              },
            });
          }
        } catch (dbErr) {
          // ignore
        }

        // Track usage tokens log
        if (result.usage && (result.usage.inputTokens || result.usage.outputTokens)) {
          try {
            await prisma.aIUsage.create({
              data: {
                requestId: result.requestId,
                providerId: pConfig.providerId,
                model: pConfig.model,
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens,
                estimatedCost: null,
              },
            });
          } catch (usageErr) {
            // ignore
          }
        }

        finalResult = result;
        break;
      } else {
        logger.error(`AI Provider ${pConfig.providerName} failed: ${result?.error}`);

        // Update database provider state to COOLDOWN
        if (result && this.isFallbackTriggering(result.errorClass)) {
          try {
            const dbP = await prisma.aIProvider.findUnique({ where: { providerId: pConfig.providerId } });
            if (dbP) {
              const cooldownUntil = new Date(Date.now() + pConfig.cooldown * 1000);
              await prisma.aIProvider.update({
                where: { id: dbP.id },
                data: {
                  healthStatus: 'COOLDOWN',
                  cooldownUntil,
                  lastFailure: new Date(),
                },
              });
              logger.warn(`Provider ${pConfig.providerName} set to COOLDOWN state until ${cooldownUntil.toLocaleTimeString()}`);
            }
          } catch (dbErr) {
            // ignore
          }
        }

        finalResult = result; // preserve error details
      }
    }

    if (finalResult && finalResult.success) {
      return finalResult;
    }

    return {
      success: false,
      provider: finalResult?.provider || 'none',
      model: finalResult?.model || 'none',
      requestId: finalResult?.requestId || 'none',
      extraction: null,
      usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
      confidence: 0,
      error: finalResult?.error || 'All configured providers failed extraction.',
      errorClass: finalResult?.errorClass === 'API_KEY_ABSENCE' ? 'API_KEY_ABSENCE' : 'AI_EXTRACTION_UNAVAILABLE',
    };
  }

  /**
   * Execute chat completion across active providers with priority routing and circuit breaking
   */
  public async generateChatCompletion(
    systemPrompt: string,
    userMessage: string
  ): Promise<{
    success: boolean;
    answer: string | null;
    provider: string;
    model: string;
    confidence: number;
    error?: string;
  }> {
    const activeConfigs = await this.getActiveProviders();
    const healthyConfigs = activeConfigs.filter(p => p.healthStatus === 'HEALTHY');

    if (healthyConfigs.length === 0) {
      return {
        success: false,
        answer: null,
        provider: 'none',
        model: 'none',
        confidence: 0,
        error: 'AI chat service is temporarily unavailable because all providers are disabled or in cooldown.',
      };
    }

    for (const pConfig of healthyConfigs) {
      const providerImpl = this.providers[pConfig.providerId];
      if (!providerImpl || !providerImpl.generateChatCompletion) continue;

      logger.info(`Routing AI chat query to Provider: ${pConfig.providerName} (${pConfig.model})`);

      const result = await providerImpl.generateChatCompletion(systemPrompt, userMessage, pConfig);
      if (result && result.success && result.answer) {
        return {
          success: true,
          answer: result.answer,
          provider: pConfig.providerId,
          model: pConfig.model,
          confidence: result.confidence || 0.90,
        };
      }

      logger.warn(`Provider ${pConfig.providerName} failed chat completion: ${result?.error}`);
    }

    return {
      success: false,
      answer: null,
      provider: 'none',
      model: 'none',
      confidence: 0,
      error: 'AI conversational services are temporarily unavailable as no configured provider was reachable.',
    };
  }
}
