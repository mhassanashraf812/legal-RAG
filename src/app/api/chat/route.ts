import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { searchPPC } from '@/lib/ppc-search';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = 'nodejs'; // use nodejs runtime (not edge) for large JSON import

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided.' }), { status: 400 });
    }

    // Extract last user message text
    const lastMsg = messages[messages.length - 1];
    const userQuery: string =
      typeof lastMsg?.content === 'string'
        ? lastMsg.content
        : Array.isArray(lastMsg?.parts)
        ? lastMsg.parts
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p?.text || '')
            .join('')
        : '';

    // 1. Retrieve relevant PPC sections using Fuse.js
    const results = searchPPC(userQuery, 5);
    const context = results.length > 0
      ? results.map((r) => `[Pakistan Penal Code — Page ~${r.page}]\n${r.text}`).join('\n\n---\n\n')
      : 'No specific sections found. Answer based on general knowledge of Pakistani law.';

    // 2. Build system prompt with retrieved context
    const systemPrompt = `You are a specialized Legal AI Assistant for the Pakistan Penal Code (PPC).
Your goal is to provide accurate, professional legal information based on the provided context.

Context from Pakistan Penal Code:
${context}

Instructions:
- Use the provided context to answer the user's question.
- Cite the approximate page number when referencing sections.
- If the query is outside the provided data, answer generally but state that clearly.
- Maintain a formal, authoritative, yet helpful legal tone.
- Format your response using Markdown for clarity.`;

    // 3. Convert UIMessages to CoreMessages
    const coreMessages = messages.map((m: any) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.parts)
          ? m.parts.filter((p: any) => p?.type === 'text').map((p: any) => p?.text || '').join('')
          : '',
    }));

    // 4. Stream response
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages: coreMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
