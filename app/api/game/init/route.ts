import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { encryptConcept } from "@/lib/crypto";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export const runtime = "edge";

export async function POST(): Promise<Response> {
  const { text } = await generateText({
    model: openrouter("deepseek/deepseek-chat-v3-0324"),
    prompt: `Elige UN concepto secreto para el juego de las adivinanzas. Puede ser una PERSONA famosa, un OBJETO cotidiano o un CONCEPTO ABSTRACTO. Responde ÚNICAMENTE con este JSON y nada más:
{"concept":"<nombre del concepto>","category":"Persona|Objeto|Concepto"}`,
  });

  const match = text.match(/\{[^}]+\}/);
  if (!match) return Response.json({ error: "Failed to pick concept" }, { status: 500 });

  const { concept, category } = JSON.parse(match[0]) as { concept: string; category: string };
  const token = await encryptConcept({ concept, category });

  return Response.json({ category, token });
}
