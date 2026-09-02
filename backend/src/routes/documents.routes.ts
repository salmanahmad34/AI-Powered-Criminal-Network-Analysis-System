import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import prisma from '../config/database';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

/**
 * Compute SHA-256 hash of a file for verification.
 */
function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * GET /api/documents
 * List all documents with case and uploader details.
 */
router.get('/', authorize('documents:view'), async (req: Request, res: Response) => {
  try {
    const { caseId, limit = '50' } = req.query;
    const where: Record<string, unknown> = {};
    if (caseId) where.caseId = caseId as string;

    const docs = await prisma.document.findMany({
      where: where as any,
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        uploadedBy: { select: { id: true, fullName: true, role: true, email: true } },
      },
      orderBy: { uploadedAt: 'desc' },
      take: Math.min(parseInt(limit as string, 10) || 50, 200),
    });

    const serialized = docs.map((d: any) => ({
      ...d,
      fileSize: d.fileSize ? d.fileSize.toString() : '0',
    }));

    res.json({ documents: serialized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

/**
 * GET /api/documents/:id
 * Retrieve details of a document/metadata record.
 */
router.get('/:id', authorize('documents:view'), async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        uploadedBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Convert BigInt to string for JSON serialization
    const serialized = {
      ...doc,
      fileSize: doc.fileSize.toString(),
    };

    res.json({ document: serialized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document details.' });
  }
});

/**
 * GET /api/documents/:id/integrity
 * Verify file integrity by recalculating and comparing SHA-256 hashes.
 */
router.get('/:id/integrity', authorize('documents:view'), async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Integrity verification failed.' });
  }
});

/**
 * GET /api/documents/:id/download
 * Download raw stored file.
 */
router.get('/:id/download', authorize('documents:view'), async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!fs.existsSync(doc.filePath)) {
      res.status(404).json({ error: 'File not found on storage disk.' });
      return;
    }

    res.download(doc.filePath, doc.originalFilename);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download document.' });
  }
});

export default router;
