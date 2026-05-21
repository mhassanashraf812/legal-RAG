import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { join } from 'path';

type PPCChunk = {
  id: string;
  text: string;
  page: number;
  source: string;
};

// Load chunks at module init time (server-side only)
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

// Fuse.js index for fuzzy search
const fuse = new Fuse(chunks, {
  keys: ['text'],
  threshold: 0.6,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 3,
});

/** Extract any section numbers mentioned in the query */
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

/** PPC sections that exist in the ingested document (typical PPC range) */
function extractPpcSectionNumbers(query: string): number[] {
  return extractSectionNumbers(query).filter((n) => n >= 1 && n <= 511);
}

/** Find chunks that contain the start of a given PPC section (e.g. "302. Punishment") */
function searchBySectionNumber(sectionNum: number, topK: number): typeof chunks {
  const sectionStart = new RegExp(`\\b${sectionNum}\\.\\s+\\S`, 'i');
  const sectionMention = new RegExp(`\\bSection\\s+${sectionNum}\\b`, 'i');

  const matched = chunks.filter(
    (c) => sectionStart.test(c.text) || sectionMention.test(c.text)
  );

  // Prefer chunks where the section heading appears early in the text
  return matched
    .sort((a, b) => {
      const aIdx = a.text.search(sectionStart);
      const bIdx = b.text.search(sectionStart);
      const aScore = aIdx >= 0 ? aIdx : 9999;
      const bScore = bIdx >= 0 ? bIdx : 9999;
      return aScore - bScore;
    })
    .slice(0, topK);
}

/**
 * Simple keyword search fallback — searches for query words directly in chunk text.
 */
function keywordSearch(query: string, topK: number): typeof chunks {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 || /^\d{1,4}$/.test(w));
  if (words.length === 0) return [];

  // Score each chunk by how many query words appear
  const scored = chunks.map((chunk) => {
    const lower = chunk.text.toLowerCase();
    const matchCount = words.filter((w) => lower.includes(w)).length;
    return { chunk, matchCount };
  });

  return scored
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, topK)
    .map((s) => s.chunk);
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

/** Whether retrieved chunks actually answer the query from the PPC RAG book */
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

  const hasStrongMatch = results.some((r) => r.score === 0 || r.score < 0.38);
  if (!hasStrongMatch) {
    return { inBook: false, reason: 'weak_match' };
  }

  return { inBook: true, reason: 'found' };
}

export function searchPPC(query: string, topK = 5): PPCSearchResult[] {
  if (!query?.trim()) return [];

  // 0. Direct section lookup when user asks about a specific PPC section number
  const mentionedSections = extractSectionNumbers(query);
  const ppcSectionNums = extractPpcSectionNumbers(query);

  if (mentionedSections.length > 0) {
    const sectionResults = ppcSectionNums.flatMap((n) => searchBySectionNumber(n, topK));
    const unique = [...new Map(sectionResults.map((c) => [c.id, c])).values()];
    if (unique.length > 0) {
      console.log(
        `[PPC Search] Section lookup ${ppcSectionNums.join(', ')} → ${unique.length} results`
      );
      return unique.slice(0, topK).map((item) => ({
        id: item.id,
        text: item.text,
        page: item.page,
        source: item.source,
        score: 0,
      }));
    }

    // Section number asked but not in PPC book — skip fuzzy fallback
    console.log(
      `[PPC Search] Section(s) ${mentionedSections.join(', ')} not found in PPC document`
    );
    return [];
  }

  // 1. Try Fuse.js fuzzy search first
  let results = fuse.search(query, { limit: topK });
  console.log(`[PPC Search] Fuse query: "${query}" → ${results.length} results`);

  // 2. Fallback to simple keyword search if Fuse finds nothing
  if (results.length === 0) {
    console.log('[PPC Search] Falling back to keyword search...');
    const kwResults = keywordSearch(query, topK);
    console.log(`[PPC Search] Keyword search → ${kwResults.length} results`);
    return kwResults.map((item) => ({
      id: item.id,
      text: item.text,
      page: item.page,
      source: item.source,
      score: 0.5,
    }));
  }

  return results.map((r) => ({
    id: r.item.id,
    text: r.item.text,
    page: r.item.page,
    source: r.item.source,
    score: r.score ?? 1,
  }));
}
