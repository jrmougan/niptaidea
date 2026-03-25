import type { Score } from "@/lib/db";

/**
 * Fetch the scoreboard for a given difficulty from the internal API.
 * Returns an empty array on any error (network, non-OK response, parse failure).
 */
export async function fetchScores(difficulty: string): Promise<Score[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/scores?difficulty=${difficulty}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
