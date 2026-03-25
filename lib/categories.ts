/**
 * Category definitions for concept generation.
 * Add a new entry here to include it everywhere: weighted random pick,
 * init prompt, and chat system prompt.
 */
export interface CategoryDef {
  weight: number;
  description: string; // used in the generation prompt
}

export const CATEGORIES: Record<string, CategoryDef> = {
  Película:  { weight: 15, description: "largometrajes de cualquier género y época" },
  Serie:     { weight: 15, description: "series de televisión, streaming o anime" },
  Canción:   { weight: 15, description: "canciones o temas musicales de cualquier género" },
  Personaje: { weight: 20, description: "personas reales o personajes ficticios de cualquier época o medio" },
  País:      { weight: 15, description: "países o naciones del mundo" },
  Animal:    { weight: 10, description: "especies animales reales o míticas" },
  Plato:     { weight: 10, description: "platos, comidas o bebidas del mundo" },
};

/** Weighted random category pick */
export function pickCategory(): string {
  const total = Object.values(CATEGORIES).reduce((a, b) => a + b.weight, 0);
  let roll = Math.random() * total;
  for (const [name, { weight }] of Object.entries(CATEGORIES)) {
    roll -= weight;
    if (roll <= 0) return name;
  }
  return Object.keys(CATEGORIES)[0];
}

/**
 * Returns the category list formatted for prompts.
 * e.g. "CATEGORÍA: Persona", "CATEGORÍA: Lugar", ...
 */
export function categoryPromptList(): string {
  return Object.keys(CATEGORIES)
    .map((name) => `"CATEGORÍA: ${name}"`)
    .join(", ");
}
