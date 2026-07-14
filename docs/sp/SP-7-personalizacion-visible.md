# SP-7 — Personalización visible (memoria)

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [ ] hecho |
| **Dependencias** | SP-3, SP-5 |
| **Próximo** | SP-8 o SP-9 |

---

## Contexto

**Norte star:** el usuario debe *sentir* “me conoce”, no solo tener lógica invisible debajo.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Surfacear en **copy y UI** la memoria que ya existe: rotación de platos, rechazos, dislikes, historial reciente.

---

## En scope

- Usar `planRotationMemory`, `usePlanRotationStore`, `useIngredientSignalStore`
- Copy en sugerencias de plato/semana:
  - “Como la semana pasada te gustó…”
  - “Evité [ingrediente] porque no te gusta”
  - “Varié la proteína para no repetir…”
- Al regenerar: explicar brevemente por qué el nuevo plato es distinto
- Pasar contexto de memoria a prompts week-plan si no está ya (`weekPlanPrompts.ts`, `planMemory.ts`)
- Evitar repetir nombres de platos recientes (hacer visible lo que el backend ya intenta)

---

## NO hacer

- UI de historial semántico / búsqueda vectorial
- Embeddings en frontend
- Perfil psicológico / ML nuevo

---

## Archivos en scope

```
src/services/planRotationMemory.ts
src/store/usePlanRotationStore.ts
src/store/useIngredientSignalStore.ts
src/services/signalLogService.ts
api/_lib/planMemory.ts
api/_lib/weekPlanPrompts.ts
src/components/assistant/useChatEngine.ts
src/components/assistant/DishCard.tsx
```

---

## Criterios de aceptación

- [ ] Al sugerir plato o semana, ≥1 línea de copy personalizada (memoria explícita)
- [ ] Regenerar plato evita nombre reciente Y lo comunica al usuario
- [ ] Dislikes del perfil se reflejan en copy cuando se evita un ingrediente
- [ ] `npm run build` pasa

---

## Smoke manual

1. Aplicar 2 platos similares → pedir otro → ver mensaje de variedad
2. Perfil con dislike “cebolla” → plato sin cebolla menciona evitación (si aplica)

---

## Al terminar

1. `npm run build`
2. Commit: `feat(personalization): SP-7 visible memory in copy`
3. Push + actualizar `PRODUCT_PLAN.md` + handoff

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | — |
| **Qué quedó hecho** | — |
| **Desviaciones** | — |
| **Deuda técnica** | — |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-7-personalizacion-visible.md y ejecutalo. Solo copy/memoria visible, no embeddings UI.
```
