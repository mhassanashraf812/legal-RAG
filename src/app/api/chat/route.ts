import { createGroq } from '@ai-sdk/groq';
import { createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai';
import { createOffTopicStreamResponse } from '@/lib/chat-rejection-response';
import { OFF_TOPIC_MESSAGE } from '@/lib/legal-topic-guard';
import { validateLegalTopic } from '@/lib/legal-topic-guard.server';
import { assessRagCoverage, searchPPC } from '@/lib/ppc-search';
import { toPpcSources } from '@/lib/ppc-sources';
import { buildRagInstructions, NOT_IN_PPC_BOOK_MESSAGE } from '@/lib/rag-prompt';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided.' }), { status: 400 });
    }

    const lastMsg = messages[messages.length - 1];
    const userQuery: string =
      typeof lastMsg?.content === 'string'
        ? lastMsg.content
        : Array.isArray(lastMsg?.parts)
          ? lastMsg.parts
              .filter((p: { type?: string }) => p?.type === 'text')
              .map((p: { text?: string }) => p?.text || '')
              .join('')
          : '';

    const isLegal = await validateLegalTopic(userQuery);
    if (!isLegal) {
      return createOffTopicStreamResponse(OFF_TOPIC_MESSAGE, messages);
    }

    const results = searchPPC(userQuery, 5);
    const coverage = assessRagCoverage(userQuery, results);

    if (!coverage.inBook) {
      return createOffTopicStreamResponse(NOT_IN_PPC_BOOK_MESSAGE, messages);
    }

    const ragInstructions = buildRagInstructions(coverage, results);
    const sources = toPpcSources(results);

    const context = results
      .map((r) => `[PPC — Page ~${r.page}]\n${r.text}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You answer questions about the Pakistan Penal Code using RAG retrieval only.

${ragInstructions}

Retrieved passages (your only source of truth):
${context}`;

    const coreMessages = messages.map((m: { role: string; content?: string; parts?: { type?: string; text?: string }[] }) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.parts)
            ? m.parts.filter((p) => p?.type === 'text').map((p) => p?.text || '').join('')
            : '',
    }));

    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: ({ writer }) => {
        writer.write({
          type: 'data-sources',
          id: 'ppc-sources',
          data: sources,
        });

        const result = streamText({
          model: groq('llama-3.3-70b-versatile'),
          system: systemPrompt,
          messages: coreMessages,
          temperature: 0,
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
