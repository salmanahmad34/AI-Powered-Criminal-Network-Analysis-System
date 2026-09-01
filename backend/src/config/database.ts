import { PrismaClient, UserRole, UserStatus, AuditAction, CaseType, CasePriority, CaseStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Helper to filter objects by a Prisma "select" field
function selectFields(obj: any, select: any) {
  if (!select || !obj) return obj;
  const result: any = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) {
      result[key] = obj[key];
    } else if (typeof val === 'object' && val !== null) {
      // Handle relation select/include
      const relSelect = (val as any).select;
      const relationObj = obj[key];
      if (Array.isArray(relationObj)) {
        result[key] = relationObj.map(item => selectFields(item, relSelect));
      } else {
        result[key] = selectFields(relationObj, relSelect);
      }
    }
  }
  return result;
}

class MockPrismaClient {
  public users: any[] = [];
  public cases: any[] = [];
  public caseAssignments: any[] = [];
  public auditLogs: any[] = [];
  public alerts: any[] = [];
  public documents: any[] = [];
  public processingJobs: any[] = [];
  public aiProviders: any[] = [];
  public aiRequests: any[] = [];
  public aiUsages: any[] = [];
  public entities: any[] = [];
  public extractedEntities: any[] = [];
  public extractedRelationships: any[] = [];
  public entityAliases: any[] = [];
  public entityIdentifiers: any[] = [];
  public matchCandidates: any[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Password123!', salt);

    // Initial Demo Users
    this.users = [
      {
        id: 'admin-uuid-1111',
        email: 'admin@crimegraph.demo',
        passwordHash: hash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        fullName: 'System Administrator (Demo)',
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'investigator-uuid-2222',
        email: 'investigator@crimegraph.demo',
        passwordHash: hash,
        role: UserRole.INVESTIGATOR,
        status: UserStatus.ACTIVE,
        fullName: 'Lead Investigator (Demo)',
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'senior-uuid-3333',
        email: 'senior@crimegraph.demo',
        passwordHash: hash,
        role: UserRole.SENIOR_OFFICER,
        status: UserStatus.ACTIVE,
        fullName: 'Senior Officer (Demo)',
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'viewer-uuid-4444',
        email: 'viewer@crimegraph.demo',
        passwordHash: hash,
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        fullName: 'Case Viewer (Demo)',
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Seed Demo Cases
    this.cases = [
      {
        id: 'case-uuid-1',
        caseNumber: 'CASE-2026-001',
        title: 'Cyber Financial Fraud',
        caseType: CaseType.CYBER_CRIME,
        description: 'Investigation into distributed phishing campaigns targeting government personnel.',
        incidentDate: new Date(),
        location: 'New Delhi',
        priority: CasePriority.HIGH,
        status: CaseStatus.ACTIVE,
        createdById: 'admin-uuid-1111',
        assignedInvestigatorId: 'investigator-uuid-2222',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'case-uuid-2',
        caseNumber: 'CASE-2026-002',
        title: 'Online Fraud Investigation',
        caseType: CaseType.ONLINE_FRAUD,
        description: 'Multi-layer banking transaction network suspicious patterns audit.',
        incidentDate: new Date(),
        location: 'Mumbai',
        priority: CasePriority.CRITICAL,
        status: CaseStatus.UNDER_REVIEW,
        createdById: 'admin-uuid-1111',
        assignedInvestigatorId: 'investigator-uuid-2222',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'case-uuid-3',
        caseNumber: 'CASE-2026-003',
        title: 'Identity Fraud Investigation',
        caseType: CaseType.IDENTITY_FRAUD,
        description: 'Forged credentials and synthetic profiles identity resolution case.',
        incidentDate: new Date(),
        location: 'Bangalore',
        priority: CasePriority.MEDIUM,
        status: CaseStatus.OPEN,
        createdById: 'admin-uuid-1111',
        assignedInvestigatorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Seed Assignments
    this.caseAssignments = [
      {
        id: 'assignment-1',
        caseId: 'case-uuid-1',
        userId: 'investigator-uuid-2222',
        role: 'lead',
        assignedAt: new Date(),
        assignedById: 'admin-uuid-1111',
      },
      {
        id: 'assignment-2',
        caseId: 'case-uuid-2',
        userId: 'investigator-uuid-2222',
        role: 'lead',
        assignedAt: new Date(),
        assignedById: 'admin-uuid-1111',
      },
    ];

    // Seed AI Providers
    this.aiProviders = [
      {
        id: 'provider-uuid-gemini',
        providerId: 'gemini',
        providerName: 'Google Gemini API',
        enabled: true,
        priority: 1,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        timeout: 30000,
        maxRetries: 2,
        cooldown: 60,
        healthStatus: 'HEALTHY',
        cooldownUntil: null,
        lastSuccess: null,
        lastFailure: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'provider-uuid-gemma',
        providerId: 'openrouter_gemma',
        providerName: 'OpenRouter Gemma',
        enabled: true,
        priority: 2,
        model: process.env.OPENROUTER_PRIMARY_MODEL || 'google/gemma-4-26b-a4b-it:free',
        timeout: 30000,
        maxRetries: 2,
        cooldown: 60,
        healthStatus: 'HEALTHY',
        cooldownUntil: null,
        lastSuccess: null,
        lastFailure: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'provider-uuid-glm',
        providerId: 'openrouter_glm',
        providerName: 'OpenRouter GLM',
        enabled: true,
        priority: 3,
        model: process.env.OPENROUTER_FALLBACK_MODEL || 'z-ai/glm-5.2:free',
        timeout: 30000,
        maxRetries: 2,
        cooldown: 60,
        healthStatus: 'HEALTHY',
        cooldownUntil: null,
        lastSuccess: null,
        lastFailure: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  // Raw Query for Health Check
  public async $queryRaw(query: TemplateStringsArray, ...values: any[]): Promise<any> {
    return [{ '?column?': 1 }];
  }

  // Model Operations
  public user = {
    findUnique: async (args: { where: { email?: string; id?: string }; select?: any }) => {
      let found: any = null;
      if (args.where.email) {
        found = this.users.find(u => u.email === args.where.email);
      } else if (args.where.id) {
        found = this.users.find(u => u.id === args.where.id);
      }
      return selectFields(found, args.select);
    },
    findMany: async (args?: { select?: any; orderBy?: any }) => {
      let list = [...this.users];
      if (args?.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return list.map(u => selectFields(u, args?.select));
    },
    create: async (args: { data: any; select?: any }) => {
      const newUser = {
        id: uuidv4(),
        status: UserStatus.ACTIVE,
        lastLogin: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.users.push(newUser);
      return selectFields(newUser, args.select);
    },
    update: async (args: { where: { id: string }; data: any; select?: any }) => {
      const index = this.users.findIndex(u => u.id === args.where.id);
      if (index === -1) throw new Error(`Record not found: User ${args.where.id}`);
      this.users[index] = {
        ...this.users[index],
        ...args.data,
        updatedAt: new Date(),
      };
      return selectFields(this.users[index], args.select);
    },
    delete: async (args: { where: { id: string } }) => {
      const index = this.users.findIndex(u => u.id === args.where.id);
      if (index === -1) throw new Error(`Record not found: User ${args.where.id}`);
      this.users[index].status = UserStatus.INACTIVE;
      return this.users[index];
    },
  };

  public case = {
    count: async (args?: { where?: any }) => {
      let list = [...this.cases];
      if (args?.where?.OR) {
        const creatorId = args.where.OR.find((o: any) => o.createdById)?.createdById;
        const assignedUserId = args.where.OR.find((o: any) => o.assignments)?.assignments?.some?.userId;
        if (creatorId && assignedUserId) {
          list = list.filter(c => 
            c.createdById === creatorId || 
            c.assignedInvestigatorId === assignedUserId ||
            this.caseAssignments.some(a => a.caseId === c.id && a.userId === assignedUserId)
          );
        }
      }
      if (args?.where?.status) {
        list = list.filter(c => c.status === args.where.status);
      }
      if (args?.where?.priority) {
        list = list.filter(c => c.priority === args.where.priority);
      }
      if (args?.where?.caseNumber?.startsWith) {
        list = list.filter(c => c.caseNumber.startsWith(args.where.caseNumber.startsWith));
      }
      return list.length;
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }) => {
      let list = [...this.cases];
      
      // Filter by createdById/assignments if required
      if (args?.where?.OR) {
        const creatorId = args.where.OR.find((o: any) => o.createdById)?.createdById;
        const assignedUserId = args.where.OR.find((o: any) => o.assignments)?.assignments?.some?.userId;
        if (creatorId && assignedUserId) {
          list = list.filter(c => 
            c.createdById === creatorId || 
            c.assignedInvestigatorId === assignedUserId ||
            this.caseAssignments.some(a => a.caseId === c.id && a.userId === assignedUserId)
          );
        }
      }

      if (args?.where?.status) {
        list = list.filter(c => c.status === args.where.status);
      }
      if (args?.where?.priority) {
        list = list.filter(c => c.priority === args.where.priority);
      }
      if (args?.where?.caseType) {
        list = list.filter(c => c.caseType === args.where.caseType);
      }
      if (args?.where?.assignedInvestigatorId) {
        list = list.filter(c => c.assignedInvestigatorId === args.where.assignedInvestigatorId);
      }
      if (args?.where?.OR && args.where.OR.some((o: any) => o.title)) {
        const searchTerms = args.where.OR.filter((o: any) => o.title?.contains || o.caseNumber?.contains);
        if (searchTerms.length > 0) {
          const t = (searchTerms[0].title?.contains || searchTerms[1]?.caseNumber?.contains || '').toLowerCase();
          list = list.filter(c => c.title.toLowerCase().includes(t) || c.caseNumber.toLowerCase().includes(t));
        }
      }

      if (args?.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      // Map relation fields
      const mapped = list.map(c => {
        const copy = { ...c };
        if (args?.include?.createdBy) {
          copy.createdBy = this.users.find(u => u.id === c.createdById);
        }
        if (args?.include?.assignedInvestigator) {
          copy.assignedInvestigator = this.users.find(u => u.id === c.assignedInvestigatorId) || null;
        }
        if (args?.include?.assignments) {
          copy.assignments = this.caseAssignments.filter(a => a.caseId === c.id);
        }
        return copy;
      });

      const skip = args?.skip || 0;
      const take = args?.take || 20;
      return mapped.slice(skip, skip + take);
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const c = this.cases.find(item => item.id === args.where.id);
      if (!c) return null;
      const copy = { ...c };
      if (args.include?.createdBy) {
        copy.createdBy = this.users.find(u => u.id === c.createdById);
      }
      if (args.include?.assignedInvestigator) {
        copy.assignedInvestigator = this.users.find(u => u.id === c.assignedInvestigatorId) || null;
      }
      if (args.include?.assignments) {
        copy.assignments = this.caseAssignments.filter(a => a.caseId === c.id);
      }
      if (args.include?.documents) {
        copy.documents = this.documents.filter(d => d.caseId === c.id);
      }
      if (args.include?.entities) {
        copy.entities = this.entities
          .filter(e => e.caseId === c.id)
          .map(e => ({
            ...e,
            aliases: this.entityAliases.filter(a => a.entityId === e.id),
            identifiers: this.entityIdentifiers.filter(i => i.entityId === e.id),
          }));
      }
      return copy;
    },
    create: async (args: { data: any; include?: any }) => {
      const newCase = {
        id: uuidv4(),
        status: CaseStatus.OPEN,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.cases.push(newCase);
      const copy = { ...newCase };
      if (args.include?.createdBy) {
        copy.createdBy = this.users.find(u => u.id === newCase.createdById);
      }
      if (args.include?.assignedInvestigator) {
        copy.assignedInvestigator = this.users.find(u => u.id === newCase.assignedInvestigatorId) || null;
      }
      return copy;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const index = this.cases.findIndex(c => c.id === args.where.id);
      if (index === -1) throw new Error(`Record not found: Case ${args.where.id}`);
      this.cases[index] = {
        ...this.cases[index],
        ...args.data,
        updatedAt: new Date(),
      };
      return this.cases[index];
    },
  };

  public caseAssignment = {
    findUnique: async (args: { where: { caseId_userId: { caseId: string; userId: string } } }) => {
      const { caseId, userId } = args.where.caseId_userId;
      return this.caseAssignments.find(a => a.caseId === caseId && a.userId === userId) || null;
    },
    create: async (args: { data: any }) => {
      const newAssign = {
        id: uuidv4(),
        assignedAt: new Date(),
        ...args.data,
      };
      this.caseAssignments.push(newAssign);
      return newAssign;
    },
    delete: async (args: { where: { caseId_userId: { caseId: string; userId: string } } }) => {
      const { caseId, userId } = args.where.caseId_userId;
      const index = this.caseAssignments.findIndex(a => a.caseId === caseId && a.userId === userId);
      if (index === -1) throw new Error('Record not found');
      const removed = this.caseAssignments[index];
      this.caseAssignments.splice(index, 1);
      return removed;
    },
  };

  public auditLog = {
    create: async (args: { data: any }) => {
      const newLog = {
        id: uuidv4(),
        createdAt: new Date(),
        ...args.data,
      };
      this.auditLogs.push(newLog);
      return newLog;
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }) => {
      let list = [...this.auditLogs];
      
      if (args?.where?.action) list = list.filter(l => l.action === args.where.action);
      if (args?.where?.userId) list = list.filter(l => l.userId === args.where.userId);
      if (args?.where?.resourceType) list = list.filter(l => l.resourceType === args.where.resourceType);

      if (args?.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      const mapped = list.map(l => {
        const copy = { ...l };
        if (args?.include?.user) {
          copy.user = this.users.find(u => u.id === l.userId) || null;
        }
        return copy;
      });

      const skip = args?.skip || 0;
      const take = args?.take || 50;
      return mapped.slice(skip, skip + take);
    },
    count: async (args?: { where?: any }) => {
      let list = [...this.auditLogs];
      if (args?.where?.action) list = list.filter(l => l.action === args.where.action);
      if (args?.where?.userId) list = list.filter(l => l.userId === args.where.userId);
      if (args?.where?.resourceType) list = list.filter(l => l.resourceType === args.where.resourceType);
      return list.length;
    },
  };

  public alert = {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }) => {
      let list = [...this.alerts];
      if (args?.where?.status) list = list.filter(a => a.status === args.where.status);
      if (args?.where?.alertType) list = list.filter(a => a.alertType === args.where.alertType);
      if (args?.where?.caseId) list = list.filter(a => a.caseId === args.where.caseId);

      if (args?.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      const mapped = list.map(a => {
        const copy = { ...a };
        if (args?.include?.case) {
          copy.case = this.cases.find(c => c.id === a.caseId) || null;
        }
        if (args?.include?.reviewedBy) {
          copy.reviewedBy = this.users.find(u => u.id === a.reviewedById) || null;
        }
        return copy;
      });

      const skip = args?.skip || 0;
      const take = args?.take || 50;
      return mapped.slice(skip, skip + take);
    },
    count: async (args?: { where?: any }) => {
      let list = [...this.alerts];
      if (args?.where?.status) list = list.filter(a => a.status === args.where.status);
      if (args?.where?.alertType) list = list.filter(a => a.alertType === args.where.alertType);
      if (args?.where?.caseId) list = list.filter(a => a.caseId === args.where.caseId);
      return list.length;
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const a = this.alerts.find(item => item.id === args.where.id);
      if (!a) return null;
      const copy = { ...a };
      if (args.include?.case) {
        copy.case = this.cases.find(c => c.id === a.caseId) || null;
      }
      if (args.include?.reviewedBy) {
        copy.reviewedBy = this.users.find(u => u.id === a.reviewedById) || null;
      }
      return copy;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const index = this.alerts.findIndex(a => a.id === args.where.id);
      if (index === -1) throw new Error(`Record not found: Alert ${args.where.id}`);
      this.alerts[index] = {
        ...this.alerts[index],
        ...args.data,
      };
      return this.alerts[index];
    },
  };

  public document = {
    count: async (args?: { where?: any }) => {
      let list = [...this.documents];
      if (args?.where?.caseId) list = list.filter(d => d.caseId === args.where.caseId);
      return list.length;
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let list = [...this.documents];
      if (args?.where?.caseId) list = list.filter(d => d.caseId === args.where.caseId);
      if (args?.orderBy?.uploadedAt === 'desc') {
        list.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      }
      return list.map(d => {
        const copy = { ...d };
        if (args?.include?.uploadedBy) {
          copy.uploadedBy = this.users.find(u => u.id === d.uploadedById) || null;
        }
        return copy;
      });
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const doc = this.documents.find(d => d.id === args.where.id);
      if (!doc) return null;
      const copy = { ...doc };
      if (args.include?.uploadedBy) {
        copy.uploadedBy = this.users.find(u => u.id === doc.uploadedById) || null;
      }
      return copy;
    },
    create: async (args: { data: any }) => {
      const doc = {
        id: uuidv4(),
        validationStatus: 'PENDING',
        processingStatus: 'PENDING',
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.documents.push(doc);
      return doc;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const index = this.documents.findIndex(d => d.id === args.where.id);
      if (index === -1) throw new Error('Record not found');
      this.documents[index] = {
        ...this.documents[index],
        ...args.data,
        updatedAt: new Date(),
      };
      return this.documents[index];
    },
  };

  public processingJob = {
    count: async (args?: { where?: any }) => {
      let list = [...this.processingJobs];
      if (args?.where?.caseId) list = list.filter(j => j.caseId === args.where.caseId);
      return list.length;
    },
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let list = [...this.processingJobs];
      if (args?.where?.caseId) list = list.filter(j => j.caseId === args.where.caseId);
      if (args?.orderBy?.createdAt === 'desc') {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return list.map(j => {
        const copy = { ...j };
        if (args?.include?.startedBy) {
          copy.startedBy = this.users.find(u => u.id === j.startedById) || null;
        }
        return copy;
      });
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const job = this.processingJobs.find(j => j.id === args.where.id);
      if (!job) return null;
      const copy = { ...job };
      if (args.include?.startedBy) {
        copy.startedBy = this.users.find(u => u.id === job.startedById) || null;
      }
      return copy;
    },
    create: async (args: { data: any }) => {
      const job = {
        id: uuidv4(),
        status: 'QUEUED',
        progress: 0,
        totalFiles: 0,
        processedFiles: 0,
        totalRecords: 0,
        entitiesFound: 0,
        relationshipsFound: 0,
        errors: 0,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.processingJobs.push(job);
      return job;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const index = this.processingJobs.findIndex(j => j.id === args.where.id);
      if (index === -1) throw new Error('Record not found');
      this.processingJobs[index] = {
        ...this.processingJobs[index],
        ...args.data,
        updatedAt: new Date(),
      };
      return this.processingJobs[index];
    },
  };

  public aIProvider = {
    findMany: async (args?: { where?: any; orderBy?: any }) => {
      let list = [...this.aiProviders];
      if (args?.where) {
        if (args.where.enabled !== undefined) {
          list = list.filter(p => p.enabled === args.where.enabled);
        }
      }
      if (args?.orderBy?.priority === 'asc') {
        list.sort((a, b) => a.priority - b.priority);
      }
      return list;
    },
    findUnique: async (args: { where: { id?: string; providerId?: string } }) => {
      return this.aiProviders.find(p => p.id === args.where.id || p.providerId === args.where.providerId) || null;
    },
    update: async (args: { where: { id?: string; providerId?: string }; data: any }) => {
      const idx = this.aiProviders.findIndex(p => p.id === args.where.id || p.providerId === args.where.providerId);
      if (idx === -1) throw new Error('Provider not found');
      this.aiProviders[idx] = {
        ...this.aiProviders[idx],
        ...args.data,
        updatedAt: new Date(),
      };
      return this.aiProviders[idx];
    },
  };

  public aIRequest = {
    create: async (args: { data: any }) => {
      const req = {
        id: uuidv4(),
        createdAt: new Date(),
        ...args.data,
      };
      this.aiRequests.push(req);
      return req;
    },
    findMany: async (args?: { where?: any; orderBy?: any }) => {
      return [...this.aiRequests];
    },
  };

  public aIUsage = {
    create: async (args: { data: any }) => {
      const usage = {
        id: uuidv4(),
        timestamp: new Date(),
        ...args.data,
      };
      this.aiUsages.push(usage);
      return usage;
    },
    findMany: async (args?: { where?: any; orderBy?: any }) => {
      return [...this.aiUsages];
    },
  };

  public extractedEntity = {
    create: async (args: { data: any }) => {
      const ee = {
        id: uuidv4(),
        ...args.data,
      };
      this.extractedEntities.push(ee);
      return ee;
    },
    findMany: async (args?: { where?: any }) => {
      let list = [...this.extractedEntities];
      if (args?.where?.documentId) {
        list = list.filter(e => e.documentId === args.where.documentId);
      }
      return list;
    },
    deleteMany: async (args?: { where?: any }) => {
      if (args?.where?.documentId) {
        this.extractedEntities = this.extractedEntities.filter(e => e.documentId !== args.where.documentId);
      }
      return { count: 0 };
    },
  };

  public extractedRelationship = {
    create: async (args: { data: any }) => {
      const er = {
        id: uuidv4(),
        ...args.data,
      };
      this.extractedRelationships.push(er);
      return er;
    },
    findMany: async (args?: { where?: any }) => {
      let list = [...this.extractedRelationships];
      if (args?.where?.documentId) {
        list = list.filter(r => r.documentId === args.where.documentId);
      }
      if (args?.where?.document?.caseId) {
        const caseDocIds = this.documents
          .filter(d => d.caseId === args.where.document.caseId)
          .map(d => d.id);
        list = list.filter(r => caseDocIds.includes(r.documentId));
      }
      return list.map(r => {
        const copy = { ...r };
        copy.sourceEntity = this.entities.find(e => e.id === r.sourceEntityId) || null;
        copy.targetEntity = this.entities.find(e => e.id === r.targetEntityId) || null;
        copy.document = this.documents.find(d => d.id === r.documentId) || null;
        return copy;
      });
    },
    deleteMany: async (args?: { where?: any }) => {
      if (args?.where?.documentId) {
        this.extractedRelationships = this.extractedRelationships.filter(r => r.documentId !== args.where.documentId);
      }
      return { count: 0 };
    },
  };

  public entity = {
    create: async (args: { data: any }) => {
      const ent = {
        id: uuidv4(),
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      this.entities.push(ent);
      return ent;
    },
    findMany: async (args?: { where?: any; include?: any }) => {
      let list = [...this.entities];
      if (args?.where?.caseId) {
        list = list.filter(e => e.caseId === args.where.caseId);
      }
      if (args?.where?.entityType) {
        list = list.filter(e => e.entityType === args.where.entityType);
      }
      return list.map(e => {
        const copy = { ...e };
        if (args?.include?.aliases) {
          copy.aliases = this.entityAliases.filter(a => a.entityId === e.id);
        }
        if (args?.include?.identifiers) {
          copy.identifiers = this.entityIdentifiers.filter(i => i.entityId === e.id);
        }
        return copy;
      });
    },
    findUnique: async (args: { where: { id: string }; include?: any }) => {
      const e = this.entities.find(ent => ent.id === args.where.id);
      if (!e) return null;
      const copy = { ...e };
      if (args.include?.aliases) {
        copy.aliases = this.entityAliases.filter(a => a.entityId === e.id);
      }
      if (args.include?.identifiers) {
        copy.identifiers = this.entityIdentifiers.filter(i => i.entityId === e.id);
      }
      return copy;
    },
    count: async (args?: { where?: any }) => {
      let list = [...this.entities];
      if (args?.where?.caseId) {
        list = list.filter(e => e.caseId === args.where.caseId);
      }
      return list.length;
    },
    deleteMany: async (args?: { where?: any }) => {
      if (args?.where?.caseId) {
        this.entities = this.entities.filter(e => e.caseId !== args.where.caseId);
      }
      return { count: 0 };
    },
  };

  public entityAlias = {
    create: async (args: { data: any }) => {
      const ea = {
        id: uuidv4(),
        ...args.data,
      };
      this.entityAliases.push(ea);
      return ea;
    },
  };

  public entityIdentifier = {
    create: async (args: { data: any }) => {
      const ei = {
        id: uuidv4(),
        ...args.data,
      };
      this.entityIdentifiers.push(ei);
      return ei;
    },
  };

  public matchCandidate = {
    findMany: async (args?: { where?: any; include?: any; orderBy?: any }) => {
      let list = [...this.matchCandidates];
      if (args?.where?.status) {
        list = list.filter(m => m.status === args.where.status);
      }
      return list.map(m => {
        const copy = { ...m };
        if (args?.include?.entityA) {
          copy.entityA = this.entities.find(e => e.id === m.entityAId) || null;
        }
        if (args?.include?.entityB) {
          copy.entityB = this.entities.find(e => e.id === m.entityBId) || null;
        }
        return copy;
      });
    },
    update: async (args: { where: { id: string }; data: any }) => {
      const idx = this.matchCandidates.findIndex(m => m.id === args.where.id);
      if (idx === -1) throw new Error('Match candidate not found');
      this.matchCandidates[idx] = {
        ...this.matchCandidates[idx],
        ...args.data,
      };
      return this.matchCandidates[idx];
    },
  };
}

let prisma: any;

// Fallback logic
const shouldMock = process.env.MOCK_DATABASE === 'true' || !process.env.DATABASE_URL;

if (shouldMock) {
  logger.info('ℹ️ Prisma: Running in MOCK (in-memory) mode');
  prisma = new MockPrismaClient() as any;
} else {
  try {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  } catch (err) {
    logger.error('❌ Failed to connect to PostgreSQL database, falling back to MOCK mode', err);
    prisma = new MockPrismaClient() as any;
  }
}

export default prisma;
