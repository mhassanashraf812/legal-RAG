import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { hasOffTopicSignals, hasPpcSignals } from '@/lib/legal-topic-guard';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/** Server-side validation for PPC-focused questions */
export async function validateLegalTopic(query: string): Promise<boolean> {
  const text = query.trim();
  if (text.length < 4) return false;
  if (hasOffTopicSignals(text)) return false;
  if (hasPpcSignals(text)) return true;
  if (/^what is\s+.+/i.test(text)) return true;
  if (/^what are\s+.+/i.test(text)) return true;
  if (/^explain\s+.+/i.test(text)) return true;
  if (/^punishment\s+(for|of)\s+.+/i.test(text)) return true;

  if (!process.env.GROQ_API_KEY) return false;

  try {
    const { text: verdict } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `You classify questions for a Pakistan Penal Code (PPC) RAG assistant.
Reply YES only if the question is about crimes, offences, punishments, or sections under the Pakistan Penal Code.
Reply NO for service law, constitutional articles, civil procedure, general chat, or non-penal topics.`,
      prompt: text,
      maxOutputTokens: 8,
    });
    return verdict.trim().toUpperCase().startsWith('YES');
  } catch {
    return false;
  }
}
