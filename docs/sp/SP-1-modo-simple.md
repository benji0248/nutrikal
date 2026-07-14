# SP-1 — Modo Simple: contar sin contar

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [x] hecho |
| **Dependencias** | SP-0 |
| **Próximo** | SP-2 |

---

## Contexto

**Norte star:** presupuesto energético personal que habla en platos.  
El usuario no debe *sentir* que está contando calorías; el motor lo hace invisible.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Que la app se sienta como **delegación** (nutri/chef te dice qué comer), no como tracker clínico. Por defecto: porciones humanas, feedback cualitativo, cero números obligatorios.

---

## En scope

- Copy en tarjetas de plato, burbujas de chat, tokens journal
- Labels cualitativos según % del slot: **liviano / balanceado / contundente**
- `DayEnergyBar`: verde / ámbar / naranja — nunca rojo, nunca tono punitivo
- Ocultar kcal y macros en calendar/planner/DishCard cuando `showCalories === false`
- Confirmar defaults: `showCalories: false`, `useGrams: false` (auth, settings, onboarding)
- Porciones humanas **antes** que gramos en UI (`humanPortion`, `portionHelpers`)

---

## NO hacer

- Cambiar `portionEngine`, `metabolicService`, offsets de déficit/superávit
- Modificar prompts de Gemini/DeepSeek
- Onboarding conversacional
- Rediseño visual completo (DESIGN.md)
- Plan semanal

---

## Archivos en scope

```
src/components/assistant/DishCard.tsx
src/components/assistant/journalTokens.ts
src/components/assistant/DayEnergyBar.tsx
src/components/assistant/ChatMessageBubble.tsx
src/components/planner/PlanMealCell.tsx
src/components/planner/PlanReviewGrid.tsx
src/components/calendar/DayView.tsx
src/components/calendar/DaySummaryCard.tsx
src/store/useSettingsStore.ts
src/utils/portionHelpers.ts
```

Máx. ampliar solo si hace falta para ocultar números en otro componente visible en flujo default.

---

## Referencia técnica

- `getEnergyLevel()` en `metabolicService.ts` — ya evita rojo; reforzar en UI
- `showCalories` / `useGrams` en `useSettingsStore`
- `buildHumanIngredients()` / `humanPortion` en `dishMatchService`

---

## Criterios de aceptación

- [x] Usuario con settings default **no ve kcal** en: chat (DishCard), calendario día, planner review
- [x] Cada plato muestra porciones humanas como unidad principal (“2 huevos”, “1 filete mediano”)
- [x] Existe label cualitativo de “peso” del plato (liviano/balanceado/contundente) o equivalente claro
- [x] Barra de energía del día es cualitativa (sin números salvo Modo Pro)
- [x] `npm run build` pasa
- [x] `npx tsc --noEmit` pasa

---

## Smoke manual

1. Login → settings sin tocar → pedir plato en chat
2. Verificar DishCard sin kcal
3. Aplicar al calendario → DayView sin kcal
4. Activar “Ver calorías” en settings → números aparecen (no romper Modo Pro futuro)

---

## Al terminar

1. `npm run build`
2. Commit: `feat(ux): SP-1 modo simple — hide calories by default`
3. Push
4. Marcar SP-1 hecho en `PRODUCT_PLAN.md`
5. Completar handoff abajo

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | 45196f7 |
| **Qué quedó hecho** | Modo Simple en UI: kcal ocultas por default; badges liviano/balanceado/contundente en DishCard y PlanMealCell; `DayEnergyBar` y `DaySummaryCard` cualitativos (verde/ámbar/naranja); porciones humanas en planner expandido y MealSlot AI; tokens `ENERGY_BAR` / `MEAL_WEIGHT_BADGE`; helpers `getMealWeightLabel`, `formatNamedIngredientPortion`; defaults reforzados en `useSettingsStore`. |
| **Desviaciones** | Se tocó `MealSlot.tsx` (porciones AI) fuera de la lista explícita del SP — necesario para criterio de porciones humanas en calendario. |
| **Deuda técnica** | `useChatEngine` sigue devolviendo `energyLevel`/`energyRatio` stub para el chat general; el resumen diario en burbuja usa `daySummary.energyLevel` del mensaje. |

---

## Prompt para ventana nueva

```
Leé docs/PRODUCT_PLAN.md (solo principios) y docs/sp/SP-1-modo-simple.md. Ejecutá SP-1 completo. No toques otros SPs.
```
