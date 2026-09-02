import prisma from '../../config/database';
import { graphSyncService } from '../graph/graph-sync.service';
import logger from '../../utils/logger';

export interface SourceReference {
  type: 'case' | 'document' | 'entity' | 'relationship';
  id: string;
  label: string;
}

export interface ContextBuildResult {
  authorized: boolean;
  found: boolean;
  caseData?: {
    id: string;
    caseNumber: string;
    title: string;
  };
  contextPrompt: string;
  sources: SourceReference[];
  entitiesReferenced: string[];
  relationshipsReferenced: string[];
}

export class CaseContextBuilderService {
  public async buildCaseContext(
    caseId: string,
    userId: string,
    userRole: string
  ): Promise<ContextBuildResult> {
    // 1. Fetch Case with authorization check (supporting both UUID and caseNumber)
    const targetCase = await prisma.case.findFirst({
      where: {
        OR: [
          { id: caseId },
          { caseNumber: caseId },
        ],
      },
      include: {
        assignments: true,
        documents: { take: 10, orderBy: { createdAt: 'desc' } },
        entities: {
          take: 50,
          include: {
            sourceDocument: { select: { id: true, originalFilename: true } },
          },
        },
      },
    });

    if (!targetCase) {
      return { authorized: true, found: false, contextPrompt: '', sources: [], entitiesReferenced: [], relationshipsReferenced: [] };
    }

    // RBAC Scoping Check for Investigators/Officers
    if (userRole === 'INVESTIGATOR') {
      const isCreator = targetCase.createdById === userId;
      const isAssigned =
        targetCase.assignedInvestigatorId === userId ||
        (targetCase.assignments &&
          targetCase.assignments.some(
            (a: any) => a.userId === userId || a.officerId === userId
          ));

      if (!isCreator && !isAssigned) {
        logger.warn(`Unauthorized case context query attempt by Officer ${userId} on case ${caseId}`);
        return { authorized: false, found: true, contextPrompt: '', sources: [], entitiesReferenced: [], relationshipsReferenced: [] };
      }
    }

    // 2. Fetch extracted relationships for case documents
    const docIds = targetCase.documents.map((d: any) => d.id);
    const relationships = docIds.length > 0 ? await prisma.extractedRelationship.findMany({
      where: { documentId: { in: docIds } },
      take: 50,
    }) : [];

    // Map entity IDs to names for readable context
    const entityMap = new Map<string, string>();
    targetCase.entities.forEach((e: any) => entityMap.set(e.id, e.primaryName));

    // 3. Fetch Neo4j graph metrics
    let graphStats = { totalNodes: targetCase.entities.length, totalEdges: relationships.length, density: 0 };
    try {
      const graphData = await graphSyncService.getCaseGraph(targetCase.id);
      if (graphData && graphData.stats) {
        graphStats = graphData.stats;
      }
    } catch (err) {
      // ignore
    }

    // 4. Construct Sources Array
    const sources: SourceReference[] = [];
    sources.push({
      type: 'case',
      id: targetCase.id,
      label: `${targetCase.caseNumber}: ${targetCase.title}`,
    });

    targetCase.documents.forEach((d: any) => {
      sources.push({
        type: 'document',
        id: d.id,
        label: d.originalFilename,
      });
    });

    targetCase.entities.slice(0, 15).forEach((e: any) => {
      sources.push({
        type: 'entity',
        id: e.id,
        label: `${e.primaryName} (${e.entityType})`,
      });
    });

    // 5. Construct Bounded Context Prompt String
    const docSummaryText = targetCase.documents.length === 0
      ? 'No evidence documents uploaded yet.'
      : targetCase.documents
          .map(
            (d: any) =>
              `- File: "${d.originalFilename}" (Category: ${d.dataCategory || 'GENERAL'}, Processing Status: ${d.processingStatus}, Engine: ${d.extractionMethod || 'UNKNOWN'})`
          )
          .join('\n');

    const entitySummaryText = targetCase.entities.length === 0
      ? 'No entities extracted.'
      : targetCase.entities
          .map(
            (e: any) =>
              `- Entity: "${e.primaryName}" | Type: ${e.entityType} | Confidence: ${e.confidence} | Source Document: "${e.sourceDocument?.originalFilename || 'Unknown'}"`
          )
          .join('\n');

    const relSummaryText = relationships.length === 0
      ? 'No links or relationships extracted.'
      : relationships
          .map((r: any) => {
            const sName = r.sourceEntityId ? entityMap.get(r.sourceEntityId) || 'Unknown Source' : 'Unknown Source';
            const tName = r.targetEntityId ? entityMap.get(r.targetEntityId) || 'Unknown Target' : 'Unknown Target';
            return `- Link: "${sName}" --[${r.relationshipType || 'ASSOCIATED_WITH'}]--> "${tName}" (Confidence: ${r.confidence}, Snippet: "${r.explanation || 'N/A'}")`;
          })
          .join('\n');

    const contextPrompt = `
==================================================
CASE INVESTIGATION CONTEXT ENVELOPE
==================================================
CASE ENVELOPE DETAILS:
- Case Number: ${targetCase.caseNumber}
- Case Title: ${targetCase.title}
- Case Status: ${targetCase.status}
- Priority Level: ${targetCase.priority}
- Case Description: ${targetCase.description || 'No description provided.'}

NETWORK GRAPH TELEMETRY:
- Total Graph Nodes: ${graphStats.totalNodes}
- Total Graph Edges: ${graphStats.totalEdges}
- Network Graph Density: ${graphStats.density}

EVIDENCE DOCUMENTS RECORDED (${targetCase.documents.length}):
${docSummaryText}

EXTRACTED INVESTIGATIVE ENTITIES (${targetCase.entities.length}):
${entitySummaryText}

EXTRACTED RELATIONSHIPS & LINKS (${relationships.length}):
${relSummaryText}
==================================================
`;

    const entitiesReferenced = targetCase.entities.map((e: any) => e.primaryName);
    const relationshipsReferenced = relationships.map((r: any) => r.relationshipType || 'LINK');

    return {
      authorized: true,
      found: true,
      caseData: {
        id: targetCase.id,
        caseNumber: targetCase.caseNumber,
        title: targetCase.title,
      },
      contextPrompt,
      sources,
      entitiesReferenced,
      relationshipsReferenced,
    };
  }
}

export const caseContextBuilderService = new CaseContextBuilderService();
