import neo4jDriver, { getIsMockNeo4j } from '../../config/neo4j';
import prisma from '../../config/database';
import logger from '../../utils/logger';

// Helper mapping for specialized secondary node labels
const ENTITY_LABEL_MAP: Record<string, string> = {
  PERSON: 'Person',
  ORGANIZATION: 'Organization',
  PHONE: 'Phone',
  EMAIL: 'Email',
  BANK_ACCOUNT: 'BankAccount',
  LOCATION: 'Location',
  VEHICLE: 'Vehicle',
  DEVICE_IDENTIFIER: 'Device',
  WEBSITE: 'Website',
  PAYMENT_ID: 'PaymentId',
  DATE: 'Date',
  AMOUNT: 'Amount',
};

// Helper mapping for neutral UI categories
const NEUTRAL_CATEGORY_MAP: Record<string, string> = {
  PERSON: 'Person of Interest',
  ORGANIZATION: 'Corporate / Group Entity',
  PHONE: 'Communication Endpoint',
  EMAIL: 'Electronic Messaging Endpoint',
  BANK_ACCOUNT: 'Financial Ledger Account',
  LOCATION: 'Geographical Site',
  VEHICLE: 'Motor Vehicle',
  DEVICE_IDENTIFIER: 'Device Hardware / IP',
  WEBSITE: 'Web Endpoint',
  PAYMENT_ID: 'Payment Gateway Account',
  DATE: 'Temporal Landmark',
  AMOUNT: 'Monetary Transaction',
};

export class GraphSyncService {
  /**
   * Idempotently project PostgreSQL case data, documents, entities, identifiers, and relationships into Neo4j
   */
  public async syncCaseToGraph(caseId: string): Promise<{ success: boolean; syncedNodes: number; syncedEdges: number }> {
    const startTime = Date.now();
    logger.info(`Initiating idempotent graph sync for case: ${caseId}`);

    // Fetch case & document metadata from System of Record (PostgreSQL / Prisma)
    const targetCase = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: true,
        entities: {
          include: {
            aliases: true,
            identifiers: true,
          },
        },
      },
    });

    if (!targetCase) {
      logger.error(`GraphSyncService: Case ${caseId} not found in database.`);
      return { success: false, syncedNodes: 0, syncedEdges: 0 };
    }

    const documents = targetCase.documents || [];
    const entities = targetCase.entities || [];

    // Fetch extracted relationships across all case documents
    const docIds = documents.map((d: any) => d.id);
    const relationships = docIds.length > 0 ? await prisma.extractedRelationship.findMany({
      where: {
        documentId: { in: docIds },
      },
    }) : [];

    if (getIsMockNeo4j()) {
      logger.info(`ℹ️ Neo4j is running in MOCK mode. Graph sync simulated for case ${caseId} (${entities.length} entities, ${relationships.length} relationships).`);
      return {
        success: true,
        syncedNodes: entities.length + documents.length + 1,
        syncedEdges: relationships.length,
      };
    }

    const session = neo4jDriver.session();
    let syncedNodesCount = 0;
    let syncedEdgesCount = 0;

    try {
      // 1. Sync Case Node
      await session.run(
        `
        MERGE (c:Case {id: $id})
        ON CREATE SET
          c.caseNumber = $caseNumber,
          c.title = $title,
          c.status = $status,
          c.priority = $priority,
          c.createdAt = datetime()
        ON MATCH SET
          c.title = $title,
          c.status = $status,
          c.priority = $priority,
          c.updatedAt = datetime()
        `,
        {
          id: targetCase.id,
          caseNumber: targetCase.caseNumber,
          title: targetCase.title,
          status: targetCase.status,
          priority: targetCase.priority,
        }
      );
      syncedNodesCount++;

      // 2. Sync Document Nodes & Link to Case
      for (const doc of documents) {
        await session.run(
          `
          MERGE (d:Document {id: $id})
          ON CREATE SET
            d.caseId = $caseId,
            d.filename = $filename,
            d.fileCategory = $fileCategory,
            d.sha256 = $sha256,
            d.createdAt = datetime()
          WITH d
          MATCH (c:Case {id: $caseId})
          MERGE (c)-[r:CASE_CONTAINS]->(d)
          `,
          {
            id: doc.id,
            caseId: targetCase.id,
            filename: doc.originalFilename,
            fileCategory: doc.dataCategory,
            sha256: doc.fileHash,
          }
        );
        syncedNodesCount++;
      }

      // 3. Sync Entity Nodes with Multi-Label System (:Entity:<SpecializedType>)
      for (const ent of entities) {
        const specializedLabel = ENTITY_LABEL_MAP[ent.entityType] || 'Unknown';
        
        await session.run(
          `
          MERGE (e:Entity {id: $id})
          ON CREATE SET
            e.caseId = $caseId,
            e.entityType = $entityType,
            e.primaryName = $primaryName,
            e.confidence = $confidence,
            e.isResolved = $isResolved,
            e.sourceDocumentId = $sourceDocumentId,
            e.createdAt = datetime()
          ON MATCH SET
            e.primaryName = $primaryName,
            e.confidence = $confidence,
            e.updatedAt = datetime()
          WITH e
          CALL apoc.create.addLabels(e, [$specializedLabel]) YIELD node
          RETURN node
          `,
          {
            id: ent.id,
            caseId: targetCase.id,
            entityType: ent.entityType,
            primaryName: ent.primaryName,
            confidence: ent.confidence,
            isResolved: ent.isResolved,
            sourceDocumentId: ent.sourceDocumentId,
            specializedLabel,
          }
        ).catch(async () => {
          // Fallback if APOC plugin is absent in target Neo4j instance
          await session.run(
            `
            MERGE (e:Entity {id: $id})
            ON CREATE SET
              e.caseId = $caseId,
              e.entityType = $entityType,
              e.primaryName = $primaryName,
              e.confidence = $confidence,
              e.isResolved = $isResolved,
              e.sourceDocumentId = $sourceDocumentId,
              e.createdAt = datetime()
            `,
            {
              id: ent.id,
              caseId: targetCase.id,
              entityType: ent.entityType,
              primaryName: ent.primaryName,
              confidence: ent.confidence,
              isResolved: ent.isResolved,
              sourceDocumentId: ent.sourceDocumentId,
            }
          );
        });

        syncedNodesCount++;

        // Link Entity to Source Document if available
        if (ent.sourceDocumentId) {
          await session.run(
            `
            MATCH (e:Entity {id: $entityId})
            MATCH (d:Document {id: $docId})
            MERGE (e)-[r:MENTIONED_IN]->(d)
            ON CREATE SET r.confidence = $confidence
            `,
            {
              entityId: ent.id,
              docId: ent.sourceDocumentId,
              confidence: ent.confidence,
            }
          );
        }

        // Sync Aliases
        for (const alias of (ent.aliases || [])) {
          await session.run(
            `
            MERGE (a:Alias {id: $id})
            ON CREATE SET a.aliasName = $aliasName, a.sourceDocumentId = $sourceDocumentId
            WITH a
            MATCH (e:Entity {id: $entityId})
            MERGE (e)-[r:HAS_ALIAS]->(a)
            `,
            {
              id: alias.id,
              aliasName: alias.aliasName,
              sourceDocumentId: alias.sourceDocumentId,
              entityId: ent.id,
            }
          );
        }

        // Sync Identifiers
        for (const ident of (ent.identifiers || [])) {
          await session.run(
            `
            MERGE (i:Identifier {id: $id})
            ON CREATE SET i.identifierType = $type, i.identifierValue = $value, i.sourceDocumentId = $sourceDocumentId
            WITH i
            MATCH (e:Entity {id: $entityId})
            MERGE (e)-[r:HAS_IDENTIFIER]->(i)
            `,
            {
              id: ident.id,
              type: ident.identifierType,
              value: ident.identifierValue,
              sourceDocumentId: ident.sourceDocumentId,
              entityId: ent.id,
            }
          );
        }
      }

      // 4. Sync Relationships Edge by Edge
      for (const rel of relationships) {
        if (!rel.sourceEntityId || !rel.targetEntityId) continue;

        const relType = rel.relationshipType || 'ASSOCIATED_WITH';

        await session.run(
          `
          MATCH (source:Entity {id: $sourceEntityId})
          MATCH (target:Entity {id: $targetEntityId})
          MERGE (source)-[r:${relType} {id: $id}]->(target)
          ON CREATE SET
            r.relationshipType = $relationshipType,
            r.confidence = $confidence,
            r.explanation = $explanation,
            r.sourceDocumentId = $documentId,
            r.createdAt = datetime()
          `,
          {
            id: rel.id,
            sourceEntityId: rel.sourceEntityId,
            targetEntityId: rel.targetEntityId,
            relationshipType: relType,
            confidence: rel.confidence,
            explanation: rel.explanation || '',
            documentId: rel.documentId,
          }
        );
        syncedEdgesCount++;
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ GraphSyncService: Case ${caseId} graph sync completed in ${duration}ms (${syncedNodesCount} nodes, ${syncedEdgesCount} edges).`);
      return { success: true, syncedNodes: syncedNodesCount, syncedEdges: syncedEdgesCount };
    } catch (err) {
      logger.error(`❌ GraphSyncService: Failure during case ${caseId} graph sync`, err);
      return { success: false, syncedNodes: syncedNodesCount, syncedEdges: syncedEdgesCount };
    } finally {
      await session.close();
    }
  }

  /**
   * Retrieve Graph payload for Case formatted specifically for Frontend D3/Vis network rendering
   */
  public async getCaseGraph(caseId: string): Promise<{
    nodes: Array<{ id: string; label: string; type: string; category: string; confidence: number; caseId: string }>;
    edges: Array<{ id: string; source: string; target: string; type: string; label: string; confidence: number }>;
    stats: { totalNodes: number; totalEdges: number; density: number };
  }> {
    if (getIsMockNeo4j()) {
      // Mock Fallback graph response
      const entities = await prisma.entity.findMany({ where: { caseId } });
      const docIds = (await prisma.document.findMany({ where: { caseId } })).map((d: any) => d.id);
      const rels = await prisma.extractedRelationship.findMany({
        where: { documentId: { in: docIds } },
      });

      const nodes = entities.map((ent: any) => ({
        id: ent.id,
        label: ent.primaryName,
        type: ent.entityType,
        category: NEUTRAL_CATEGORY_MAP[ent.entityType] || 'Investigative Entity',
        confidence: ent.confidence,
        caseId: ent.caseId,
      }));

      const edges = rels
        .filter((r: any) => r.sourceEntityId && r.targetEntityId)
        .map((r: any) => ({
          id: r.id,
          source: r.sourceEntityId!,
          target: r.targetEntityId!,
          type: r.relationshipType,
          label: (r.relationshipType || '').replace(/_/g, ' '),
          confidence: r.confidence,
        }));

      const totalNodes = nodes.length;
      const totalEdges = edges.length;
      const maxPossibleEdges = totalNodes > 1 ? (totalNodes * (totalNodes - 1)) / 2 : 1;
      const density = parseFloat((totalEdges / maxPossibleEdges).toFixed(2));

      return { nodes, edges, stats: { totalNodes, totalEdges, density } };
    }

    const session = neo4jDriver.session();
    try {
      const result = await session.run(
        `
        MATCH (e:Entity {caseId: $caseId})
        OPTIONAL MATCH (e)-[r]->(target:Entity {caseId: $caseId})
        RETURN e, r, target
        `,
        { caseId }
      );

      const nodesMap = new Map<string, any>();
      const edgesList: any[] = [];

      for (const record of result.records) {
        const eNode = record.get('e');
        if (eNode && eNode.properties) {
          const props = eNode.properties;
          if (!nodesMap.has(props.id)) {
            nodesMap.set(props.id, {
              id: props.id,
              label: props.primaryName || props.id,
              type: props.entityType || 'UNKNOWN',
              category: NEUTRAL_CATEGORY_MAP[props.entityType] || 'Investigative Entity',
              confidence: props.confidence || 1.0,
              caseId: props.caseId,
            });
          }
        }

        const rEdge = record.get('r');
        const tNode = record.get('target');

        if (rEdge && tNode && rEdge.properties && tNode.properties) {
          const rProps = rEdge.properties;
          const tProps = tNode.properties;

          if (!nodesMap.has(tProps.id)) {
            nodesMap.set(tProps.id, {
              id: tProps.id,
              label: tProps.primaryName || tProps.id,
              type: tProps.entityType || 'UNKNOWN',
              category: NEUTRAL_CATEGORY_MAP[tProps.entityType] || 'Investigative Entity',
              confidence: tProps.confidence || 1.0,
              caseId: tProps.caseId,
            });
          }

          edgesList.push({
            id: rProps.id || `edge-${Math.random()}`,
            source: eNode.properties.id,
            target: tProps.id,
            type: rProps.relationshipType || rEdge.type,
            label: (rProps.relationshipType || rEdge.type || '').replace(/_/g, ' '),
            confidence: rProps.confidence || 1.0,
          });
        }
      }

      const nodes = Array.from(nodesMap.values());
      const totalNodes = nodes.length;
      const totalEdges = edgesList.length;
      const maxPossibleEdges = totalNodes > 1 ? (totalNodes * (totalNodes - 1)) / 2 : 1;
      const density = parseFloat((totalEdges / maxPossibleEdges).toFixed(2));

      return {
        nodes,
        edges: edgesList,
        stats: { totalNodes, totalEdges, density },
      };
    } catch (err) {
      logger.error(`Error querying Neo4j case graph for ${caseId}`, err);
      return { nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0, density: 0 } };
    } finally {
      await session.close();
    }
  }

  /**
   * Retrieve Ego Network neighborhood (1-hop / 2-hop) for target entity
   */
  public async getEntityNeighborhood(entityId: string, hops = 1): Promise<{ nodes: any[]; edges: any[] }> {
    const session = neo4jDriver.session();
    try {
      const result = await session.run(
        `
        MATCH (start:Entity {id: $entityId})-[r*1..${hops}]-(neighbor:Entity)
        RETURN start, r, neighbor
        LIMIT 50
        `,
        { entityId }
      );

      const nodesMap = new Map<string, any>();
      const edgesList: any[] = [];

      for (const record of result.records) {
        const start = record.get('start');
        const neighbor = record.get('neighbor');

        if (start && start.properties && !nodesMap.has(start.properties.id)) {
          nodesMap.set(start.properties.id, {
            id: start.properties.id,
            label: start.properties.primaryName,
            type: start.properties.entityType,
            category: NEUTRAL_CATEGORY_MAP[start.properties.entityType] || 'Investigative Entity',
          });
        }

        if (neighbor && neighbor.properties && !nodesMap.has(neighbor.properties.id)) {
          nodesMap.set(neighbor.properties.id, {
            id: neighbor.properties.id,
            label: neighbor.properties.primaryName,
            type: neighbor.properties.entityType,
            category: NEUTRAL_CATEGORY_MAP[neighbor.properties.entityType] || 'Investigative Entity',
          });
        }
      }

      return {
        nodes: Array.from(nodesMap.values()),
        edges: edgesList,
      };
    } catch (err) {
      return { nodes: [], edges: [] };
    } finally {
      await session.close();
    }
  }
}

export const graphSyncService = new GraphSyncService();
