import { EntityType, RelationshipType } from '@prisma/client';

export interface AIProviderConfig {
  providerId: string;
  providerName: string;
  enabled: boolean;
  priority: number;
  model: string;
  timeout: number;
  maxRetries: number;
  cooldown: number; // in seconds
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'COOLDOWN' | 'DISABLED';
  cooldownUntil: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
}

export interface ExtractedEntityInput {
  value: string;
  entityType: EntityType;
  confidence: number;
  textSnippet?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface ExtractedRelationshipInput {
  sourceEntityValue: string;
  sourceEntityType: EntityType;
  targetEntityValue: string;
  targetEntityType: EntityType;
  relationshipType: RelationshipType;
  confidence: number;
  explanation?: string;
  timestamp?: string;
}

export interface NormalizedExtractionResult {
  success: boolean;
  provider: string;
  model: string;
  requestId: string;
  extraction: {
    entities: ExtractedEntityInput[];
    relationships: ExtractedRelationshipInput[];
  } | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCost: number | null;
  };
  confidence: number;
  sourceReferences?: any[];
  error?: string;
  errorClass?: string;
}

export interface AIProvider {
  providerId: string;
  extractDocument(
    documentText: string,
    metadata: { caseId: string; documentId: string },
    config: AIProviderConfig
  ): Promise<NormalizedExtractionResult>;
}
