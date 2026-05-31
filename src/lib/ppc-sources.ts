import type { PPCSearchResult } from '@/lib/ppc-search';
import type { PpcSource } from '@/types/ppc';

export function toPpcSources(results: PPCSearchResult[]): PpcSource[] {
  return results.map((r) => {
    const sectionMatch = r.text.match(/\b(\d{1,4})\.\s+\S/);
    return {
      id: r.id,
      page: r.page,
      section: sectionMatch ? `Section ${sectionMatch[1]}` : null,
      excerpt: r.text.replace(/\s+/g, ' ').trim().slice(0, 420),
    };
  });
}

export function extractCitationBadges(text: string): string[] {
  const badges = new Set<string>();
  const sectionRe = /\b(?:Section|Sec\.?)\s*(\d{1,4})\b/gi;
  const pageRe = /\bpage\s*~?\s*(\d{1,4})\b/gi;

  for (const m of text.matchAll(sectionRe)) {
    badges.add(`§ ${m[1]}`);
  }
  for (const m of text.matchAll(pageRe)) {
    badges.add(`p. ~${m[1]}`);
  }
  return [...badges].slice(0, 12);
}
