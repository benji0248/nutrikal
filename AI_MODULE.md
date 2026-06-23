# NutriKal — AI Module Context
# Handoff file: decisiones, arquitectura, estado actual, próximos pasos.

---

## Strategic Decisions (esta sesión)

### Producto
- **Modelo de negocio:** Freemium B2C
- **Plataforma global:** no hardcodeada a Argentina. Alemán = cocina alemana.
- **IA sola maneja cultura:** Gemini conoce cocinas del mundo. Solo necesita nacionalidad.
- **Escalamiento:** 1 plato → 1 día → 1 semana (MVP actual: 1 plato)

### Arquitectura
- **IA es cocinera, motor local es nutricionista.** La IA nunca ve calorías ni calcula macros.
- **System prompt mínimo (~100 tokens):** jerga, nacionalidad, restricciones. Nada más.
- **JSON estructurado:** Gemini devuelve plato en JSON, el frontend hidrata (fuzzy match, macros, porciones).
- **Backend flaco, frontend musculoso:** el backend solo inyecta system prompt + llama a Gemini. El frontend tiene la DB de ingredientes y hace todo el procesamiento.
- **Embeddings para rotación futura:** cada ingrediente tendrá embedding 768-dim. Rotación = nearest neighbors en espacio de embeddings.

### No hacemos ahora (fase 2+)
- DB semilla global (USDA/OpenFoodFacts ~8000 ingredientes)
- Embeddings para rotación de ingredientes
- Favoritos / historial / dislikes implícitos
- Plan semanal
- Otros idiomas (solo español regional por ahora: ar, co, mx, cl, pe, uy, ve, es)

---

## Implementado en esta sesión

### Archivos modificados/creados

| Archivo | Cambio |
|---|---|
| `api/_lib/gemini.ts` | + `buildSystemPrompt(profile)` + `JERGA_MAP` (8 variantes español) |
| `api/ai/gemini.ts` | Rewrite: fetch perfil de Supabase, system prompt dinámico, Gemini `startChat` con `systemInstruction`, `responseMimeType: application/json`, devuelve `dish` parseado |
| `src/types/index.ts` | Nuevos: `AiDishResponse`, `HydratedAiDish`, `HydratedAiIngredient`, `'assistant-dish'` en ChatMessageType, `dishSuggestion` en ChatMessage |
| `src/services/aiService.ts` | `SendMessageResult` ahora tiene `dish?` opcional |
| `src/services/dishMatchService.ts` | + `hydrateAiDish()` + `fuzzyMatchIngredient()` |
| `src/components/assistant/DishCard.tsx` | **NUEVO** — tarjeta de plato con ingredientes, prep, tip, botones |
| `src/components/assistant/useChatEngine.ts` | Si `result.dish` existe → hidrata → mensaje `assistant-dish` |
| `src/components/assistant/ChatMessageBubble.tsx` | + case `assistant-dish` → renderiza DishCard |

### System prompt que recibe Gemini
```
Sos un chef práctico y cálido. {jerga_segun_nacionalidad}.
El usuario es de nacionalidad {codigo}. Cociná platos típicos de esa cultura.
{si restricciones: Tiene restricciones alimentarias: {lista}.}

Respondé ÚNICAMENTE con este JSON y nada más:
{
  "nombre": "...",
  "ingredientes": [
    { "nombre": "...", "rol": "proteina|base|vegetal|grasa|lacteo|aromatico|liquido|toque", "gramos": 200 }
  ],
  "preparacion": "...",
  "tiempo_prep": 25,
  "tip": "..."
}
```

### Flujo completo
```
Usuario: "almuerzo con pollo y papas"
  → POST /api/ai/gemini
    → auth + rate limit
    → fetchProfile(userId) de Supabase user_data
    → buildSystemPrompt(nacionalidad, restricciones)
    → model.startChat({ systemInstruction, history })
    → chat.sendMessage(mensaje)
    → Gemini JSON mode → JSON parseado
    → { dish: AiDishResponse, text, remaining }
  → Frontend receive
    → hydrateAiDish(dish)
      → fuzzy match ingredientes contra INGREDIENTS_DB (287 items)
      → calcular macros (gramos × datos/100g)
      → convertir a porción humana ("300g" → "2 papas")
    → mensaje assistant-dish con HydratedAiDish
    → DishCard renderizada
```

---

## Stack

- React 19 + TypeScript (strict)
- Vite 8 (bundler)
- Tailwind CSS 3
- Zustand 5 (state — with persist middleware)
- date-fns 4 (all date operations)
- lucide-react (icons)
- clsx + tailwind-merge
- @google/generative-ai (Gemini AI — ONLY in `api/_lib/gemini.ts` and `api/_lib/embeddings.ts`)
- pgvector (Supabase extension — dish embeddings for semantic search)
- Fonts: @fontsource/plus-jakarta-sans, @fontsource/jetbrains-mono

## Commands

```bash
npm run dev          # local dev server (Vite)
npm run build        # tsc -b && vite build → dist/
npm run lint         # ESLint check
npm run preview      # preview production build locally
npx tsc --noEmit     # type check without building (run before every commit)
```

---

## Estado actual

- **Rama:** `dev` (pusheado)
- **Build:** ✅ pasa (`npx tsc --noEmit` y `npm run build` sin errores)
- **Testing:** El endpoint Gemini estaba dando 500. Último fix: `startChat` + `systemInstruction`. **Pendiente verificar si funciona en Vercel.**
- **Si sigue fallando:** revisar logs de Vercel Functions → `api/ai/gemini`. Posibles causas adicionales:
  - `responseMimeType: 'application/json'` no soportado → probar sin él (quitar y volver a texto libre)
  - Tabla `user_data` no existe o columnas distintas
  - `GEMINI_API_KEY` no configurada en Vercel

---

## Próximos pasos (en orden)

### Inmediato (esta sesión o siguiente)
1. **Fix endpoint Gemini** si sigue con 500
2. **Testear en browser:** switch a Gemini, preguntar "almuerzo con pollo y papas"
3. **Verificar DishCard se renderiza** con ingredientes, prep, tip
4. **Wire botón "Agregar al calendario"** → crea un Meal en el store + llama a createMeal API
5. **Wire botón "Regenerar"** → vuelve a llamar a sendToAi con el mismo mensaje

### Fase 2: DB semilla global
1. Importar USDA/OpenFoodFacts (dataset público ~8000 alimentos)
2. Migrar `INGREDIENTS_DB` a Supabase (tabla `ingredients`)
3. Actualizar `fuzzyMatchIngredient()` para buscar en Supabase
4. Generar embeddings para cada ingrediente (text-embedding-004)
5. Tabla `ingredient_embeddings` en Supabase con pgvector

### Fase 3: Rotación por embeddings
1. Al generar plato, chequear si ingredientes se repitieron mucho
2. Buscar alternativas cercanas en espacio de embeddings
3. Sugerir rotación ("en vez de papa, probá batata")

### Fase 4: Plan semanal
1. Gemini genera 7 días con variedad estructural
2. Inyectar historial del vector DB para evitar repeticiones
3. Wire WeekPlanner con los nuevos DishCards

---

## Project Structure (relevante al módulo AI)

```
nutrikal/
├── api/
│   ├── _lib/
│   │   ├── supabase.ts           Supabase client (SUPABASE_SERVICE_ROLE_KEY)
│   │   ├── gemini.ts             Gemini AI client + buildSystemPrompt() + JERGA_MAP
│   │   ├── embeddings.ts         text-embedding-004 helper (768-dim)
│   │   └── rateLimit.ts          80 msgs/day per user
│   └── ai/
│       ├── chat.ts               DeepSeek endpoint (sin system prompt aún)
│       ├── gemini.ts             Gemini endpoint (system prompt + JSON mode)
│       ├── embed.ts              Store dish embeddings (fire-and-forget)
│       └── search.ts             Semantic dish search via pgvector
├── src/
│   ├── components/assistant/
│   │   ├── ChatAssistant.tsx     Main chat UI
│   │   ├── ChatMessageBubble.tsx Message renderer (switch por tipo)
│   │   ├── DishCard.tsx          NUEVO: tarjeta de plato AI
│   │   └── useChatEngine.ts      Lógica del chat + hydrateAiDish
│   ├── data/
│   │   ├── ingredients.ts        287 ingredientes argentinos, per 100g macros
│   │   └── ingredientPortions.ts Human-readable portion lookup table
│   ├── services/
│   │   ├── aiService.ts          sendMessage() → backend
│   │   ├── dishMatchService.ts   hydrateAiDish() + fuzzyMatchIngredient()
│   │   └── embeddingService.ts   Fire-and-forget dish embedding
│   ├── types/
│   │   └── index.ts              ALL types: AiDishResponse, HydratedAiDish, etc.
│   └── utils/
│       ├── macroHelpers.ts       computeMacrosForEntry, computeTotalMacros
│       └── portionHelpers.ts     gramsToHumanPortion
```

---

## Non-Negotiable Rules

### Code rules
1. **No `any`** — strict TypeScript always
2. **No inline styles** — Tailwind classes only (except dynamic width%)
3. **No raw Date arithmetic** — always use date-fns
4. **Named exports only** — `export const Foo = ...` + props interface
5. **All types in `src/types/index.ts`** — never in component files
6. **48px minimum touch targets**
7. **API isolation** — Gemini only in `api/_lib/gemini.ts`, Supabase only in `api/_lib/supabase.ts`

### Product rules
8. **Calories never shown** unless `showCalories` setting is on
9. **No red** — amber → warm orange, never red
10. **Human portions only** — "2 papas medianas", never "300g de papa"
11. **No "diet" language** — forbidden: dieta, restricción, prohibido, malo, culpa
12. **Jerga dinámica por nacionalidad del usuario**
