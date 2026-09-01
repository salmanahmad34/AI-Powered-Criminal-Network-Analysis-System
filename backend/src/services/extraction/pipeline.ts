import fs from 'fs';
import { z } from 'zod';
import prisma from '../../config/database';
import { extractTextFromBuffer } from './pdf-extractor';
import { AIProviderManager } from '../ai/provider.manager';
import { EntityType, RelationshipType, AuditAction } from '@prisma/client';
import logger from '../../utils/logger';

const aiManager = new AIProviderManager();

// Zod schemas for AI output validation
const entitySchema = z.object({
  value: z.string().min(1),
  entityType: z.nativeEnum(EntityType),
  confidence: z.number().min(0).max(1),
  textSnippet: z.string().optional(),
});

const relationshipSchema = z.object({
  sourceEntityValue: z.string().min(1),
  sourceEntityType: z.nativeEnum(EntityType),
  targetEntityValue: z.string().min(1),
  targetEntityType: z.nativeEnum(EntityType),
  relationshipType: z.nativeEnum(RelationshipType),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
  timestamp: z.string().optional(),
});

const extractionPayloadSchema = z.object({
  entities: z.array(entitySchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
});

/**
 * Normalise string value to map to IdentifierType if appropriate
 */
function getIdentifierType(type: EntityType) {
  const map: Record<string, string> = {
    PHONE: 'PHONE',
    EMAIL: 'EMAIL',
    BANK_ACCOUNT: 'BANK_ACCOUNT',
    PAYMENT_ID: 'PAYMENT_ID',
    VEHICLE: 'VEHICLE_PLATE',
    WEBSITE: 'IP_ADDRESS', // close enough fallback mapping
  };
  return map[type] || null;
}

/**
 * Execute document text parsing + AI structured extraction pipeline
 */
export async function runDocumentExtraction(
  documentId: string,
  userId: string
): Promise<boolean> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) {
    logger.error(`Document ${documentId} not found in pipeline.`);
    return false;
  }

  try {
    // 1. Update status to validation/extraction
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'PROCESSING', validationStatus: 'VALIDATING' },
    });

    if (!fs.existsSync(doc.filePath)) {
      throw new Error(`Physical document file not found at path: ${doc.filePath}`);
    }

    const fileBuffer = fs.readFileSync(doc.filePath);

    // 2. Text Extraction stage
    const plainText = await extractTextFromBuffer(fileBuffer, doc.originalFilename);

    if (!plainText || plainText.trim().length === 0) {
      throw new Error('Document content is completely empty.');
    }

    // 3. AI NLP Structured Extraction stage
    const aiResult = await aiManager.extractDocument(plainText, {
      caseId: doc.caseId,
      documentId,
    });

    if (!aiResult.success || !aiResult.extraction) {
      throw new Error(`AI extraction failed: ${aiResult.error || 'Unknown Gateway error.'}`);
    }

    // 4. Schema JSON Validation
    const parsedPayload = extractionPayloadSchema.safeParse(aiResult.extraction);

    if (!parsedPayload.success) {
      const validationErrors = parsedPayload.error.flatten();
      await prisma.document.update({
        where: { id: documentId },
        data: {
          validationStatus: 'ERROR',
          processingStatus: 'FAILED',
          validationErrors: validationErrors as any,
        },
      });
      logger.error(`JSON schema validation failed for document ${documentId}`, validationErrors);
      return false;
    }

    const { entities, relationships } = parsedPayload.data;

    // Clear previous extractions if any to prevent duplicates on rerun
    await prisma.extractedEntity.deleteMany({ where: { documentId } });
    await prisma.extractedRelationship.deleteMany({ where: { documentId } });

    const entityIdMap: Record<string, string> = {};

    // 5. Save Extracted Raw Entities and seed normalized Case Profiles
    for (const ent of entities) {
      // Save raw extraction log
      const rawExt = await prisma.extractedEntity.create({
        data: {
          documentId,
          entityType: ent.entityType,
          value: ent.value.trim(),
          confidence: ent.confidence,
          context: ent.textSnippet ? { snippet: ent.textSnippet } : null,
        },
      });

      // Seeding Case Entity Profile for view pages correlation
      let caseEntity = await prisma.entity.create({
        data: {
          caseId: doc.caseId,
          entityType: ent.entityType,
          primaryName: ent.value.trim(),
          confidence: ent.confidence,
          sourceDocumentId: documentId,
          isResolved: false,
        },
      });

      entityIdMap[ent.value.trim().toLowerCase()] = caseEntity.id;

      // Add alias and identifier metrics
      const identifierType = getIdentifierType(ent.entityType);
      if (identifierType) {
        await prisma.entityIdentifier.create({
          data: {
            entityId: caseEntity.id,
            identifierType: identifierType as any,
            identifierValue: ent.value.trim(),
            sourceDocumentId: documentId,
          },
        });
      } else {
        await prisma.entityAlias.create({
          data: {
            entityId: caseEntity.id,
            aliasName: ent.value.trim(),
            sourceDocumentId: documentId,
          },
        });
      }
    }

    // 6. Save relationships
    for (const rel of relationships) {
      const sourceEntityId = entityIdMap[rel.sourceEntityValue.trim().toLowerCase()] || null;
      const targetEntityId = entityIdMap[rel.targetEntityValue.trim().toLowerCase()] || null;

      await prisma.extractedRelationship.create({
        data: {
          documentId,
          sourceEntityId,
          targetEntityId,
          relationshipType: rel.relationshipType,
          confidence: rel.confidence,
          explanation: rel.explanation || null,
          timestamp: rel.timestamp ? new Date(rel.timestamp) : null,
        },
      });
    }

    // 7. Update document completion status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        validationStatus: 'VALID',
        processingStatus: 'COMPLETED',
      },
    });

    return true;
  } catch (err) {
    logger.error(`Pipeline extraction error on document ${documentId}`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        validationStatus: 'ERROR',
        processingStatus: 'FAILED',
        validationErrors: { error: (err as Error).message } as any,
      },
    });
    return false;
  }
}
