/**
 * Simple similarity score between two strings (0–1).
 * Uses bigram overlap (Dice coefficient).
 */
export function similarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };

  const setA = bigrams(na);
  const setB = bigrams(nb);
  let intersection = 0;
  setA.forEach((bg) => { if (setB.has(bg)) intersection++; });

  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Find best match from a list of candidates for a given name.
 * Returns the candidate and score, or null if below threshold.
 */
export function findBestMatch(
  name: string,
  candidates: string[],
  threshold = 0.4,
): { match: string; score: number } | null {
  let best: { match: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = similarity(name, candidate);
    if (score >= threshold && (!best || score > best.score)) {
      best = { match: candidate, score };
    }
  }

  // Also check if the name is a substring or vice-versa
  const lower = name.toLowerCase().trim();
  for (const candidate of candidates) {
    const cl = candidate.toLowerCase().trim();
    if (cl.includes(lower) || lower.includes(cl)) {
      const score = Math.max(0.7, best?.score ?? 0);
      if (!best || score > best.score) {
        best = { match: candidate, score };
      }
    }
  }

  return best;
}
