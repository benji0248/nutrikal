# SP-3 — Flujo E2E: “No sé qué cocinar ahora”

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [x] hecho |
| **Dependencias** | SP-1, SP-2 |
| **Próximo** | SP-4 |

---

## Contexto

**Norte star:** el journey más importante — pedir comida y que quede aplicada sin fricción.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Cerrar el flujo completo: **chip o mensaje → plato generado → aplicar al calendario**, en ≤3 interacciones desde el chip “No sé qué cocinar ahora”.

---

## En scope

- Inferir `mealType` por hora (`getCurrentMealType`) — saltar chip de “¿qué comida?” cuando hay inferencia clara
- Reducir pasos entre `start_cook_now` y `DishCard` visible
- `handleApplyDish`: confirmación clara + chip “Ver en calendario” (`go_calendar`)
- Regenerar plato (`handleRegenerateDish`) sin perder meal type / contexto
- Normalizar plato al budget del slot (`normalizeHydratedAiDishToBudget`)
- Loading state claro (`CookingLoader`) sin dead-ends

---

## NO hacer

- Plan semanal (SP-5)
- Onboarding (SP-4)
- Cambios grandes en prompts (solo ajustes mínimos si bloquean JSON/dish)
- Historial semántico

---

## Archivos en scope

```
src/components/assistant/useChatEngine.ts
src/components/assistant/ChatAssistant.tsx
src/components/assistant/DishCard.tsx
src/components/assistant/CookingLoader.tsx
src/services/dishMatchService.ts
src/services/aiService.ts
src/utils/mealTimeHelpers.ts
api/ai/gemini.ts          (solo si hace falta)
```

---

## Referencia técnica

Flujo actual en `useChatEngine.ts`:
- `buildWelcomeOptions()` → `start_cook_now`
- `buildMealTypeOptions()` → `pick_meal_type` → `generateDishForMealType()`
- `handleApplyDish()` → `useCalendarStore.addMeal()`

Budget: `getMealSlotBudget(computeMetabolism(profile).budget, mealType)`

---

## Criterios de aceptación

- [x] Desde chip “No sé qué cocinar ahora” hasta DishCard: **≤3 taps/interacciones** (ideal: 1 si inferencia horaria funciona)
- [x] Apply agrega comida al **día correcto** y **meal type** correcto
- [x] Plato respeta budget del slot (documentar tolerancia, ej. ±10% kcal)
- [x] Regenerar produce plato distinto (rotación básica) sin romper slot
- [x] Post-apply: feedback + opción ir al calendario
- [x] `npm run build` pasa

---

## Smoke manual

1. 12:00 local → “No sé qué cocinar” → debería inferir almuerzo
2. Apply → verificar en DayView
3. Regenerar 2 veces → platos distintos, mismo slot budget aprox.
4. Probar con `showCalories: false` (SP-1)

---

## Al terminar

1. `npm run build`
2. Commit: `feat(assistant): SP-3 cook-now E2E flow`
3. Push + actualizar `PRODUCT_PLAN.md` + handoff

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | feat(assistant): SP-3 cook-now E2E flow |
| **Qué quedó hecho** | Inferencia horaria en `start_cook_now` (salta picker si hay meal type); apply directo a hoy+slot en `DishCard`; post-apply con chip `go_calendar`; errores de generación con opciones de retorno; normalización budget ya existente |
| **Tolerancia budget documentada** | ±8% kcal (`CALORIE_TOLERANCE` en `dishMatchService.ts`) |
| **Desviaciones** | Tolerancia real es ±8%, no ±10% del ejemplo en criterios |
| **Deuda técnica** | Sin picker de fecha cuando meal type está inferido (apply siempre a hoy) |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-3-cocinar-ahora.md y ejecutalo. SP-1 y SP-2 deben estar hechos. Enfocate solo en el flujo de un plato.
```
