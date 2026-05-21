import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { createOffTopicStreamResponse } from '@/lib/chat-rejection-response';
import { OFF_TOPIC_MESSAGE } from '@/lib/legal-topic-guard';
import { validateLegalTopic } from '@/lib/legal-topic-guard.server';
import { assessRagCoverage, searchPPC } from '@/lib/ppc-search';
import { buildRagInstructions } from '@/lib/rag-prompt';

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

    const isLegal = await validateLegalTopic(userQuery);
    if (!isLegal) {
      return createOffTopicStreamResponse(OFF_TOPIC_MESSAGE, messages);
    }

    // 1. Retrieve relevant PPC sections using Fuse.js
    const results = searchPPC(userQuery, 5);
    const coverage = assessRagCoverage(userQuery, results);
    const ragInstructions = buildRagInstructions(coverage);

    const context =
      results.length > 0
        ? results
            .map((r) => `[Pakistan Penal Code — Page ~${r.page}]\n${r.text}`)
            .join('\n\n---\n\n')
        : '(No matching passages retrieved from the PPC document.)';

    // 2. Build system prompt with retrieved context
    const systemPrompt = `You are Justelligence, a specialized Legal AI Assistant for the Pakistan Penal Code (PPC).

${ragInstructions}

Retrieved context from PPC knowledge base:
${context}

Additional instructions:
- Only answer questions related to law, courts, legal procedure, statutes, or regulations.
- If the user asks about non-legal topics, politely refuse.
- Maintain a formal, helpful legal tone.
- Format your response using Markdown.`;

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
