import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../config/database';
import { CaseType, CasePriority, CaseStatus } from '@prisma/client';

describe('Case & Ingestion Processing Tests (Mock Mode)', () => {
  beforeEach(() => {
    // Reset database state
    prisma.cases = [];
    prisma.caseAssignments = [];
    prisma.documents = [];
    prisma.processingJobs = [];
    prisma.users = [
      {
        id: 'admin-uuid-1111',
        email: 'admin@crimegraph.demo',
        role: 'ADMIN',
        fullName: 'Admin User',
      },
      {
        id: 'investigator-uuid-2222',
        email: 'investigator@crimegraph.demo',
        role: 'INVESTIGATOR',
        fullName: 'Investigator User',
      },
      {
        id: 'viewer-uuid-4444',
        email: 'viewer@crimegraph.demo',
        role: 'VIEWER',
        fullName: 'Viewer User',
      },
    ];
  });

  describe('Case Creation & Code Assignment', () => {
    it('creates a case and generates the sequential case number', async () => {
      const year = new Date().getFullYear();

      // Create 1st case
      const case1 = await prisma.case.create({
        data: {
          caseNumber: `CASE-${year}-001`,
          title: 'Operation Blue Sky',
          caseType: CaseType.CYBER_CRIME,
          priority: CasePriority.HIGH,
          createdById: 'admin-uuid-1111',
        },
      });

      expect(case1.caseNumber).toBe(`CASE-${year}-001`);
      expect(prisma.cases.length).toBe(1);

      // Verify next sequence matches
      const count = await prisma.case.count({
        where: {
          caseNumber: { startsWith: `CASE-${year}` },
        },
      });
      expect(count).toBe(1);

      const case2 = await prisma.case.create({
        data: {
          caseNumber: `CASE-${year}-${String(count + 1).padStart(3, '0')}`,
          title: 'Operation Golden Ledger',
          caseType: CaseType.FINANCIAL_FRAUD,
          priority: CasePriority.CRITICAL,
          createdById: 'admin-uuid-1111',
        },
      });

      expect(case2.caseNumber).toBe(`CASE-${year}-002`);
      expect(prisma.cases.length).toBe(2);
    });
  });

  describe('Data Upload & Job Processing Telemetry', () => {
    it('creates database records and a processing job on ingestion', async () => {
      // 1. Setup a Case
      const caseObj = await prisma.case.create({
        data: {
          caseNumber: 'CASE-2026-001',
          title: 'Operation Shadow Ledger',
          caseType: CaseType.CYBER_CRIME,
          createdById: 'admin-uuid-1111',
        },
      });

      // 2. Mock creation of document
      const doc = await prisma.document.create({
        data: {
          caseId: caseObj.id,
          originalFilename: 'ledger_valid.csv',
          storedFilename: 'stored_ledger_1.csv',
          filePath: 'uploads/stored_ledger_1.csv',
          fileType: 'CSV',
          dataCategory: 'TRANSACTION',
          fileSize: BigInt(5120),
          sha256Hash: 'a5fd823b10...hash',
          uploadedById: 'investigator-uuid-2222',
        },
      });

      expect(doc.id).toBeDefined();
      expect(prisma.documents.length).toBe(1);
      expect(prisma.documents[0].originalFilename).toBe('ledger_valid.csv');

      // 3. Mock creation of Processing Job
      const job = await prisma.processingJob.create({
        data: {
          caseId: caseObj.id,
          status: 'QUEUED',
          progress: 0,
          totalFiles: 1,
          startedById: 'investigator-uuid-2222',
        },
      });

      expect(job.status).toBe('QUEUED');
      expect(job.progress).toBe(0);
      expect(prisma.processingJobs.length).toBe(1);

      // 4. Test Job Progress update
      await prisma.processingJob.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          progress: 50,
          processedFiles: 1,
        },
      });

      const updatedJob = await prisma.processingJob.findUnique({
        where: { id: job.id },
      });

      expect(updatedJob?.status).toBe('PROCESSING');
      expect(updatedJob?.progress).toBe(50);
    });
  });
});
