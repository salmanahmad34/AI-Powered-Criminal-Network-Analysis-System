import { Router, Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { DataCategory, AuditAction } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { recordAudit } from '../middleware/audit';
import { config } from '../config/env';
import prisma from '../config/database';
import logger from '../utils/logger';

const router = Router();
router.use(authenticate);

// Ensure upload directory exists (outside web root)
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config — UUID filenames, size limit, type validation
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // SECURITY: Never use original filename for storage
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    cb(null, storedName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = config.upload.allowedExtensions;

  if (!allowed.includes(ext)) {
    cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
    return;
  }

  // Also check MIME type
  const allowedMimes = config.upload.allowedMimeTypes;
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error(`MIME type ${file.mimetype} not allowed.`));
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
    files: 20, // Max 20 files per upload
  },
});

/**
 * Map file extension to FileType enum.
 */
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'PDF',
    '.csv': 'CSV',
    '.xlsx': 'XLSX',
    '.json': 'JSON',
    '.txt': 'TXT',
  };
  return map[ext] || 'TXT';
}

/**
 * Compute SHA-256 hash of a file for evidence integrity.
 */
function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * POST /api/cases/:caseId/upload
 * Upload files to a case — bulk upload supported.
 */
router.post(
  '/cases/:caseId/upload',
  authorize('data:upload'),
  upload.array('files', 20),
  async (req: Request, res: Response) => {
    try {
      const caseId = req.params.caseId;
      const userId = req.user!.userId;
      const dataCategory = (req.body.dataCategory as DataCategory) || 'OTHER';

      // Verify case exists and user has access
      const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caseRecord) {
        res.status(404).json({ error: 'Case not found.' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded.' });
        return;
      }

      const documents = [];

      for (const file of files) {
        const sha256 = computeFileHash(file.path);

        const doc = await prisma.document.create({
          data: {
            caseId,
            originalFilename: path.basename(file.originalname), // sanitize
            storedFilename: file.filename,
            filePath: file.path,
            fileType: getFileType(file.originalname) as any,
            dataCategory: dataCategory as any,
            fileSize: BigInt(file.size),
            sha256Hash: sha256,
            uploadedById: userId,
          },
        });

        documents.push({
          ...doc,
          fileSize: doc.fileSize.toString(),
        });
      }

      await recordAudit(userId, AuditAction.FILE_UPLOADED, 'document', caseId, {
        fileCount: files.length,
        caseNumber: caseRecord.caseNumber,
      }, req.ip || undefined);

      res.status(201).json({ documents, count: documents.length });
    } catch (err) {
      logger.error('Upload failed', { error: (err as Error).message });
      res.status(500).json({ error: 'File upload failed.' });
    }
  }
);

/**
 * GET /api/cases/:caseId/documents
 * List documents for a case.
 */
router.get('/cases/:caseId/documents', authorize('documents:view'), async (req: Request, res: Response) => {
  try {
    const docs = await prisma.document.findMany({
      where: { caseId: req.params.caseId },
      include: {
        uploadedBy: { select: { id: true, fullName: true } },
        _count: { select: { extractedEntities: true, extractedRelations: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Convert BigInt to string for JSON serialization
    const serialized = docs.map(d => ({
      ...d,
      fileSize: d.fileSize.toString(),
    }));

    res.json({ documents: serialized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

/**
 * GET /api/documents/:id/integrity
 * Verify file integrity by comparing stored hash with current hash.
 */
router.get('/documents/:id/integrity', authorize('documents:view'), async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!fs.existsSync(doc.filePath)) {
      res.json({ verified: false, reason: 'File not found on disk.' });
      return;
    }

    const currentHash = computeFileHash(doc.filePath);
    const verified = currentHash === doc.sha256Hash;

    res.json({
      verified,
      storedHash: doc.sha256Hash,
      currentHash,
      status: verified ? 'INTEGRITY VERIFIED' : 'INTEGRITY MISMATCH',
    });
  } catch (err) {
    res.status(500).json({ error: 'Integrity check failed.' });
  }
});

export default router;
