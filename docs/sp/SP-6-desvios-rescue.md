# SP-6 — Desvíos: flex + rescue

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [ ] hecho |
| **Dependencias** | SP-5 |
| **Próximo** | SP-7 |

---

## Contexto

**Norte star:** sostenibilidad real — asados, pizza, “me pasé”. Absorber desvíos sin culpa.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Implementar flujo útil para **“Comí algo que no debía”** (`rescue_stub` hoy) y hacer **flex days** visibles y comprensibles en planner/calendario.

---

## En scope

- Reemplazar `rescue_stub` por flujo real en `useChatEngine.ts`:
  - Mensaje empático (no punitivo)
  - Opciones: “Ajustá el resto del día” / “Marcá hoy como flex” / “Seguí normal”
- Flex days: labels en planner (`flexDayHelpers`, `WEEKDAY_FLEX_MODE_LABELS`)
- Mínimo viable de rebalanceo: si comió de más, sugerir comidas más livianas en slots restantes (puede ser heurística local, no replan semanal completo)
- Integrar `signalLogService` donde aplique
- Copy alineado con SP-1 (sin rojo, sin “te pasaste”)

---

## NO hacer

- Replan semanal automático completo (v2)
- Tracking manual de “what I ate off-plan” con formulario largo
- Castigo / streak breaking

---

## Archivos en scope

```
src/components/assistant/useChatEngine.ts
src/components/assistant/ChatMessageBubble.tsx
src/utils/flexDayHelpers.ts
src/services/signalLogService.ts
src/services/metabolicService.ts
src/components/planner/PlanReviewGrid.tsx
src/components/calendar/DayView.tsx
src/types/index.ts  (si hace falta tipos rescue)
```

---

## Criterios de aceptación

- [ ] Chip “Comí algo que no debía” ejecuta flujo real (no stub / no dead-end)
- [ ] Flex days visibles en UI de planner o calendario
- [ ] Tono de copy no punitivo en todo el flujo rescue
- [ ] Al menos 1 acción concreta post-rescue (ajuste sugerido o marcar flex)
- [ ] `npm run build` pasa

---

## Smoke manual

1. Tap rescue → ver opciones → elegir una → ver resultado en chat/calendario
2. Semana con flex day configurado → label visible en planner

---

## Al terminar

1. `npm run build`
2. Commit: `feat(assistant): SP-6 rescue and flex day flow`
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
Leé docs/sp/SP-6-desvios-rescue.md y ejecutalo. Tono no punitivo obligatorio.
```
