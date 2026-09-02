import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../config/database';
import { caseContextBuilderService } from '../services/ai/context-builder.service';
import { AIProviderManager } from '../services/ai/provider.manager';

describe('Phase 7A: Real AI Assistant & RAG Context Builder Tests', () => {
  const testCaseId = 'case-7a-test-uuid';
  const testDocId = 'doc-7a-test-uuid';
  const adminUserId = 'admin-7a-uuid';
  const assignedOfficerId = 'assigned-officer-7a-uuid';
  const unassignedOfficerId = 'unassigned-officer-7a-uuid';

  beforeEach(() => {
    // Reset database state
    prisma.cases = [
      {
        id: testCaseId,
        caseNumber: 'CASE-2026-7A',
        title: 'Operation AI RAG Verification',
        status: 'ACTIVE',
        priority: 'HIGH',
        description: 'Test case envelope for RAG ground verification',
        createdById: adminUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    prisma.caseAssignments = [
      {
        id: 'assignment-1',
        caseId: testCaseId,
        userId: assignedOfficerId,
        officerId: assignedOfficerId,
        assignedById: adminUserId,
        createdAt: new Date(),
      },
    ];

    prisma.documents = [
      {
        id: testDocId,
        caseId: testCaseId,
        filename: 'firmware_intercept_001.pdf',
        originalFilename: 'firmware_intercept_001.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        fileHash: 'sha256-test-7a-hash',
        processingStatus: 'COMPLETED',
        extractionMethod: 'AI',
        dataCategory: 'TEXT',
        uploadedById: adminUserId,
        createdAt: new Date(),
      },
    ];

    prisma.entities = [
      {
        id: 'ent-1',
        caseId: testCaseId,
        sourceDocumentId: testDocId,
        entityType: 'PERSON',
        primaryName: 'Rohan Sharma',
        confidence: 0.95,
        isResolved: false,
        createdAt: new Date(),
      },
      {
        id: 'ent-2',
        caseId: testCaseId,
        sourceDocumentId: testDocId,
        entityType: 'PHONE',
        primaryName: '+91 9876543210',
        confidence: 0.98,
        isResolved: false,
        createdAt: new Date(),
      },
    ];

    prisma.extractedRelationships = [
      {
        id: 'rel-1',
        documentId: testDocId,
        sourceEntityId: 'ent-1',
        targetEntityId: 'ent-2',
        relationshipType: 'COMMUNICATED_WITH',
        confidence: 0.92,
        explanation: 'Intercepted call log between suspect and endpoint',
        createdAt: new Date(),
      },
    ];

    prisma.users = [
      {
        id: adminUserId,
        email: 'admin@crimegraph.demo',
        role: 'ADMIN',
        fullName: 'Admin User',
      },
      {
        id: assignedOfficerId,
        email: 'assigned.officer@crimegraph.demo',
        role: 'INVESTIGATOR',
        fullName: 'Assigned Officer',
      },
      {
        id: unassignedOfficerId,
        email: 'unassigned.officer@crimegraph.demo',
        role: 'INVESTIGATOR',
        fullName: 'Unassigned Officer',
      },
    ];
  });

  describe('Case Context Scoping & Building', () => {
    it('1. Returns found=false for non-existent case', async () => {
      const result = await caseContextBuilderService.buildCaseContext(
        'nonexistent-uuid',
        adminUserId,
        'ADMIN'
      );
      expect(result.found).toBe(false);
    });

    it('2. Rejects unassigned Officer with authorized=false (403 Enforcement)', async () => {
      const result = await caseContextBuilderService.buildCaseContext(
        testCaseId,
        unassignedOfficerId,
        'INVESTIGATOR'
      );
      expect(result.found).toBe(true);
      expect(result.authorized).toBe(false);
    });

    it('3. Authorizes assigned Officer with authorized=true', async () => {
      const result = await caseContextBuilderService.buildCaseContext(
        testCaseId,
        assignedOfficerId,
        'INVESTIGATOR'
      );
      expect(result.found).toBe(true);
      expect(result.authorized).toBe(true);
      expect(result.contextPrompt).toContain('Rohan Sharma');
    });

    it('4. Authorizes Admin with authorized=true for any case', async () => {
      const result = await caseContextBuilderService.buildCaseContext(
        testCaseId,
        adminUserId,
        'ADMIN'
      );
      expect(result.found).toBe(true);
      expect(result.authorized).toBe(true);
    });

    it('5. Builds bounded evidence prompt string with entities, documents, and links', async () => {
      const result = await caseContextBuilderService.buildCaseContext(
        testCaseId,
        adminUserId,
        'ADMIN'
      );

      expect(result.contextPrompt).toContain('CASE-2026-7A');
      expect(result.contextPrompt).toContain('firmware_intercept_001.pdf');
      expect(result.contextPrompt).toContain('Rohan Sharma');
      expect(result.contextPrompt).toContain('+91 9876543210');
      expect(result.contextPrompt).toContain('COMMUNICATED_WITH');
      expect(result.sources.length).toBeGreaterThan(0);

      const docSource = result.sources.find((s) => s.type === 'document');
      expect(docSource?.label).toBe('firmware_intercept_001.pdf');
    });

    it('6. Authorizes lookup by caseNumber string (e.g. CASE-2026-7A)', async () => {
      const result = await caseContextBuilderService.buildCaseContext(
        'CASE-2026-7A',
        assignedOfficerId,
        'INVESTIGATOR'
      );
      expect(result.found).toBe(true);
      expect(result.authorized).toBe(true);
      expect(result.caseData?.id).toBe(testCaseId);
    });
  });
});
