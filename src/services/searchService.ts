const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const JWT_KEY = 'nutrikal-jwt';

interface SearchResult {
  dishName: string;
  similarity: number;
  ingredients: string;
  mealType: string;
}

export async function searchDishes(
  query: string,
  limit = 10,
): Promise<SearchResult[]> {
  const token = localStorage.getItem(JWT_KEY);
  if (!token) return [];

  const res = await fetch(`${BASE_URL}/api/ai/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, limit }),
  });

  if (!res.ok) return [];

  const data = await res.json() as { results?: SearchResult[] };
  return data.results ?? [];
}
