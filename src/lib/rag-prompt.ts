import type { RagCoverage } from '@/lib/ppc-search';

export function buildRagInstructions(coverage: RagCoverage): string {
  if (coverage.inBook) {
    return `RAG STATUS: FOUND IN PPC BOOK
The passages below were retrieved from the Pakistan Penal Code (PPC) in your knowledge base.

You MUST begin your answer with this notice on its own line:
> **📘 From PPC book (RAG):** The following is based on the Pakistan Penal Code text retrieved from your document.

Then answer using the retrieved context. Cite section numbers (e.g. Section 302) and approximate page numbers. Do not invent PPC text that is not in the context.`;
  }

  const sectionNote =
    coverage.reason === 'section_not_found' && coverage.requestedSections?.length
      ? ` The user asked about Section(s) ${coverage.requestedSections.join(', ')}, which were **not found** in the PPC document.`
      : '';

  return `RAG STATUS: NOT FOUND IN PPC BOOK
The retrieved passages do NOT contain a reliable answer to the user's question in the Pakistan Penal Code (PPC) document.${sectionNote}

You MUST begin your answer with this notice on its own line:
> **⚠️ Not in PPC book (RAG):** This is **not** found in your uploaded Pakistan Penal Code knowledge base.

Then on the next line write:
> **But here is** general legal information that may help (verify with the official PPC or a qualified advocate):

After those two lines, provide careful general information about Pakistani law. Do NOT claim the text above from RAG supports your answer. Do NOT quote fake section text.`;
}
