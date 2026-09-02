import { AIProvider, AIProviderConfig, NormalizedExtractionResult } from './provider.interface';
import { ENTITY_EXTRACTION_SYSTEM_PROMPT } from './prompts/entity-extraction-v1';

export class OpenRouterProvider implements AIProvider {
  public providerId = 'openrouter';

  public async extractDocument(
    documentText: string,
    metadata: { caseId: string; documentId: string },
    config: AIProviderConfig
  ): Promise<NormalizedExtractionResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName = config.model || process.env.OPENROUTER_PRIMARY_MODEL || 'google/gemma-4-26b-a4b-it:free';
    const requestId = `req-openrouter-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (!apiKey) {
      return {
        success: false,
        provider: config.providerId,
        model: modelName,
        requestId,
        extraction: null,
        usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
        confidence: 0,
        error: 'API key is missing for OpenRouter Provider.',
        errorClass: 'API_KEY_ABSENCE',
      };
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: ENTITY_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Document Text to Extract:\n${documentText}`,
        },
      ],
      response_format: {
        type: 'json_object',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'CrimeGraph AI',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          extraction: null,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          confidence: 0,
          error: 'OpenRouter Rate limit exceeded.',
          errorClass: 'HTTP_429',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          extraction: null,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          confidence: 0,
          error: `OpenRouter API returned error code ${response.status}: ${response.statusText}`,
          errorClass: response.status >= 500 ? 'HTTP_5XX' : 'API_ERROR',
        };
      }

      const resData: any = await response.json();
      const choiceText = resData.choices?.[0]?.message?.content;

      if (!choiceText) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          extraction: null,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          confidence: 0,
          error: 'Malformed response structure from OpenRouter API.',
          errorClass: 'MALFORMED_OUTPUT',
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(choiceText.trim());
      } catch (err) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          extraction: null,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          confidence: 0,
          error: `Failed to parse AI output as JSON: ${(err as Error).message}`,
          errorClass: 'MALFORMED_JSON',
        };
      }

      const inputTokens = resData.usage?.prompt_tokens || null;
      const outputTokens = resData.usage?.completion_tokens || null;

      return {
        success: true,
        provider: config.providerId,
        model: modelName,
        requestId,
        extraction: parsed,
        usage: {
          inputTokens,
          outputTokens,
          estimatedCost: null,
        },
        confidence: 0.85,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = (err as any).name === 'AbortError';
      return {
        success: false,
        provider: config.providerId,
        model: modelName,
        requestId,
        extraction: null,
        usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
        confidence: 0,
        error: isTimeout ? 'Request timed out.' : (err as Error).message,
        errorClass: isTimeout ? 'TIMEOUT' : 'NETWORK_FAILURE',
      };
    }
  }

  public async generateChatCompletion(
    systemPrompt: string,
    userMessage: string,
    config: AIProviderConfig
  ): Promise<any> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const modelName = config.model || process.env.OPENROUTER_PRIMARY_MODEL || 'google/gemma-4-26b-a4b-it:free';
    const requestId = `req-chat-openrouter-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (!apiKey) {
      return {
        success: false,
        provider: config.providerId,
        model: modelName,
        requestId,
        answer: null,
        confidence: 0,
        usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
        error: 'API key is missing for OpenRouter Provider.',
        errorClass: 'API_KEY_ABSENCE',
      };
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'CrimeGraph AI',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          answer: null,
          confidence: 0,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          error: 'OpenRouter Rate limit exceeded.',
          errorClass: 'HTTP_429',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          answer: null,
          confidence: 0,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          error: `OpenRouter API error code ${response.status}: ${response.statusText}`,
          errorClass: response.status >= 500 ? 'HTTP_5XX' : 'API_ERROR',
        };
      }

      const resData: any = await response.json();
      const choiceText = resData.choices?.[0]?.message?.content;

      if (!choiceText) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          answer: null,
          confidence: 0,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          error: 'Malformed response structure from OpenRouter API.',
          errorClass: 'MALFORMED_OUTPUT',
        };
      }

      const inputTokens = resData.usage?.prompt_tokens || null;
      const outputTokens = resData.usage?.completion_tokens || null;

      return {
        success: true,
        provider: config.providerId,
        model: modelName,
        requestId,
        answer: choiceText.trim(),
        confidence: 0.90,
        usage: { inputTokens, outputTokens, estimatedCost: null },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = (err as any).name === 'AbortError';
      return {
        success: false,
        provider: config.providerId,
        model: modelName,
        requestId,
        answer: null,
        confidence: 0,
        usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
        error: isTimeout ? 'Request timed out.' : (err as Error).message,
        errorClass: isTimeout ? 'TIMEOUT' : 'NETWORK_FAILURE',
      };
    }
  }
}
