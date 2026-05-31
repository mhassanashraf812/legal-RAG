/** Message when a question is outside PPC / penal-law scope */
export const OFF_TOPIC_MESSAGE = `I only answer questions about the **Pakistan Penal Code (PPC)**.

Please ask about a PPC section, offence, or punishment (e.g. Section 302, theft, murder). General or non-legal questions are not processed.`;

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(weather|forecast|temperature)\b/i,
  /\b(recipe|cook|baking|ingredients)\b/i,
  /\b(movie|film|netflix|tv show|celebrity|gossip)\b/i,
  /\b(sport|football|cricket score|nba|fifa|match score)\b/i,
  /\b(video game|gaming|fortnite|minecraft)\b/i,
  /\b(python|javascript|react|code|programming|debug|sql query)\b/i,
  /\b(homework|math problem|algebra|calculus|physics homework)\b/i,
  /\b(dating|relationship advice|breakup|crush)\b/i,
  /\b(joke|funny|meme|poem about)\b/i,
  /\b(stock price|crypto|bitcoin|investment tip)\b/i,
  /\b(medical diagnosis|symptoms|medicine for|dosage)\b/i,
  /\b(secretariat group|article\s+212|service tribunal|proforma promotion)\b/i,
  /\b(civil servant|government employee induction)\b/i,
];

const PPC_PATTERNS: RegExp[] = [
  /\b(ppc|pakistan penal|penal code)\b/i,
  /\b(section|sec\.?|ss\.?)\s*\d{1,4}\b/i,
  /\b\d{1,4}\s*sections?\b/i,
  /\b(?:what is|explain|meaning of|tell me about|define)\s+(?:section\s+)?\d{1,4}\b/i,
  /^\s*\d{1,4}\s*$/,
  /\b(crime|criminal|offence|offense|felony|misdemeanor)\b/i,
  /\b(murder|theft|robbery|assault|fraud|cheating|forgery|rape|kidnap|bribery)\b/i,
  /\b(punishment|sentence|imprisonment|fine|death penalty|life imprisonment)\b/i,
  /\b(culpable homicide|qatl|hurt|grievous hurt|defamation|trespass|mischief)\b/i,
  /\b(kidnapping|abduction|extortion|criminal breach|breach of trust)\b/i,
  /\b(wrongful confinement|confinement|criminal intimidation|intimidation)\b/i,
  /\b(attempt|abetment|conspiracy|common intention)\b/i,
  /\b(accused|complainant|fir|bail)\b/i,
];

export function hasOffTopicSignals(query: string): boolean {
  return OFF_TOPIC_PATTERNS.some((p) => p.test(query));
}

export function hasPpcSignals(query: string): boolean {
  return PPC_PATTERNS.some((p) => p.test(query));
}

/** Fast UI check — PPC / penal-code questions */
export function isLegalTopicQuestion(query: string): boolean {
  const text = query.trim();
  if (text.length < 4) return false;
  if (hasOffTopicSignals(text)) return false;
  if (hasPpcSignals(text)) return true;
  if (/^what is\s+.+/i.test(text)) return true;
  if (/^what are\s+.+/i.test(text)) return true;
  if (/^explain\s+.+/i.test(text)) return true;
  if (/^punishment\s+(for|of)\s+.+/i.test(text)) return true;
  return false;
}
