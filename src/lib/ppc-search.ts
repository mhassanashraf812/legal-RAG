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

/**
 * Simple keyword search fallback — searches for query words directly in chunk text.
 */
function keywordSearch(query: string, topK: number): typeof chunks {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
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

export function searchPPC(query: string, topK = 5) {
  if (!query?.trim()) return [];

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
