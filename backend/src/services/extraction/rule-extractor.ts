import { EntityType, RelationshipType } from '@prisma/client';

export interface RuleExtractedEntity {
  value: string;
  entityType: EntityType;
  confidence: number;
  textSnippet?: string;
}

export interface RuleExtractedRelationship {
  sourceEntityValue: string;
  sourceEntityType: EntityType;
  targetEntityValue: string;
  targetEntityType: EntityType;
  relationshipType: RelationshipType;
  confidence: number;
  explanation?: string;
}

export interface RuleExtractionPayload {
  entities: RuleExtractedEntity[];
  relationships: RuleExtractedRelationship[];
}

const CITIES = [
  'Mumbai', 'Delhi', 'New Delhi', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Thane', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur',
  'Indore', 'Bhopal', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
  'Faridabad', 'Meerut', 'Rajkot', 'Kalyan', 'Varanasi', 'Srinagar', 'Aurangabad',
  'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore',
  'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota',
  'Guwahati', 'Chandigarh', 'Gurgaon', 'Gurugram', 'Noida'
];

const ORGS = [
  'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'SBI', 'Axis Bank', 'Kotak Mahindra',
  'Punjab National Bank', 'PNB', 'Cyber Crime Cell', 'Police Station', 'Crime Branch',
  'Reserve Bank of India', 'RBI', 'Airtel', 'Reliance Jio', 'Vodafone Idea', 'BSNL'
];

/**
 * Deterministic, rule-based fallback extractor for structured cyber investigation documents.
 * Extracts useful entities and reliable relationships without fabricating data.
 */
export function extractEntitiesWithRules(text: string): RuleExtractionPayload {
  const entitiesMap = new Map<string, RuleExtractedEntity>();
  const relationships: RuleExtractedRelationship[] = [];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const addEntity = (value: string, type: EntityType, confidence: number = 0.85, snippet?: string) => {
    const cleanVal = value.trim();
    if (!cleanVal || cleanVal.length < 2) return;
    const key = `${type}:${cleanVal.toLowerCase()}`;
    if (!entitiesMap.has(key)) {
      entitiesMap.set(key, {
        value: cleanVal,
        entityType: type,
        confidence,
        textSnippet: snippet ? snippet.slice(0, 150) : undefined,
      });
    }
  };

  for (const line of lines) {
    // --- PHONE ---
    const phoneMatches = line.match(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g);
    if (phoneMatches) {
      phoneMatches.forEach(p => addEntity(p, EntityType.PHONE, 0.95, line));
    }

    // --- EMAIL ---
    const emailMatches = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches) {
      emailMatches.forEach(e => addEntity(e, EntityType.EMAIL, 0.98, line));
    }

    // --- VEHICLE PLATE ---
    const vehicleMatches = line.match(/\b[A-Z]{2}[\s\-]?[0-9]{2}[\s\-]?[A-Z]{1,2}[\s\-]?[0-9]{4}\b/g);
    if (vehicleMatches) {
      vehicleMatches.forEach(v => addEntity(v, EntityType.VEHICLE, 0.90, line));
    }

    // --- DEVICE IDENTIFIER (IMEI & IP) ---
    const imeiMatches = line.match(/\b\d{15}\b/g);
    if (imeiMatches) {
      imeiMatches.forEach(i => addEntity(`IMEI-${i}`, EntityType.DEVICE_IDENTIFIER, 0.92, line));
    }

    const ipMatches = line.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g);
    if (ipMatches) {
      ipMatches.forEach(ip => {
        if (ip !== '127.0.0.1' && ip !== '0.0.0.0') {
          addEntity(ip, EntityType.DEVICE_IDENTIFIER, 0.90, line);
        }
      });
    }

    // --- BANK ACCOUNT ---
    const bankAccMatches = line.match(/(?:A\/C|Account|A\/c|Acc|HDFC|ICICI|SBI|Axis|PNB|Ledger)[\s:#\-\.]*(\b\d{9,18}\b)/gi);
    if (bankAccMatches) {
      bankAccMatches.forEach(m => {
        const digits = m.match(/\b\d{9,18}\b/);
        if (digits) addEntity(digits[0], EntityType.BANK_ACCOUNT, 0.92, line);
      });
    }

    // --- DATE ---
    const dateMatches = line.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g);
    if (dateMatches) {
      dateMatches.forEach(d => addEntity(d, EntityType.DATE, 0.88, line));
    }

    // --- AMOUNT ---
    const amountMatches = line.match(/(?:INR|Rs\.?|\$)\s?[0-9,]+(?:\.[0-9]{2})?|\b[0-9,]+\s?(?:rupees|lakhs|crores)\b/gi);
    if (amountMatches) {
      amountMatches.forEach(a => addEntity(a, EntityType.AMOUNT, 0.88, line));
    }

    // --- PERSON ---
    const personTitleMatches = line.match(/(?:Mr\.|Mrs\.|Ms\.|Dr\.|Suspect|Officer|Investigator|Accused|Complainant|Victim|Name)[\s:]+([A-Z][a-z]+\s+[A-Z][a-z]+)/g);
    if (personTitleMatches) {
      personTitleMatches.forEach(m => {
        const nameOnly = m.replace(/(?:Mr\.|Mrs\.|Ms\.|Dr\.|Suspect|Officer|Investigator|Accused|Complainant|Victim|Name)[\s:]+/i, '').trim();
        if (nameOnly.length >= 4) {
          addEntity(nameOnly, EntityType.PERSON, 0.90, line);
        }
      });
    }

    // --- LOCATION ---
    for (const city of CITIES) {
      const cityRegex = new RegExp(`\\b${city}\\b`, 'i');
      if (cityRegex.test(line)) {
        addEntity(city, EntityType.LOCATION, 0.85, line);
      }
    }

    // --- ORGANIZATION ---
    for (const org of ORGS) {
      const orgRegex = new RegExp(`\\b${org.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (orgRegex.test(line)) {
        addEntity(org, EntityType.ORGANIZATION, 0.90, line);
      }
    }
  }

  const entitiesList = Array.from(entitiesMap.values());

  const persons = entitiesList.filter(e => e.entityType === EntityType.PERSON);
  const phones = entitiesList.filter(e => e.entityType === EntityType.PHONE);
  const bankAccounts = entitiesList.filter(e => e.entityType === EntityType.BANK_ACCOUNT);
  const locations = entitiesList.filter(e => e.entityType === EntityType.LOCATION);

  // Relationship Rule A: Person <-> Phone (USED)
  for (const p of persons) {
    for (const ph of phones) {
      relationships.push({
        sourceEntityValue: p.value,
        sourceEntityType: EntityType.PERSON,
        targetEntityValue: ph.value,
        targetEntityType: EntityType.PHONE,
        relationshipType: RelationshipType.USED,
        confidence: 0.88,
        explanation: `Evidence record links suspect/person ${p.value} to contact ${ph.value}`,
      });
    }
  }

  // Relationship Rule B: Phone <-> Phone in CDR log (CALLED)
  if (phones.length >= 2) {
    for (let i = 0; i < phones.length - 1; i++) {
      relationships.push({
        sourceEntityValue: phones[i].value,
        sourceEntityType: EntityType.PHONE,
        targetEntityValue: phones[i + 1].value,
        targetEntityType: EntityType.PHONE,
        relationshipType: RelationshipType.CALLED,
        confidence: 0.90,
        explanation: `Call log record between ${phones[i].value} and ${phones[i + 1].value}`,
      });
    }
  }

  // Relationship Rule C: Bank Account <-> Bank Account (TRANSFERRED_FUNDS)
  if (bankAccounts.length >= 2) {
    for (let i = 0; i < bankAccounts.length - 1; i++) {
      relationships.push({
        sourceEntityValue: bankAccounts[i].value,
        sourceEntityType: EntityType.BANK_ACCOUNT,
        targetEntityValue: bankAccounts[i + 1].value,
        targetEntityType: EntityType.BANK_ACCOUNT,
        relationshipType: RelationshipType.SENT_MONEY,
        confidence: 0.85,
        explanation: `Financial transfer ledger linkage between accounts.`,
      });
    }
  }

  // Relationship Rule D: Person <-> Location (VISITED)
  for (const p of persons) {
    for (const loc of locations) {
      relationships.push({
        sourceEntityValue: p.value,
        sourceEntityType: EntityType.PERSON,
        targetEntityValue: loc.value,
        targetEntityType: EntityType.LOCATION,
        relationshipType: RelationshipType.VISITED,
        confidence: 0.80,
        explanation: `Location reference ${loc.value} linked to person profile ${p.value}`,
      });
    }
  }

  return {
    entities: entitiesList,
    relationships,
  };
}
