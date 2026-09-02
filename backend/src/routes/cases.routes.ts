import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CaseType, CasePriority, CaseStatus, AuditAction, FileType } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { recordAudit } from '../middleware/audit';
import prisma from '../config/database';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
import logger from '../utils/logger';
import xlsx from 'xlsx';
import { runDocumentExtraction } from '../services/extraction/pipeline';

const router = Router();

// All case routes require authentication
router.use(authenticate);

const createCaseSchema = z.object({
  title: z.string().min(3).max(255),
  caseType: z.nativeEnum(CaseType),
  description: z.string().max(5000).optional(),
  incidentDate: z.string().optional().nullable(),
  location: z.string().max(500).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
  assignedInvestigatorId: z.string().optional().nullable(),
});

const updateCaseSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
  location: z.string().max(500).optional(),
  caseType: z.nativeEnum(CaseType).optional(),
  assignedInvestigatorId: z.string().optional().nullable(),
});

/**
 * Generate case number: CASE-YYYY-NNN
 */
async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.case.count({
    where: {
      caseNumber: { startsWith: `CASE-${year}` },
    },
  });
  return `CASE-${year}-${String(count + 1).padStart(3, '0')}`;
}

/**
 * Check if user has access to a specific case.
 */
async function userHasCaseAccess(userId: string, caseId: string, userRole: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    select: { createdById: true, assignedInvestigatorId: true },
  });

  if (caseRecord?.createdById === userId || caseRecord?.assignedInvestigatorId === userId) {
    return true;
  }

  const assignment = await prisma.caseAssignment.findUnique({
    where: {
      caseId_userId: { caseId, userId },
    },
  });

  return !!assignment;
}

/**
 * GET /api/cases
 * List cases — scoped by user assignment for Investigators/Officers.
 */
router.get('/', authorize('cases:view'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { status, priority, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    const take = Math.min(parseInt(limit as string, 10), 100);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Scope by assignment for Officers (unless ADMIN)
    if (userRole !== 'ADMIN') {
      where.OR = [
        { createdById: userId },
        { assignedInvestigatorId: userId },
        { assignments: { some: { userId } } },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { title: { contains: search as string, mode: 'insensitive' } },
        { caseNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where: where as any,
        include: {
          createdBy: { select: { id: true, fullName: true, email: true } },
          assignedInvestigator: { select: { id: true, fullName: true, email: true } },
          assignments: {
            include: { user: { select: { id: true, fullName: true, role: true } } },
          },
          _count: {
            select: { documents: true, entities: true, alerts: true, notes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.case.count({ where: where as any }),
    ]);

    res.json({ cases, total, page: parseInt(page as string, 10), limit: take });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cases.' });
  }
});

/**
 * POST /api/cases
 * Create a new case.
 */
router.post('/', authorize('cases:create'), async (req: Request, res: Response) => {
  try {
    const parsed = createCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input.', details: parsed.error.issues });
      return;
    }

    const caseNumber = await generateCaseNumber();
    const userId = req.user!.userId;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        title: parsed.data.title,
        caseType: parsed.data.caseType,
        description: parsed.data.description,
        incidentDate: parsed.data.incidentDate ? new Date(parsed.data.incidentDate) : null,
        location: parsed.data.location,
        priority: parsed.data.priority || CasePriority.MEDIUM,
        status: parsed.data.status || CaseStatus.OPEN,
        createdById: userId,
        assignedInvestigatorId: parsed.data.assignedInvestigatorId || null,
        assignments: {
          create: [
            {
              userId,
              role: 'creator',
              assignedById: userId,
            },
            ...(parsed.data.assignedInvestigatorId
              ? [
                  {
                    userId: parsed.data.assignedInvestigatorId,
                    role: 'assigned_investigator',
                    assignedById: userId,
                  },
                ]
              : []),
          ],
        },
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        assignedInvestigator: { select: { id: true, fullName: true } },
        assignments: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });

    await recordAudit(userId, AuditAction.CASE_CREATED, 'case', newCase.id, {
      caseNumber: newCase.caseNumber,
      title: newCase.title,
    }, req.ip || undefined);

    if (parsed.data.assignedInvestigatorId) {
      await recordAudit(userId, AuditAction.CASE_ASSIGNED, 'case', newCase.id, {
        caseNumber: newCase.caseNumber,
        assignedInvestigatorId: parsed.data.assignedInvestigatorId,
      }, req.ip || undefined);
    }

    res.status(201).json({ case: newCase });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create case.' });
  }
});

/**
 * GET /api/cases/:id
 * Get case detail — only if assigned.
 */
router.get('/:id', authorize('cases:view'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!await userHasCaseAccess(userId, caseId, userRole)) {
      res.status(403).json({ error: 'You do not have access to this case.' });
      return;
    }

    const caseDetail = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        assignedInvestigator: { select: { id: true, fullName: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
        _count: {
          select: {
            documents: true,
            entities: true,
            alerts: true,
            notes: true,
            reports: true,
            processingJobs: true,
          },
        },
      },
    });

    if (!caseDetail) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    await recordAudit(userId, AuditAction.CASE_VIEWED, 'case', caseId, undefined, typeof req.ip === 'string' ? req.ip : undefined);

    res.json({ case: caseDetail });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case.' });
  }
});

/**
 * PATCH /api/cases/:id
 * Update case fields.
 */
router.patch('/:id', authorize('cases:update'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!await userHasCaseAccess(userId, caseId, userRole)) {
      res.status(403).json({ error: 'You do not have access to this case.' });
      return;
    }

    const parsed = updateCaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input.', details: parsed.error.issues });
      return;
    }

    const existingCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existingCase) {
      res.status(404).json({ error: 'Case not found.' });
      return;
    }

    const updated = await prisma.case.update({
      where: { id: caseId },
      data: parsed.data,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        assignedInvestigator: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (parsed.data.assignedInvestigatorId !== undefined && parsed.data.assignedInvestigatorId !== existingCase.assignedInvestigatorId) {
      if (parsed.data.assignedInvestigatorId) {
        await prisma.caseAssignment.upsert({
          where: {
            caseId_userId: { caseId, userId: parsed.data.assignedInvestigatorId },
          },
          update: { role: 'assigned_investigator' },
          create: {
            caseId,
            userId: parsed.data.assignedInvestigatorId,
            role: 'assigned_investigator',
            assignedById: userId,
          },
        });

        await recordAudit(userId, AuditAction.CASE_ASSIGNED, 'case', caseId, {
          caseNumber: updated.caseNumber,
          assignedInvestigatorId: parsed.data.assignedInvestigatorId,
        }, typeof req.ip === 'string' ? req.ip : undefined);
      }
    }

    await recordAudit(userId, AuditAction.CASE_UPDATED, 'case', caseId, {
      fields: Object.keys(parsed.data),
    }, typeof req.ip === 'string' ? req.ip : undefined);

    res.json({ case: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update case.' });
  }
});

/**
 * POST /api/cases/:id/assign
 * Assign investigator to case.
 */
router.post('/:id/assign', authorize('cases:assign'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const { userId: targetUserId, role = 'investigator' } = req.body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const assignment = await prisma.caseAssignment.upsert({
      where: {
        caseId_userId: { caseId, userId: targetUserId },
      },
      update: { role },
      create: {
        caseId,
        userId: targetUserId,
        role,
        assignedById: req.user!.userId,
      },
    });

    res.json({ assignment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign investigator.' });
  }
});

/**
 * GET /api/cases/:id/notes
 * List case notes.
 */
router.get('/:id/notes', authorize('notes:view'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!await userHasCaseAccess(userId, caseId, userRole)) {
      res.status(403).json({ error: 'You do not have access to this case.' });
      return;
    }

    const notes = await prisma.caseNote.findMany({
      where: { caseId },
      include: {
        author: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

/**
 * POST /api/cases/:id/notes
 * Add a note to a case.
 */
router.post('/:id/notes', authorize('notes:create'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;

    const contentSchema = z.object({
      content: z.string().min(1).max(10000),
    });

    const parsed = contentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Note content is required.' });
      return;
    }

    const note = await prisma.caseNote.create({
      data: {
        caseId,
        authorId: userId,
        content: parsed.data.content,
      },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });

    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

interface ValidationResult {
  filename: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  message: string;
  errors: string[];
  rowCount?: number;
}

function validateFile(
  filename: string,
  mimetype: string,
  size: number,
  buffer: Buffer,
  dataCategory: string
): ValidationResult {
  const ext = path.extname(filename).toLowerCase();

  // Size Check
  const maxBytes = config.upload.maxFileSizeMB * 1024 * 1024;
  if (size > maxBytes) {
    return {
      filename,
      status: 'ERROR',
      message: `File exceeds maximum size of ${config.upload.maxFileSizeMB}MB.`,
      errors: [`File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${config.upload.maxFileSizeMB}MB.`],
    };
  }

  // Extension Check
  const allowedExts = config.upload.allowedExtensions;
  if (!allowedExts.includes(ext)) {
    return {
      filename,
      status: 'ERROR',
      message: `Unsupported file extension: ${ext}`,
      errors: [`Allowed extensions: ${allowedExts.join(', ')}`],
    };
  }

  // MIME check
  const allowedMimes = config.upload.allowedMimeTypes;
  if (!allowedMimes.includes(mimetype)) {
    return {
      filename,
      status: 'ERROR',
      message: `Unsupported MIME type: ${mimetype}`,
      errors: [`Allowed MIME types: ${allowedMimes.join(', ')}`],
    };
  }

  // Check signature / contents
  if (ext === '.pdf') {
    // Magic check: PDF signature %PDF (25 50 44 46)
    if (buffer.length < 4 || buffer.toString('hex', 0, 4) !== '25504446') {
      return {
        filename,
        status: 'ERROR',
        message: 'Invalid PDF file signature.',
        errors: ['File header does not match %PDF specifications.'],
      };
    }
  } else if (ext === '.json') {
    try {
      JSON.parse(buffer.toString('utf-8'));
    } catch (err) {
      return {
        filename,
        status: 'ERROR',
        message: 'Invalid JSON content.',
        errors: [`JSON parse error: ${(err as Error).message}`],
      };
    }
  }

  // Columns Check for CSV / XLSX structural categories
  let rowCount = 0;
  if (ext === '.csv' || ext === '.xlsx') {
    let headers: string[] = [];
    try {
      if (ext === '.csv') {
        const lines = buffer.toString('utf-8').split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
          rowCount = lines.length - 1;
        }
      } else {
        const wb = xlsx.read(buffer, { type: 'buffer' });
        const firstSheet = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheet];
        const data: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        if (data.length > 0) {
          headers = data[0].map((h: any) => String(h || '').trim());
          rowCount = data.length - 1;
        }
      }
    } catch (err) {
      return {
        filename,
        status: 'ERROR',
        message: `Failed to read table headers.`,
        errors: [`Parsing error: ${(err as Error).message}`],
      };
    }

    // Header validation logic based on category
    if (dataCategory === 'CDR') {
      const required = ['source_id', 'target_id', 'timestamp', 'duration'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length > 0) {
        return {
          filename,
          status: 'ERROR',
          message: `Missing required CDR columns.`,
          errors: [`Missing columns: ${missing.join(', ')}`, `Found columns: ${headers.join(', ')}`],
        };
      }
    } else if (dataCategory === 'TRANSACTION') {
      const required = ['sender_id', 'receiver_id', 'amount', 'timestamp', 'transaction_id'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length > 0) {
        return {
          filename,
          status: 'ERROR',
          message: `Missing required transaction columns.`,
          errors: [`Missing columns: ${missing.join(', ')}`, `Found columns: ${headers.join(', ')}`],
        };
      }
    } else if (dataCategory === 'LOCATION') {
      const required = ['entity_id', 'location', 'timestamp'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length > 0) {
        return {
          filename,
          status: 'ERROR',
          message: `Missing required location columns.`,
          errors: [`Missing columns: ${missing.join(', ')}`, `Found columns: ${headers.join(', ')}`],
        };
      }
    }
  }

  // Default VALID status
  return {
    filename,
    status: 'VALID',
    message: `File is valid. ${rowCount > 0 ? `${rowCount} records found.` : ''}`,
    errors: [],
    rowCount,
  };
}

// Multer storage configurations
const uploadMemory = multer({ storage: multer.memoryStorage() });

const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

const uploadDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
  },
});

/**
 * Recalculate file hash
 */
function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Map file extension to FileType enum
 */
function getFileType(filename: string): FileType {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, FileType> = {
    '.pdf': FileType.PDF,
    '.csv': FileType.CSV,
    '.xlsx': FileType.XLSX,
    '.json': FileType.JSON,
    '.txt': FileType.TXT,
  };
  return map[ext] || FileType.TXT;
}

/**
 * Run real AI extraction job in background
 */
async function runExtractionJob(jobId: string, caseId: string, docIds: string[], userId: string) {
  try {
    // 1. Mark job as validating
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'VALIDATING', progress: 10, startedAt: new Date() }
    });

    let processedCount = 0;
    let entitiesFoundTotal = 0;
    let relationshipsFoundTotal = 0;
    let errorsCount = 0;

    for (const docId of docIds) {
      // Update progress
      const progressValue = Math.floor(10 + (processedCount / docIds.length) * 80);
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { 
          status: 'PROCESSING', 
          progress: progressValue, 
          processedFiles: processedCount 
        }
      });

      // Run real extraction pipeline
      const success = await runDocumentExtraction(docId, userId);

      if (success) {
        const entCount = await prisma.extractedEntity.count({ where: { documentId: docId } });
        const relCount = await prisma.extractedRelationship.count({ where: { documentId: docId } });
        entitiesFoundTotal += entCount;
        relationshipsFoundTotal += relCount;
      } else {
        errorsCount++;
      }

      processedCount++;
    }

    // 2. Mark job as complete
    const finalStatus = errorsCount === docIds.length ? 'FAILED' : 'COMPLETED';
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        progress: 100,
        processedFiles: processedCount,
        entitiesFound: entitiesFoundTotal,
        relationshipsFound: relationshipsFoundTotal,
        errors: errorsCount,
        completedAt: new Date()
      }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: finalStatus === 'FAILED' ? AuditAction.PROCESSING_JOB_FAILED : AuditAction.PROCESSING_JOB_COMPLETED,
        resourceType: 'processingJob',
        resourceId: jobId,
        userId,
        details: { caseId, docIds, entitiesFoundTotal, relationshipsFoundTotal, errorsCount }
      }
    });

  } catch (err) {
    logger.error(`Error during processing job ${jobId}`, err);
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errors: docIds.length, completedAt: new Date() }
    });
  }
}

/**
 * GET /api/cases/:id/data
 * List case documents/data source files.
 */
router.get('/:id/data', authorize('cases:view'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!await userHasCaseAccess(userId, caseId, userRole)) {
      res.status(403).json({ error: 'You do not have access to this case.' });
      return;
    }

    const docs = await prisma.document.findMany({
      where: { caseId },
      include: {
        uploadedBy: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    const serialized = docs.map((d: any) => ({
      ...d,
      fileSize: d.fileSize.toString(),
    }));

    res.json({ documents: serialized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case documents.' });
  }
});

/**
 * POST /api/cases/:id/data/validate
 * Synchronous bulk file validation.
 */
router.post(
  '/:id/data/validate',
  authorize('cases:update'),
  uploadMemory.array('files', 20),
  async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      if (!await userHasCaseAccess(userId, caseId, userRole)) {
        res.status(403).json({ error: 'You do not have access to this case.' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided for validation.' });
        return;
      }

      const dataCategory = req.body.dataCategory || 'OTHER';

      const results = files.map(file => {
        return validateFile(file.originalname, file.mimetype, file.size, file.buffer, dataCategory);
      });

      const failedCount = results.filter(r => r.status === 'ERROR').length;

      if (failedCount > 0) {
        await recordAudit(userId, AuditAction.FILE_REJECTED, 'case', caseId, {
          failedCount,
        }, typeof req.ip === 'string' ? req.ip : undefined);
      } else {
        await recordAudit(userId, AuditAction.FILE_VALIDATED, 'case', caseId, {
          totalFiles: files.length,
        }, typeof req.ip === 'string' ? req.ip : undefined);
      }

      res.json({ results });
    } catch (err) {
      logger.error('Validation failed', err);
      res.status(500).json({ error: 'Validation pipeline failed.' });
    }
  }
);

/**
 * POST /api/cases/:id/data/upload
 * Bulk file upload and ingestion.
 */
router.post(
  '/:id/data/upload',
  authorize('cases:update'),
  uploadDisk.array('files', 20),
  async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      if (!await userHasCaseAccess(userId, caseId, userRole)) {
        res.status(403).json({ error: 'You do not have access to this case.' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded.' });
        return;
      }

      const dataCategory = req.body.dataCategory || 'OTHER';

      await recordAudit(userId, AuditAction.FILE_UPLOAD_STARTED, 'case', caseId, {
        fileCount: files.length,
      }, typeof req.ip === 'string' ? req.ip : undefined);

      const documents = [];

      for (const file of files) {
        const sha256 = computeFileHash(file.path);
        const fileType = getFileType(file.originalname);

        const doc = await prisma.document.create({
          data: {
            caseId,
            originalFilename: path.basename(file.originalname),
            storedFilename: file.filename,
            filePath: file.path,
            fileType,
            dataCategory: dataCategory as any,
            fileSize: BigInt(file.size),
            sha256Hash: sha256,
            uploadedById: userId,
            validationStatus: 'VALID',
            processingStatus: 'PENDING',
          },
        });

        documents.push({
          ...doc,
          fileSize: doc.fileSize.toString(),
        });
      }

      // Create Processing Job
      const job = await prisma.processingJob.create({
        data: {
          caseId,
          status: 'QUEUED',
          progress: 0,
          totalFiles: files.length,
          processedFiles: 0,
          totalRecords: 0,
          entitiesFound: 0,
          relationshipsFound: 0,
          errors: 0,
          startedById: userId,
        },
      });

      // Record Audits
      await recordAudit(userId, AuditAction.FILE_UPLOADED, 'case', caseId, {
        fileCount: files.length,
        documentIds: documents.map(d => d.id),
      }, typeof req.ip === 'string' ? req.ip : undefined);

      await recordAudit(userId, AuditAction.PROCESSING_JOB_CREATED, 'processingJob', job.id, {
        caseId,
        fileCount: files.length,
      }, typeof req.ip === 'string' ? req.ip : undefined);

      // Trigger background real extraction loop
      runExtractionJob(job.id, caseId, documents.map(d => d.id), userId);

      res.status(201).json({
        success: true,
        jobId: job.id,
        documents,
      });
    } catch (err) {
      logger.error('Upload ingestion failed', err);
      res.status(500).json({ error: 'File upload ingestion failed.' });
    }
  }
);

/**
 * GET /api/cases/:id/activity
 * Get chronological case audit activity logs.
 */
router.get('/:id/activity', authorize('cases:view'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!await userHasCaseAccess(userId, caseId, userRole)) {
      res.status(403).json({ error: 'You do not have access to this case.' });
      return;
    }

    // Retrieve audit logs related to this case ID
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resourceId: caseId },
          { details: { path: ['caseId'], equals: caseId } }
        ]
      },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case activity.' });
  }
});

/**
 * GET /api/cases/:id/relationships
 * List all extracted relationships for a specific case.
 */
router.get('/:id/relationships', authorize('entities:view'), async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!await userHasCaseAccess(userId, caseId, userRole)) {
      res.status(403).json({ error: 'You do not have access to this case.' });
      return;
    }

    const relationships = await prisma.extractedRelationship.findMany({
      where: {
        document: { caseId },
      },
      include: {
        sourceEntity: true,
        targetEntity: true,
        document: { select: { id: true, originalFilename: true } },
      },
      orderBy: { confidence: 'desc' },
    });

    res.json({ relationships });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch case relationships.' });
  }
});

export default router;
