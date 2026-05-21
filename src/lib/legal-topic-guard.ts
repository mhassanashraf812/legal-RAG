/** Message shown when a question is outside legal / court / law scope */
export const OFF_TOPIC_MESSAGE = `I'm **Justelligence**, a legal intelligence assistant. I can only help with questions related to **law, courts, legal procedure, statutes, regulations, crimes, civil rights, and government service law** in Pakistan.

Please rephrase your question to focus on a legal topic, or choose one of the suggested prompts below.`;

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
  /\b(translate|translation).*(spanish|french|german|urdu sentence)\b/i,
  /\b(who won (the )?(world cup|oscars?|election))\b/i,
  /\b(write (me )?(a |an )?(story|essay|email|letter) (about|for))\b/i,
  /\b(medical diagnosis|symptoms|medicine for|dosage)\b/i,
];

const LEGAL_PATTERNS: RegExp[] = [
  /\b(law|legal|lawyer|advocate|attorney|barrister|solicitor)\b/i,
  /\b(court|tribunal|judge|justice|bench|hearing|trial|appeal|bail)\b/i,
  /\b(statute|ordinance|act\b|ppc|penal)\b/i,
  /\b(section|sec\.?|ss\.?)\s*\d{1,4}\b/i,
  /\b\d{1,4}\s*sections?\b/i,
  /\b(?:what is|explain|meaning of|tell me about|define)\s+(?:section\s+)?\d{1,4}\b/i,
  /\barticle\s+\d{1,4}\b/i,
  /^\s*\d{1,4}\s*$/,
  /\b(crime|criminal|civil|plaintiff|defendant|prosecution|accused)\b/i,
  /\b(constitution|jurisdiction|writ|petition|suit|lawsuit|decree)\b/i,
  /\b(judgment|judgement|precedent|case law|ruling|verdict)\b/i,
  /\b(fir|bail|conviction|sentence|punishment|offence|offense)\b/i,
  /\b(contract|property|inheritance|custody|divorce|marriage law)\b/i,
  /\b(service matter|secretariat|civil servant|government employee)\b/i,
  /\b(high court|supreme court|session court|magistrate)\b/i,
  /\b(pakistan penal|penal code|regulation|provision|compliance)\b/i,
  /\b(rights?|liability|damages|negligence|tort|breach)\b/i,
  /\b(induction|promotion|disciplinary|departmental inquiry)\b/i,
  /\b(article\s+212|article\s+\d{1,3})\b/i,
];

export function hasOffTopicSignals(query: string): boolean {
  return OFF_TOPIC_PATTERNS.some((p) => p.test(query));
}

export function hasLegalSignals(query: string): boolean {
  return LEGAL_PATTERNS.some((p) => p.test(query));
}

/** Fast check for UI — blocks obvious off-topic; allows clear legal questions */
export function isLegalTopicQuestion(query: string): boolean {
  const text = query.trim();
  if (text.length < 4) return false;
  if (hasOffTopicSignals(text)) return false;
  if (hasLegalSignals(text)) return true;
  return false;
}
