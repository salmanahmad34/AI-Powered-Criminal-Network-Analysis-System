import { AIProvider, AIProviderConfig, NormalizedExtractionResult } from './provider.interface';
import { ENTITY_EXTRACTION_SYSTEM_PROMPT } from './prompts/entity-extraction-v1';

export class GeminiProvider implements AIProvider {
  public providerId = 'gemini';

  public async extractDocument(
    documentText: string,
    metadata: { caseId: string; documentId: string },
    config: AIProviderConfig
  ): Promise<NormalizedExtractionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    const requestId = `req-gemini-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (!apiKey) {
      return {
        success: false,
        provider: config.providerId,
        model: modelName,
        requestId,
        extraction: null,
        usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
        confidence: 0,
        error: 'API key is missing for Gemini Provider.',
        errorClass: 'API_KEY_ABSENCE',
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const prompt = `System Instructions:\n${ENTITY_EXTRACTION_SYSTEM_PROMPT}\n\nDocument Text to Extract:\n${documentText}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          error: 'Gemini Rate limit exceeded.',
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
          error: `Gemini API returned error code ${response.status}: ${response.statusText}`,
          errorClass: response.status >= 500 ? 'HTTP_5XX' : 'API_ERROR',
        };
      }

      const resData = await response.json();
      const textOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        return {
          success: false,
          provider: config.providerId,
          model: modelName,
          requestId,
          extraction: null,
          usage: { inputTokens: null, outputTokens: null, estimatedCost: null },
          confidence: 0,
          error: 'Malformed response structure from Gemini API.',
          errorClass: 'MALFORMED_OUTPUT',
        };
      }

      // Parse JSON from model output
      let parsed;
      try {
        parsed = JSON.parse(textOutput.trim());
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

      const inputTokens = resData.usageMetadata?.promptTokenCount || null;
      const outputTokens = resData.usageMetadata?.candidatesTokenCount || null;

      return {
        success: true,
        provider: this.providerId,
        model: modelName,
        requestId,
        extraction: parsed,
        usage: {
          inputTokens,
          outputTokens,
          estimatedCost: null,
        },
        confidence: 0.90, // default confidence signal
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
}
