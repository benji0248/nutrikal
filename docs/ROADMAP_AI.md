# Roadmap — Asistente Nutri (IA)

Documento vivo: define **canasta semanal**, evolución del chat y el vínculo con **embeddings** en Supabase.

## Estado actual (hecho)

### Prompt en tres capas

| Bloque | Archivo | Rol |
|--------|---------|-----|
| Perfil + voz | [`api/ai/chat.ts`](../api/ai/chat.ts) `buildPersonalizedPrompt` | Datos del usuario, voseo/tuteo |
| Reglas fijas | [`api/_lib/gemini.ts`](../api/_lib/gemini.ts) | `SYSTEM_RULES_CORE`, `WEEK_FLOW_RULES`, `GENERAL_ASSISTANT_RULES` |
| Contexto del turno | [`api/ai/chat.ts`](../api/ai/chat.ts) | Fechas, preferencias, historial de platos, **ingredientes** |

### Dos fuentes de IDs (sin “doble pool” ambiguo)

- **CANASTA_SEMANAL** — única fuente para la acción **`week_plan`**. Tamaño fijo documentado en código (`WEEKLY_POOL_COUNTS`).
- **CATALOGO_AMPLIO** — ingredientes filtrados por perfil para **`suggest_meals`**, **`add_meal`**, **`swap_meal`**.

### Canasta semanal: tamaños

Definidos en [`src/services/ingredientSelectionService.ts`](../src/services/ingredientSelectionService.ts) como **`WEEKLY_POOL_COUNTS`**:

| Banda | Cantidad de IDs | Rol aproximado |
|-------|-----------------|----------------|
| Estructurales | 10 | bases, proteínas “fuertes”, cosas de compra grande |
| Contextuales | 20 | verduras, lácteos, frutas, acompañamientos |
| Creativos | 14 | ultraprocesados opcionales, toques, indulgencia |
| **Total** | **44** | — |

Rotación:

- **Semana ISO** (`weekId`) → shuffle determinista.
- **Semilla de historial** (`buildPoolPersonalizationSeed`) → variación según platos frecuentes en el calendario (sin API extra).

## Próximos pasos sugeridos

### Fase A — Comportamiento del chat (sin vector)

- Router de **intención** explícito (semana vs día vs rescate) y prompts más cortos por modo.
- Más **acciones** con esquema claro (`batch_cook`, lista de compras desde plan, etc.) donde tenga sentido en la UI.

### Fase B — Personalización con `dish_embeddings`

Objetivo: **bajar recetas repetidas** y acercar la canasta a lo que el usuario ya come o quiere variar.

1. **Consulta previa al armado del pool** (servidor o cliente autenticado):
   - Obtener últimos N embeddings del usuario (`find_similar_dishes` o tabla ordenada por fecha).
   - Opciones:
     - **Exclusión suave:** penalizar ingredientes que aparecen en platos con alto “count” semanal.
     - **Diversidad:** para cada ingrediente “estrella” de la semana pasada, empujar otras categorías en la canasta actual.
2. **Sincronizar con la canasta:** seguir usando `WEEKLY_POOL_COUNTS` como techo; la lógica vectorial elige **cuáles** IDs entran dentro de cada banda (sustituyendo el shuffle puro).
3. **Costo/latencia:** cachear resultado del pool por `{ userId, weekId }`; invalidar al cambiar perfil o al marcar muchos platos nuevos.

### Fase C — Historial (módulo producto)

- Búsqueda semántica en UI con [`api/ai/search.ts`](../api/ai/search.ts).
- Feedback loop: más datos en embeddings → mejor personalización en Gemini.

## Métricas de éxito (cuando midan)

- Variedad de **nombres de plato** por semana sin chocar con restricciones.
- Menos IDs repetidos en la misma semana dentro de `week_plan`.
- Tasa de “cambiame esto” por aburrimiento (si lo registran).

## Referencias

- Embeddings: [`api/_lib/embeddings.ts`](../api/_lib/embeddings.ts), [`api/ai/embed.ts`](../api/ai/embed.ts), [`api/ai/search.ts`](../api/ai/search.ts).
- Motor local: [`src/services/portionEngine.ts`](../src/services/portionEngine.ts).
