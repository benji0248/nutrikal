# SP-9 — Confiabilidad del motor (trust layer)

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [ ] hecho |
| **Dependencias** | SP-3, SP-5 |
| **Próximo** | — |

---

## Contexto

**Norte star:** si el presupuesto invisible falla, el usuario pierde confianza en todo el producto.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Hacer **confiable** el pipeline: IA → fuzzy match → portion engine → budget. Fallos graceful + UX honesta + tests.

---

## En scope

- Mejorar `fuzzyMatchIngredient` / fallbacks en `dishMatchService.ts`
- Ingredientes sin match: estrategia clara (omitir, sustituto, mensaje) — nunca plato roto
- `normalizeHydratedAiDishToBudget`: edge cases (0 kcal, macros absurdos, over budget)
- UX: copy cuando se ajustan porciones (“Ajusté las cantidades para tu objetivo de hoy”)
- Ampliar `scripts/smoke-ai.mjs` o crear smoke de hidratación
- Logging útil en dev (`chatFlowLog` pattern) para debug de budget miss

---

## NO hacer

- Rediseño UI mayor
- Cambiar arquitectura IA/motor
- DB USDA

---

## Archivos en scope

```
src/services/dishMatchService.ts
src/services/dishResolverService.ts
src/services/portionEngine.ts
src/services/portionRounding.ts
src/data/ingredients.ts
scripts/smoke-ai.mjs
scripts/test-week-plan-v2.mjs   (budget assertions si aplica)
```

---

## Criterios de aceptación

- [ ] Umbral de acierto definido (ej. ≥90% platos de prueba dentro de ±10% del slot budget) — documentado en handoff
- [ ] Ingredientes desconocidos: fallback graceful, no crash, no 0 kcal total silencioso
- [ ] Smoke script pasa o deja instrucciones claras de env
- [ ] Copy de ajuste visible cuando el motor escala porciones
- [ ] `npm run build` pasa

---

## Casos de prueba sugeridos

1. Plato con ingrediente raro / typo de Gemini → fallback
2. Plato inicialmente 150% del budget → normalizado a ~100%
3. Plato con solo “volume” veggies → kcal mínima razonable
4. Week plan cell budgets vs daily total

---

## Al terminar

1. `npm run build`
2. Correr smoke scripts documentados
3. Commit: `fix(engine): SP-9 portion trust layer and smoke tests`
4. Push + actualizar `PRODUCT_PLAN.md` + handoff con % acierto

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | — |
| **Umbral acierto medido** | — |
| **Qué quedó hecho** | — |
| **Desviaciones** | — |
| **Deuda técnica** | — |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-9-confiabilidad-motor.md y ejecutalo. Priorizá tests y fallbacks, no UI polish.
```
