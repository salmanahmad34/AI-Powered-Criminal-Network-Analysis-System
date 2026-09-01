import { describe, it, expect, beforeAll } from 'vitest';
import { checkNeo4jHealthDetails, getIsMockNeo4j } from '../config/neo4j';
import { graphSyncService } from '../services/graph/graph-sync.service';
import prisma from '../config/database';

describe('Neo4j Aura Graph Engine & Sync Integration Tests', () => {
  let testCaseId: string;

  beforeAll(async () => {
    // Seed a test case in mock Prisma store
    const testCase = await prisma.case.create({
      data: {
        caseNumber: 'TEST-CASE-NEO4J-001',
        title: 'Operation Aura Integration Test',
        caseType: 'CYBERCRIME_FRAUD',
        priority: 'HIGH',
        status: 'UNDER_INVESTIGATION',
        createdById: 'usr-admin-01',
      },
    });
    testCaseId = testCase.id;

    // Seed a test document
    const testDoc = await prisma.document.create({
      data: {
        caseId: testCaseId,
        filename: 'evidence_ledger_test.csv',
        originalFilename: 'evidence_ledger_test.csv',
        filePath: 'uploads/test.csv',
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        fileSize: 1024,
        mimeType: 'text/csv',
        dataCategory: 'FINANCIAL_LEDGER',
        uploadedById: 'usr-admin-01',
      },
    });

    // Seed test entities
    const ent1 = await prisma.entity.create({
      data: {
        caseId: testCaseId,
        entityType: 'PERSON',
        primaryName: 'Rohan Sharma Test',
        confidence: 0.98,
        sourceDocumentId: testDoc.id,
      },
    });

    const ent2 = await prisma.entity.create({
      data: {
        caseId: testCaseId,
        entityType: 'BANK_ACCOUNT',
        primaryName: 'HDFC-9842-TEST',
        confidence: 0.95,
        sourceDocumentId: testDoc.id,
      },
    });

    // Seed relationship
    await prisma.extractedRelationship.create({
      data: {
        documentId: testDoc.id,
        sourceEntityId: ent1.id,
        targetEntityId: ent2.id,
        relationshipType: 'TRANSFERRED_FUNDS',
        confidence: 0.94,
        explanation: 'Rapid money transit detected',
      },
    });
  });

  it('verifies Neo4j health check returns structured status', async () => {
    const health = await checkNeo4jHealthDetails();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('isMock');
    expect(health).toHaveProperty('connected', true);
  });

  it('correctly identifies mock driver vs real driver runtime mode', () => {
    const isMock = getIsMockNeo4j();
    expect(typeof isMock).toBe('boolean');
  });

  it('idempotently synchronizes case entities and relationships into graph', async () => {
    const syncResult = await graphSyncService.syncCaseToGraph(testCaseId);
    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedNodes).toBeGreaterThan(0);

    // Re-running sync must produce identical idempotent results without duplicate errors
    const reSyncResult = await graphSyncService.syncCaseToGraph(testCaseId);
    expect(reSyncResult.success).toBe(true);
    expect(reSyncResult.syncedNodes).toEqual(syncResult.syncedNodes);
  });

  it('retrieves graph D3/vis-network JSON payload with neutral categories', async () => {
    const graphPayload = await graphSyncService.getCaseGraph(testCaseId);
    expect(graphPayload).toHaveProperty('nodes');
    expect(graphPayload).toHaveProperty('edges');
    expect(graphPayload).toHaveProperty('stats');

    expect(Array.isArray(graphPayload.nodes)).toBe(true);
    expect(Array.isArray(graphPayload.edges)).toBe(true);
    expect(graphPayload.nodes.length).toBeGreaterThan(0);

    // Verify neutral category formatting
    const personNode = graphPayload.nodes.find((n) => n.type === 'PERSON');
    if (personNode) {
      expect(personNode.category).toBe('Person of Interest');
    }
  });
});
