import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { searchPPC } from '@/lib/ppc-search';
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

    // 1. Retrieve relevant PPC chunks
    const results = searchPPC(query, 5);

    if (results.length === 0) {
      return NextResponse.json({
        answer: 'No relevant sections found in the Pakistan Penal Code for this query.',
        sources: [],
      });
    }

    // 2. Build context from retrieved chunks
    const context = results
      .map((r) => `[Page ~${r.page}]\n${r.text}`)
      .join('\n\n---\n\n');

    // 3. Stream AI response
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are a legal AI assistant specialized in the Pakistan Penal Code (PPC).
Answer questions based ONLY on the provided context from the PPC.
Always cite the approximate page number when referencing specific sections.
Be precise, professional, and cite relevant sections clearly.
If the context does not contain enough information, say so clearly.

Context from Pakistan Penal Code:
${context}`,
      messages: [{ role: 'user', content: query }],
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
