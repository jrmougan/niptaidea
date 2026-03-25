import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";
import { AI_MODEL, DIFFICULTY_PROMPTS, DEFAULT_DIFFICULTY } from "@/lib/constants";
import { CATEGORIES, pickCategory } from "@/lib/categories";
import { checkRateLimit } from "@/lib/ratelimit";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const RATE_LIMIT = 30;        // max games per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function getIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

export async function POST(req: Request): Promise<Response> {
  const ip = getIP(req);
  const { allowed, remaining } = checkRateLimit(ip, RATE_LIMIT, RATE_WINDOW);

  if (!allowed) {
    return Response.json(
      { error: "Demasiadas partidas. Vuelve en un rato." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  console.log(`[init] IP=${ip} remaining=${remaining}`);
  const body = await req.json().catch(() => ({}));
  const difficulty: string = body.difficulty ?? DEFAULT_DIFFICULTY;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[DEFAULT_DIFFICULTY];
  const seenConcepts: string[] = Array.isArray(body.seenConcepts) ? body.seenConcepts : [];
  const category = pickCategory();

  const avoidClause = seenConcepts.length > 0
    ? `\nConceptos ya vistos que NO puedes usar ni similares: ${seenConcepts.join(", ")}.`
    : "";

  const { text } = await generateText({
    model: openrouter(AI_MODEL),
    temperature: 1.1,
    prompt: `Eres el motor de un juego de adivinanzas para público hispanohablante.
Dificultad: ${difficultyPrompt}
Categoría: ${category} (${CATEGORIES[category].description})${avoidClause}

Elige UN concepto concreto de esa categoría. Sé creativo e impredecible, con variedad geográfica, temporal y temática. Evita los más obvios y populares.
Responde ÚNICAMENTE con el nombre canónico del concepto, sin explicaciones ni puntuación extra. Ejemplos: "Frida Kahlo", "Telescopio", "Entropía".`,
  });

  const concept = text.trim().replace(/^["']|["']$/g, "");

  console.log(`Chosen concept: ${concept} (${category})`);

  const token = await encryptConcept({ concept, category });
  return Response.json({ category, token });
}
