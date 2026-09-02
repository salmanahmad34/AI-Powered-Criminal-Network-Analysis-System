import { describe, it, expect, beforeAll } from 'vitest';
import { extractEntitiesWithRules } from '../services/extraction/rule-extractor';
import { runDocumentExtraction } from '../services/extraction/pipeline';
import prisma from '../config/database';
import fs from 'fs';
import path from 'path';
import { EntityType, RelationshipType } from '@prisma/client';

describe('Document Extraction Pipeline & Fallback System Tests', () => {
  let testCaseId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user and case
    const user = await prisma.user.create({
      data: {
        email: `tester-${Date.now()}@crimegraph.demo`,
        passwordHash: 'hashed',
        fullName: 'Test Officer',
        role: 'INVESTIGATOR',
      },
    });
    testUserId = user.id;

    const testCase = await prisma.case.create({
      data: {
        caseNumber: `CASE-TEST-${Date.now()}`,
        title: 'Cyber Investigation Pipeline Test Case',
        caseType: 'CYBER_CRIME',
        priority: 'HIGH',
        status: 'OPEN',
        createdById: testUserId,
      },
    });
    testCaseId = testCase.id;
  });

  it('correctly extracts entities and relationships deterministically from sample CDR/FIR text', () => {
    const sampleText = `
      Case Incident Report - Cyber Fraud Unit
      Suspect: Vikram Malhotra
      Phone Number: +91 9876543210
      Target Account: 918273645019 at HDFC Bank
      Victim Name: Amit Verma
      Location: Mumbai
      Transaction Amount: INR 150,000 transferred on 2026-05-12
      Secondary Contact: +91 9123456789
    `;

    const result = extractEntitiesWithRules(sampleText);

    expect(result.entities.length).toBeGreaterThan(0);
    const phoneEntity = result.entities.find(e => e.entityType === EntityType.PHONE && e.value.includes('9876543210'));
    const personEntity = result.entities.find(e => e.entityType === EntityType.PERSON && e.value === 'Vikram Malhotra');
    const bankEntity = result.entities.find(e => e.entityType === EntityType.BANK_ACCOUNT && e.value === '918273645019');
    const locationEntity = result.entities.find(e => e.entityType === EntityType.LOCATION && e.value === 'Mumbai');

    expect(phoneEntity).toBeDefined();
    expect(personEntity).toBeDefined();
    expect(bankEntity).toBeDefined();
    expect(locationEntity).toBeDefined();

    // Check relationship rule
    expect(result.relationships.length).toBeGreaterThan(0);
  });

  it('runs document extraction pipeline when AI keys are missing and sets status COMPLETED with RULE_BASED_FALLBACK', async () => {
    // Create temporary physical test file
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const testFilePath = path.join(uploadsDir, `test_doc_${Date.now()}.txt`);
    const docContent = `
      FIR NO: 409/2026
      Suspect: Rajesh Kumar
      Contact Phone: +91 9811223344
      Location: Delhi
      Bank A/C: 409218273615 at ICICI Bank
      Stolen Amount: Rs 75,000
    `;
    fs.writeFileSync(testFilePath, docContent, 'utf-8');

    const doc = await prisma.document.create({
      data: {
        caseId: testCaseId,
        originalFilename: 'FIR_Report_Test.txt',
        storedFilename: path.basename(testFilePath),
        filePath: testFilePath,
        fileType: 'TXT',
        dataCategory: 'FIR_REPORTS',
        fileSize: BigInt(docContent.length),
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        processingStatus: 'PENDING',
        validationStatus: 'PENDING',
        uploadedById: testUserId,
      },
    });

    const success = await runDocumentExtraction(doc.id, testUserId);
    expect(success).toBe(true);

    const updatedDoc = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(updatedDoc).toBeDefined();
    expect(updatedDoc?.processingStatus).toBe('COMPLETED');
    expect(updatedDoc?.validationStatus).toBe('VALID');
    expect(updatedDoc?.extractionMethod).toBe('RULE_BASED_FALLBACK');
    expect(updatedDoc?.fallbackReason).toContain('AI provider unavailable; deterministic extraction used.');

    // Clean up temp file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }, 30000);

  it('properly fails document processing when file is empty or unparseable', async () => {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const emptyFilePath = path.join(uploadsDir, `empty_doc_${Date.now()}.txt`);
    fs.writeFileSync(emptyFilePath, '', 'utf-8');

    const emptyDoc = await prisma.document.create({
      data: {
        caseId: testCaseId,
        originalFilename: 'Empty_Corrupt.txt',
        storedFilename: path.basename(emptyFilePath),
        filePath: emptyFilePath,
        fileType: 'TXT',
        dataCategory: 'OTHER',
        fileSize: BigInt(0),
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        processingStatus: 'PENDING',
        validationStatus: 'PENDING',
        uploadedById: testUserId,
      },
    });

    const success = await runDocumentExtraction(emptyDoc.id, testUserId);
    expect(success).toBe(false);

    const failedDoc = await prisma.document.findUnique({ where: { id: emptyDoc.id } });
    expect(failedDoc?.processingStatus).toBe('FAILED');
    expect(failedDoc?.validationStatus).toBe('ERROR');
    expect(failedDoc?.validationErrors).toBeDefined();

    if (fs.existsSync(emptyFilePath)) {
      fs.unlinkSync(emptyFilePath);
    }
  });
});
