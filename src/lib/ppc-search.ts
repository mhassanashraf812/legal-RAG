import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { join } from 'path';

type PPCChunk = {
  id: string;
  text: string;
  page: number;
  source: string;
};

const STOP_WORDS = new Set([
  'what', 'is', 'are', 'the', 'for', 'under', 'about', 'explain', 'define',
  'punishment', 'penal', 'code', 'ppc', 'pakistan', 'tell', 'me', 'how',
  'does', 'mean', 'meaning', 'of', 'a', 'an', 'and', 'or', 'in', 'to',
]);

/** Common PPC offence topics → primary section numbers */
const PPC_TOPIC_SECTIONS: Record<string, number[]> = {
  'qatl-i-amd': [302, 300, 301],
  'qatl-e-amd': [302, 300, 301],
  'qatl i amd': [302, 300, 301],
  murder: [302, 300, 301],
  'culpable homicide': [299, 300, 304],
  theft: [378, 379, 380, 381],
  'criminal breach of trust': [405, 406, 407, 408],
  'breach of trust': [405, 406, 407, 408],
  kidnapping: [359, 360],
  kidnap: [359, 360],
  abduction: [362, 363, 364, 365],
  extortion: [383, 384, 385, 386],
  robbery: [390, 391, 392, 393, 394],
  cheating: [415, 416, 417, 418, 419, 420],
  'wrongful confinement': [340, 342],
  confinement: [340, 342],
  'criminal intimidation': [503, 506],
  intimidation: [503, 506],
  assault: [351, 352, 353],
  hurt: [332, 333, 334, 335, 336, 337],
  'grievous hurt': [334, 335, 336, 337],
  forgery: [463, 464, 465, 466, 467],
  rape: [375, 376],
  fraud: [415, 420, 421, 422, 423, 424, 425, 426],
  mischief: [425, 426, 427, 428, 440],
  defamation: [499, 500],
  qatl: [300, 301, 302],
};

function loadChunks(): PPCChunk[] {
  try {
    const filePath = join(process.cwd(), 'src', 'data', 'ppc-chunks.json');
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    console.log(`[PPC Search] Loaded ${parsed.chunks.length} chunks.`);
    return parsed.chunks as PPCChunk[];
  } catch (e) {
    console.error('[PPC Search] Failed to load chunks:', e);
    return [];
  }
}

const chunks = loadChunks();

const fuse = new Fuse(chunks, {
  keys: ['text'],
  threshold: 0.45,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

function extractSectionNumbers(query: string): number[] {
  const found = new Set<number>();
  const patterns = [
    /\b(?:section|sec\.?|ss\.?)\s*(\d{1,4})\b/gi,
    /\b(\d{1,4})\s*sections?\b/gi,
    /\b(?:what is|explain|meaning of|tell me about|define)\s+(?:section\s+)?(\d{1,4})\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of query.matchAll(pattern)) {
      found.add(parseInt(match[1], 10));
    }
  }

  const bare = query.trim().match(/^\s*(\d{1,4})\s*$/);
  if (bare) found.add(parseInt(bare[1], 10));

  return [...found];
}

function extractPpcSectionNumbers(query: string): number[] {
  return extractSectionNumbers(query).filter((n) => n >= 1 && n <= 511);
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?]/g, '')
    .replace(/\s+ppc\s*$/i, '')
    .replace(/^(what is|what are|explain|define|tell me about|punishment for|punishment of)\s+/i, '')
    .replace(/\s+under\s+(?:section\s+)?\d{1,4}\s*$/i, '')
    .trim();
}

function extractOffenceTopic(query: string): string | null {
  const cleaned = normalizeQuery(query);
  const keys = Object.keys(PPC_TOPIC_SECTIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleaned.includes(key)) return key;
  }
  return null;
}

export function extractSearchTerms(query: string): string[] {
  const normalized = query.toLowerCase().replace(/[^\w\s-]/g, ' ');
  const terms = normalized.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const topic = extractOffenceTopic(query);
  if (topic) {
    for (const part of topic.split(/[\s-]+/)) {
      if (part.length > 2 && !terms.includes(part)) terms.push(part);
    }
  }

  return [...new Set(terms)];
}

function searchBySectionNumber(
  sectionNum: number,
  topK: number,
  topicHint?: string
): PPCChunk[] {
  const sectionStart = new RegExp(`\\b${sectionNum}\\.\\s+\\S`, 'i');
  const sectionMention = new RegExp(`\\bSection\\s+${sectionNum}\\b`, 'i');

  let matched = chunks.filter(
    (c) => sectionStart.test(c.text) || sectionMention.test(c.text)
  );

  if (topicHint) {
    const topicRe = new RegExp(
      `\\b${sectionNum}\\.\\s+[^\\n]{0,80}${topicHint.replace(/-/g, '[\\s-]')}`,
      'i'
    );
    const preferred = matched.filter((c) => topicRe.test(c.text));
    if (preferred.length > 0) matched = preferred;
  }

  return matched
    .sort((a, b) => {
      const aIdx = a.text.search(sectionStart);
      const bIdx = b.text.search(sectionStart);
      return (aIdx >= 0 ? aIdx : 9999) - (bIdx >= 0 ? bIdx : 9999);
    })
    .slice(0, topK);
}

function searchByOffenceTopic(topic: string, topK: number): PPCChunk[] {
  const sections = PPC_TOPIC_SECTIONS[topic];
  if (!sections) return [];

  const primary = sections.slice(0, 2);
  const found = primary.flatMap((n) => searchBySectionNumber(n, 2, topic));
  return [...new Map(found.map((c) => [c.id, c])).values()].slice(0, topK);
}

function keywordSearch(query: string, topK: number): PPCChunk[] {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const lower = chunk.text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) score += term.length > 5 ? 2 : 1;
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}

function chunkToResult(item: PPCChunk, score: number): PPCSearchResult {
  return {
    id: item.id,
    text: item.text,
    page: item.page,
    source: item.source,
    score,
  };
}

function mergeResults(lists: PPCSearchResult[], topK: number): PPCSearchResult[] {
  const map = new Map<string, PPCSearchResult>();
  for (const r of lists) {
    const existing = map.get(r.id);
    if (!existing || r.score < existing.score) {
      map.set(r.id, r);
    }
  }
  return [...map.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, topK);
}

export type PPCSearchResult = {
  id: string;
  text: string;
  page: number;
  source: string;
  score: number;
};

export type RagCoverage = {
  inBook: boolean;
  reason: 'found' | 'no_results' | 'section_not_found' | 'weak_match';
  requestedSections?: number[];
};

function resultsMatchQueryTerms(query: string, results: PPCSearchResult[]): boolean {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) return results.length > 0;

  const combined = results.map((r) => r.text.toLowerCase()).join(' ');
  const hits = terms.filter((t) => combined.includes(t));
  return hits.length >= 1;
}

export function assessRagCoverage(
  query: string,
  results: PPCSearchResult[]
): RagCoverage {
  const mentionedSections = extractSectionNumbers(query);

  if (mentionedSections.length > 0) {
    const hasSection = mentionedSections.some((num) =>
      results.some((r) => new RegExp(`\\b${num}\\.\\s+\\S`, 'i').test(r.text))
    );
    if (!hasSection) {
      return {
        inBook: false,
        reason: 'section_not_found',
        requestedSections: mentionedSections,
      };
    }
    return { inBook: true, reason: 'found', requestedSections: mentionedSections };
  }

  if (results.length === 0) {
    return { inBook: false, reason: 'no_results' };
  }

  if (results.some((r) => r.score === 0)) {
    return { inBook: true, reason: 'found' };
  }

  if (resultsMatchQueryTerms(query, results)) {
    return { inBook: true, reason: 'found' };
  }

  const hasReasonableFuse = results.some((r) => r.score < 0.55);
  if (hasReasonableFuse) {
    return { inBook: true, reason: 'found' };
  }

  return { inBook: false, reason: 'weak_match' };
}

export function searchPPC(query: string, topK = 5): PPCSearchResult[] {
  if (!query?.trim()) return [];

  const mentionedSections = extractSectionNumbers(query);
  const ppcSectionNums = extractPpcSectionNumbers(query);

  if (mentionedSections.length > 0) {
    const sectionResults = ppcSectionNums.flatMap((n) => searchBySectionNumber(n, topK));
    const unique = [...new Map(sectionResults.map((c) => [c.id, c])).values()];
    if (unique.length > 0) {
      return unique.slice(0, topK).map((item) => chunkToResult(item, 0));
    }
    if (ppcSectionNums.length > 0) return [];
  }

  const collected: PPCSearchResult[] = [];

  const topic = extractOffenceTopic(query);
  if (topic) {
    const topicChunks = searchByOffenceTopic(topic, topK);
    collected.push(...topicChunks.map((c) => chunkToResult(c, 0)));
    console.log(`[PPC Search] Topic "${topic}" → ${topicChunks.length} section hits`);
  }

  const fuseResults = fuse.search(query, { limit: topK });
  collected.push(
    ...fuseResults.map((r) => chunkToResult(r.item, r.score ?? 1))
  );

  const cleaned = normalizeQuery(query);
  if (cleaned && cleaned !== query.toLowerCase()) {
    const topicFuse = fuse.search(cleaned, { limit: topK });
    collected.push(...topicFuse.map((r) => chunkToResult(r.item, r.score ?? 1)));
  }

  const kwResults = keywordSearch(query, topK);
  collected.push(...kwResults.map((c) => chunkToResult(c, 0.35)));

  const merged = mergeResults(collected, topK);
  console.log(`[PPC Search] Query: "${query}" → ${merged.length} results (top score: ${merged[0]?.score ?? 'n/a'})`);
  return merged;
}
