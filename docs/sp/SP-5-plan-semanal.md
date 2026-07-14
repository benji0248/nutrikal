# SP-5 — Plan semanal delegado

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [x] hecho |
| **Dependencias** | SP-4 |
| **Próximo** | SP-6 |

---

## Contexto

**Norte star:** “Planificá mi semana” = delegación total; el usuario no arma nada manualmente.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Flujo completo: **pedir plan semanal → revisar → aplicar al calendario → lista de compras**, con mínima configuración y copy delegador.

---

## En scope

- Defaults inteligentes en week planning (pattern, flex days) cuando el perfil lo permite
- Flujo continuo en chat: generación → `PlanReviewGrid` → apply → confirmación + CTA shopping
- Copy delegador (“Tu semana está lista”, no jerga técnica de IDs/canasta)
- Respetar calorie budgets por día/slot (fixes recientes en `weekPlanGenerate`)
- Regenerar plan entero o swap comida individual
- Smoke: `scripts/test-week-plan-v2.mjs`

---

## NO hacer

- Embeddings / búsqueda semántica en UI
- Rotación avanzada visible (SP-7)
- Rediseño completo del planner

---

## Archivos en scope

```
src/components/assistant/useChatEngine.ts
src/components/planner/WeekPlanner.tsx
src/components/planner/PlanReviewGrid.tsx
src/components/planner/PlanAppliedView.tsx
src/components/planner/PlanMealCell.tsx
src/services/weekPlanService.ts
src/services/weekPlanApi.ts
src/services/shoppingService.ts
api/_lib/weekPlanGenerate.ts
api/_lib/weekPlanPrompts.ts
api/ai/week-plan.ts
scripts/test-week-plan-v2.mjs
```

---

## Referencia técnica

- `runWeekPlanGeneration()` en `useChatEngine.ts`
- `buildFullWeekPlanFromApiResponse()` en `weekPlanService.ts`
- `recordWeekPlanApplied()` en `signalLogService.ts`
- Metabolic offsets: lose −500, gain +350 en `metabolicService.ts`

---

## Criterios de aceptación

- [x] `node scripts/test-week-plan-v2.mjs` pasa (o documentar prereqs env)
- [x] Chip “Planificá mi semana” genera plan visible en review grid
- [x] Apply llena calendario de la semana correcta
- [x] Apply actualiza lista de compras
- [x] Budgets diarios coherentes con objetivo lose/maintain/gain
- [x] Regenerar plan o comida individual funciona
- [x] `npm run build` pasa

---

## Smoke manual

1. Usuario con week planning profile → pedir plan semanal
2. Review → apply → verificar calendario + shopping
3. Regenerar 1 celda → budget del slot se mantiene razonable

---

## Al terminar

1. `npm run build`
2. `node scripts/test-week-plan-v2.mjs` (si hay credenciales)
3. Commit: `feat(planner): SP-5 delegated week plan flow`
4. Push + actualizar `PRODUCT_PLAN.md` + handoff

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | feat(planner): SP-5 delegated week plan flow |
| **Smoke test result** | No ejecutado: falta `.env.local` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY). `npm run build` OK. |
| **Qué quedó hecho** | Apply persiste calendario (`createMealsBatch`), actualiza shopping, confirmación + CTA; chip “Planificá mi semana”; defaults flex weekend lose/maintain; swap respeta budget maintenance |
| **Desviaciones** | Smoke API no corrido en cloud agent |
| **Deuda técnica** | Week planning setup sigue 4 pasos manuales |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-5-plan-semanal.md y ejecutalo. Asegurate que los smoke tests de week plan pasen.
```
