import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { hasLegalSignals, hasOffTopicSignals } from '@/lib/legal-topic-guard';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/** Server-side validation including LLM for borderline questions */
export async function validateLegalTopic(query: string): Promise<boolean> {
  const text = query.trim();
  if (text.length < 4) return false;
  if (hasOffTopicSignals(text)) return false;
  if (hasLegalSignals(text)) return true;

  if (!process.env.GROQ_API_KEY) return false;

  try {
    const { text: verdict } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `You classify questions for a Pakistan legal AI assistant.
Reply with exactly YES if the question concerns law, courts, legal rights, crimes, statutes, regulations, government service law, or legal procedure.
Reply with exactly NO for all other topics.`,
      prompt: text,
      maxOutputTokens: 8,
    });
    return verdict.trim().toUpperCase().startsWith('YES');
  } catch {
    return false;
  }
}
