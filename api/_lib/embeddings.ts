import { GeminiEmbeddingGenerator } from './ai/geminiEmbeddingGenerator.js';
import type { EmbeddingGenerator } from './ai/types.js';

const defaultEmbeddingGenerator = new GeminiEmbeddingGenerator();

/**
 * Generate a 768-dim embedding for a dish using Gemini text-embedding-004.
 * Input string: "dish name | ingredient1, ingredient2, ..."
 */
export async function generateDishEmbedding(
  dishName: string,
  ingredients: Array<{ name: string }>,
  generator: EmbeddingGenerator = defaultEmbeddingGenerator,
): Promise<number[]> {
  const text = `${dishName} | ${ingredients.map((i) => i.name).join(', ')}`;
  const result = await generator.embed({
    model: 'text-embedding-004',
    inputs: [text],
    dimensions: 768,
  });
  const vector = result.vectors[0];
  if (!vector) throw new Error('Embedding provider returned no vector');
  return vector;
}
