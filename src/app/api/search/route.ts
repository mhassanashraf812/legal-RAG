import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { assessRagCoverage, searchPPC } from '@/lib/ppc-search';
import { buildRagInstructions } from '@/lib/rag-prompt';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * PUBLIC SEARCH API — Usable from any external Next.js project.
 *
 * POST /api/search
 * Headers: { "x-api-key": "<your API key from .env.local>" }
 * Body:    { "query": "What is the punishment for theft?" }
 *
 * Returns a streamed AI response grounded in the Pakistan Penal Code.
 */
export async function POST(req: Request) {
  try {
    // --- Optional: API Key Authentication ---
    const apiKey = req.headers.get('x-api-key');
    const validKey = process.env.SEARCH_API_KEY;
    if (validKey && apiKey !== validKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const query: string = body?.query || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const results = searchPPC(query, 5);
    const coverage = assessRagCoverage(query, results);

    if (!coverage.inBook) {
      return NextResponse.json({
        answer: 'Not found in the PPC book (RAG). No matching passage was retrieved.',
        sources: [],
      });
    }

    const context = results
      .map((r) => `[PPC — Page ~${r.page}]\n${r.text}`)
      .join('\n\n---\n\n');

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `${buildRagInstructions(coverage, results)}\n\nRetrieved passages:\n${context}`,
      messages: [{ role: 'user', content: query }],
      temperature: 0,
    });

    // Add CORS headers so any project can call this API
    return result.toUIMessageStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      },
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: String(error) },
      { status: 500 }
    );
  }
}

// Handle preflight CORS requests from browser
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
