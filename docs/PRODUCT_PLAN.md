# NutriKal — Plan de producto

Índice y handoff global.  
**Detalle de cada sub-plan:** [`docs/sp/`](sp/README.md)

Para ejecutar trabajo: leé **solo** el archivo del SP asignado (ej. `docs/sp/SP-1-modo-simple.md`).

---

## Norte star

> **NutriKal = un presupuesto energético personal que habla en platos.**

El usuario delega qué comer. El motor local controla déficit/superávit y macros. Los números son opt-in, no el default.

---

## Principios no negociables

1. **Prescripción > registro** — default: te dicen qué comer; no registrar todo manualmente.
2. **Plato > caloría** — unidad cultural (porciones humanas), no kcal en pantalla por defecto.
3. **Motor local > LLM** — Gemini/DeepSeek cocina; `portionEngine` + `metabolicService` calculan.
4. **Modo Simple por defecto** — `showCalories: false`, `useGrams: false`.
5. **Feedback cualitativo** — energía del día (verde/ámbar/naranja), nunca culpa ni rojo.
6. **Desvíos absorbidos** — flex days, swap, rescue; no castigo moral.

---

## Fuera de alcance (fase actual)

- Historial semántico / embeddings en UI
- DB global USDA / OpenFoodFacts
- Rediseño visual completo “Living Journal”
- Multi-idioma
- B2B / nutricionistas humanos en plataforma

---

## Modos de producto (objetivo)

| Modo | Usuario | Experiencia |
|------|---------|-------------|
| **Simple** (default) | Delegador | “Comé esto”, porciones humanas, colores de energía |
| **Guided** | Quien quiere entender | + contexto breve (“plato contundente para tu almuerzo”) |
| **Pro** (opt-in) | Tracker | kcal, gramos, macros, calculadora |

---

## Mapa de sub-planes

| SP | Nombre | Archivo | Estado |
|----|--------|---------|--------|
| SP-0 | Handoff doc | [sp/SP-0-handoff.md](sp/SP-0-handoff.md) | [x] hecho |
| SP-1 | Modo Simple | [sp/SP-1-modo-simple.md](sp/SP-1-modo-simple.md) | [x] hecho |
| SP-2 | Chat como home | [sp/SP-2-chat-home.md](sp/SP-2-chat-home.md) | [x] hecho |
| SP-3 | Cocinar ahora E2E | [sp/SP-3-cocinar-ahora.md](sp/SP-3-cocinar-ahora.md) | [x] hecho |
| SP-4 | Onboarding mínimo | [sp/SP-4-onboarding-minimo.md](sp/SP-4-onboarding-minimo.md) | [x] hecho |
| SP-5 | Plan semanal | [sp/SP-5-plan-semanal.md](sp/SP-5-plan-semanal.md) | [x] hecho |
| SP-6 | Desvíos + rescue | [sp/SP-6-desvios-rescue.md](sp/SP-6-desvios-rescue.md) | [ ] |
| SP-7 | Personalización visible | [sp/SP-7-personalizacion-visible.md](sp/SP-7-personalizacion-visible.md) | [ ] |
| SP-8 | Modo Pro | [sp/SP-8-modo-pro.md](sp/SP-8-modo-pro.md) | [ ] |
| SP-9 | Confiabilidad motor | [sp/SP-9-confiabilidad-motor.md](sp/SP-9-confiabilidad-motor.md) | [ ] |

**Orden:** SP-0 → SP-1 → SP-2 → SP-3 → SP-4 → SP-5 → SP-6 → SP-7. SP-8 tras SP-1. SP-9 tras SP-3/SP-5.

---

## Handoff entre sesiones

_Completar al cerrar cada sub-plan (también en el handoff del SP correspondiente)._

| Campo | Valor |
|-------|-------|
| **Último SP completado** | SP-5 |
| **Commit** | feat(planner): SP-5 delegated week plan flow |
| **Qué quedó hecho** | Flujo delegado: chip → review grid → apply (calendario + shopping) → confirmación + CTA; persistencia batch; defaults inteligentes flex weekend |
| **Desviaciones del plan** | Smoke test week-plan requiere `.env.local` con Supabase + GEMINI (no ejecutado en CI cloud) |
| **Deuda técnica** | Wizard week planning sigue en 4 pasos (no auto-skip) |
| **Smoke / build** | `npm run build` OK; `node scripts/test-week-plan-v2.mjs` requiere credenciales locales |
| **Siguiente SP recomendado** | SP-6 |

---

## Referencias

- [`docs/sp/README.md`](sp/README.md) — índice de sub-planes
- `AI_MODULE.md` — arquitectura IA
- `DESIGN.md` — design system
- `docs/ROADMAP_AI.md` — roadmap IA (fase futura)
- `docs/architecture/04_motor_calculo_macros.md` — portion engine

---

## Changelog del plan

| Fecha | Cambio |
|-------|--------|
| 2026-07-14 | Creación inicial (SP-0) |
| 2026-07-14 | SP-0 completado: archivos individuales en `docs/sp/` |
| 2026-07-14 | SP-1 completado: Modo Simple (ocultar kcal, labels cualitativos, porciones humanas) |
| 2026-07-14 | SP-1 mergeado a `master` |
| 2026-07-14 | SP-2 completado e integrado sobre `master` |
| 2026-07-14 | SP-3 completado: flujo E2E cocinar ahora (inferencia horaria, apply directo, go_calendar) |
| 2026-07-14 | SP-5 completado: flujo delegado plan semanal (apply → calendario + shopping + CTA) |
