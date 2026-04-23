function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s#@]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 2);
}

function toBigrams(tokens: string[]): string[] {
  const grams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) grams.push(`${tokens[i]} ${tokens[i + 1]}`);
  return grams;
}

export function jaccardSimilarity(a: string, b: string): number {
  const aTokens = toBigrams(tokenize(a));
  const bTokens = toBigrams(tokenize(b));

  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);

  let intersection = 0;
  for (const t of aSet) if (bSet.has(t)) intersection++;

  const union = aSet.size + bSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function maxSimilarity(candidate: string, previous: string[]): { max: number; index: number } {
  let max = 0;
  let index = -1;
  for (let i = 0; i < previous.length; i++) {
    const score = jaccardSimilarity(candidate, previous[i]);
    if (score > max) {
      max = score;
      index = i;
    }
  }
  return { max, index };
}
