import type { PPCSearchResult, RagCoverage } from '@/lib/ppc-search';

export const NOT_IN_PPC_BOOK_MESSAGE = `**Not found in the PPC book (RAG)**

I could not find a matching passage in the uploaded **Pakistan Penal Code** document for your question.

Please try again with:
- A **section number** (e.g. Section 302, Section 379)
- Keywords from the offence or topic (e.g. theft, murder, cheating)

I only answer from retrieved PPC text — I do not guess or use outside legal knowledge.`;

export function formatRetrievedSources(results: PPCSearchResult[]): string {
  if (results.length === 0) return '';
  return results
    .map((r, i) => {
      const sectionMatch = r.text.match(/\b(\d{1,4})\.\s+\S/);
      const section = sectionMatch ? `Section ${sectionMatch[1]}` : 'Passage';
      return `${i + 1}. **${section}** — PPC book, page ~${r.page}`;
    })
    .join('\n');
}

export function buildRagInstructions(
  coverage: RagCoverage,
  results: PPCSearchResult[]
): string {
  const sourceList = formatRetrievedSources(results);

  if (!coverage.inBook) {
    return `RAG STATUS: NOT FOUND — do not answer.`;
  }

  return `RAG STATUS: FOUND IN PPC BOOK

You are a Pakistan Penal Code (PPC) assistant. Answer **only** using the retrieved passages below. Do not use training data, case law, service rules, or any source outside this context.

Rules (strict):
1. Start with: **From PPC (RAG):**
2. Quote or paraphrase only what appears in the retrieved text. Do not invent sections, punishments, or wording.
3. Every factual claim must include a citation: **Section N** and **page ~P** from the passages.
4. End with a section titled **Citations** listing each section and page you used (use only these retrieved sources):

${sourceList}

5. If the passages are partial or unclear, say so — do not fill gaps with assumptions.
6. Format using Markdown.`;
}
