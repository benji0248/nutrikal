# SP-8 — Modo Pro (opt-in)

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [ ] hecho |
| **Dependencias** | SP-1 |
| **Próximo** | — (puede hacerse en paralelo tras SP-1) |

---

## Contexto

**Norte star:** mismos platos, distinta presentación. Power users ven números; delegadores no.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Modo Pro claro y opt-in: **ver calorías**, **usar gramos**, acceso a **calculadora** — sin contaminar Modo Simple.

---

## En scope

- Settings UI clara: toggles “Ver calorías” / “Usar gramos”
- Persistencia: `useSettingsStore` + `api.saveSettings` + Supabase
- Cuando `showCalories: true`: kcal/macros en DishCard, DayView, planner cells
- Cuando `useGrams: true`: porciones en gramos (`portionHelpers`, `buildHumanIngredients`)
- Calculadora (`CalorieCalculator`) accesible desde settings o menú — **no** en flujo default del chat
- Confirmar que defaults post-login siguen siendo Simple (SP-1)

---

## NO hacer

- Cambiar defaults a Pro
- Mostrar números sin toggle activo
- Eliminar Modo Simple

---

## Archivos en scope

```
src/store/useSettingsStore.ts
src/components/auth/UserMenu.tsx
src/App.tsx                    (settings tab si aplica)
src/components/assistant/DishCard.tsx
src/components/calendar/DayView.tsx
src/components/calendar/DaySummaryCard.tsx
src/components/planner/PlanMealCell.tsx
src/components/calculator/CalorieCalculator.tsx
src/services/apiService.ts
```

---

## Referencia técnica

- `showCalories`, `useGrams` en profile settings API
- SQL: `sql/002_add_use_grams.sql` si falla persistencia
- Auth hydrate: `useAuthStore` resetea defaults en registro

---

## Criterios de aceptación

- [ ] Toggles en settings funcionan y persisten tras reload
- [ ] Con toggles OFF: cero números (SP-1 intacto)
- [ ] Con toggles ON: kcal/macros/gramos visibles donde corresponde
- [ ] Calculadora accesible pero no prominente en flujo chat
- [ ] `npm run build` pasa

---

## Smoke manual

1. Default → sin números
2. Activar “Ver calorías” → números aparecen
3. Reload → setting persiste
4. Desactivar → vuelve Modo Simple

---

## Al terminar

1. `npm run build`
2. Commit: `feat(settings): SP-8 pro mode opt-in calories and grams`
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
Leé docs/sp/SP-8-modo-pro.md y ejecutalo. No cambies defaults del Modo Simple.
```
