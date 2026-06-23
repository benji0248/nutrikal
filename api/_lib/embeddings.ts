import { getGeminiClient } from './gemini.js';

/**
 * Generate a 768-dim embedding for a dish using Gemini text-embedding-004.
 * Input string: "dish name | ingredient1, ingredient2, ..."
 */
export async function generateDishEmbedding(
  dishName: string,
  ingredients: Array<{ name: string }>,
): Promise<number[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const text = `${dishName} | ${ingredients.map((i) => i.name).join(', ')}`;
  const result = await model.embedContent(text);

  return result.embedding.values;
}
