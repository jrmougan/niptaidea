const SEEN_KEY = "niptaidea_seen";
const SEEN_LIMIT = 20;

export function getSeenConcepts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addSeenConcept(concept: string): void {
  try {
    const seen = getSeenConcepts().filter((c) => c !== concept);
    localStorage.setItem(SEEN_KEY, JSON.stringify([concept, ...seen].slice(0, SEEN_LIMIT)));
  } catch {}
}
