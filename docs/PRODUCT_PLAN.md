# NutriKal — Plan de producto

Documento vivo para handoff entre sesiones de desarrollo.  
**Leer este archivo al inicio de cada ventana nueva** antes de tocar código.

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

En esta ola: **Simple sólido + puertas a Pro**. Guided es mostly copy/UX.

---

## Mapa de sub-planes

```
SP-0  Handoff doc (este archivo)          [ ]
SP-1  Modo Simple — UI/copy sin números   [ ]
SP-2  Chat como home                      [ ]
SP-3  Flujo E2E “¿Qué cocino ahora?”      [ ]
SP-4  Onboarding mínimo                   [ ]
SP-5  Plan semanal delegado               [ ]
SP-6  Desvíos: flex + rescue              [ ]
SP-7  Personalización visible (memoria)   [ ]
SP-8  Modo Pro + settings                 [ ]
SP-9  Confiabilidad del motor             [ ]
```

**Orden recomendado:** SP-0 → SP-1 → SP-2 → SP-3 → SP-4 → SP-5 → SP-6 → SP-7. SP-8 puede paralelizarse tras SP-1. SP-9 después de SP-3/SP-5.

---

## Handoff entre sesiones

_Completar al cerrar cada sub-plan._

| Campo | Valor |
|-------|-------|
| **Último SP completado** | — |
| **Commit** | — |
| **Qué quedó hecho** | — |
| **Desviaciones del plan** | — |
| **Deuda técnica** | — |
| **Smoke / build** | — |

---

## SP-0 — Documento de handoff

**Estado:** [ ] pendiente · [x] en progreso · [ ] hecho

**Objetivo:** Fuente de verdad para ventanas futuras.

**Entregables:**
- Este archivo (`docs/PRODUCT_PLAN.md`)
- Referencia cruzada breve en `AI_MODULE.md` (opcional)

**Criterios de aceptación:**
- [ ] Cualquier ventana nueva arranca leyendo solo este doc
- [ ] Sub-planes con scope y criterios claros

**Dependencias:** ninguna.

---

## SP-1 — Modo Simple: contar sin contar

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** La app se siente como delegación, no como tracker.

**En scope:**
- Copy en `DishCard`, burbujas de chat, tokens journal
- Labels cualitativos (liviano / balanceado / contundente)
- `DayEnergyBar` — feedback no punitivo
- Ocultar kcal/macros en calendar/planner salvo opt-in
- Confirmar defaults `showCalories: false`, `useGrams: false`

**Archivos probables:**
- `src/components/assistant/DishCard.tsx`
- `src/components/assistant/journalTokens.ts`
- `src/components/assistant/DayEnergyBar.tsx`
- `src/components/assistant/ChatMessageBubble.tsx`
- `src/components/planner/*`
- `src/components/calendar/DayView.tsx`
- `src/store/useSettingsStore.ts`

**NO hacer:** motor de cálculo, prompts IA, onboarding.

**Criterios de aceptación:**
- [ ] Usuario nuevo no ve kcal en flujo default
- [ ] Plato muestra porciones humanas primero
- [ ] Energía del día es cualitativa
- [ ] `npm run build` pasa

**Dependencias:** SP-0.

---

## SP-2 — Chat como home

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** Abrir la app = conversación.

**En scope:**
- Tab default: `assistant`
- Empty state calendario → CTA al chat
- Welcome message más directo

**Archivos probables:**
- `src/App.tsx`
- `src/components/calendar/WeekView.tsx`, `DayView.tsx`
- `src/components/assistant/useChatEngine.ts`
- `src/components/layout/BottomNav.tsx`

**NO hacer:** onboarding conversacional, replan semanal.

**Criterios de aceptación:**
- [ ] App abre en chat tras login
- [ ] Calendario vacío empuja al chat con 1 tap
- [ ] `npm run build` pasa

**Dependencias:** SP-1.

---

## SP-3 — Flujo E2E: “No sé qué cocinar ahora”

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** Pedir comida → ver plato → aplicar al calendario, mínima fricción.

**En scope:**
- Inferir meal type por hora (menos chips)
- Apply dish → confirmación → opción ver calendario
- Regenerar/swap sin perder contexto
- Presupuesto de slot respetado

**Archivos probables:**
- `src/components/assistant/useChatEngine.ts`
- `src/components/assistant/ChatAssistant.tsx`
- `src/components/assistant/DishCard.tsx`
- `src/services/dishMatchService.ts`
- `api/ai/gemini.ts` (solo si hace falta)

**NO hacer:** plan semanal, onboarding nuevo.

**Criterios de aceptación:**
- [ ] ≤3 interacciones desde chip hasta plato visible
- [ ] Apply agrega comida al calendario correcto
- [ ] Plato calibrado al slot (budget ± tolerancia documentada)
- [ ] `npm run build` pasa

**Dependencias:** SP-1, SP-2.

---

## SP-4 — Onboarding mínimo

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** Llegar a la primera magia más rápido (versión pragmática, no chat 100%).

**En scope:**
- Reducir pasos `ProfileSetup`
- Diferir `WeekPlanningSetup` — solo al pedir plan semanal
- Tras perfil → chat con CTA contextual

**Archivos probables:**
- `src/components/profile/ProfileSetup.tsx`
- `src/components/profile/WeekPlanningSetup.tsx`
- `src/components/assistant/useChatEngine.ts`
- `src/App.tsx`

**NO hacer:** extracción de perfil vía LLM (SP-4b futuro).

**Criterios de aceptación:**
- [ ] Usuario nuevo llega al chat en menos pasos
- [ ] Puede pedir 1 plato sin week planning
- [ ] Week planning solo al elegir “planificar semana”
- [ ] `npm run build` pasa

**Dependencias:** SP-3.

**Nota:** SP-4b (futuro) = onboarding 100% conversacional — ventana aparte.

---

## SP-5 — Plan semanal delegado

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** “Planificá mi semana” = delegación con mínima config.

**En scope:**
- Defaults inteligentes week planning
- Generación → review → apply → shopping en flujo continuo
- Copy delegador
- Smoke tests week plan

**Archivos probables:**
- `src/components/assistant/useChatEngine.ts`
- `src/components/planner/*`
- `src/services/weekPlanService.ts`
- `api/_lib/weekPlanGenerate.ts`
- `scripts/test-week-plan-v2.mjs`

**Criterios de aceptación:**
- [ ] Smoke week plan pasa
- [ ] Apply llena calendario + shopping
- [ ] Budgets respetan lose/maintain/gain
- [ ] Regenerar comida o plan entero funciona

**Dependencias:** SP-4.

---

## SP-6 — Desvíos: flex + rescue

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** Sostenibilidad — absorber desvíos sin culpa.

**En scope:**
- `rescue_stub` → flujo real
- Flex days visibles
- Rebalancear resto del día (mínimo viable)
- Integrar `signalLogService`

**Archivos probables:**
- `src/components/assistant/useChatEngine.ts`
- `src/utils/flexDayHelpers.ts`
- `src/services/signalLogService.ts`

**Criterios de aceptación:**
- [ ] Chip rescue hace algo útil (no stub)
- [ ] Flex days visibles en planner
- [ ] Tono no punitivo

**Dependencias:** SP-5.

---

## SP-7 — Personalización visible

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** El usuario siente “me conoce”.

**En scope:**
- `planRotationMemory`, señales de ingredientes en copy
- “Como la semana pasada…”, “Evito X porque no te gusta”
- Menos repetición explicada

**Archivos probables:**
- `src/services/planRotationMemory.ts`
- `src/store/usePlanRotationStore.ts`
- `src/store/useIngredientSignalStore.ts`
- `api/_lib/weekPlanPrompts.ts`

**Criterios de aceptación:**
- [ ] Regenerar evita repetición reciente (visible en UX)
- [ ] ≥1 señal de personalización en copy por sugerencia

**Dependencias:** SP-3, SP-5.

---

## SP-8 — Modo Pro (opt-in)

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** Power users sin romper Modo Simple.

**En scope:**
- Settings: “Ver calorías”, “Usar gramos”
- Calculadora accesible pero no prominente
- Persistencia Supabase

**Archivos probables:**
- `src/store/useSettingsStore.ts`
- Settings / `UserMenu`
- `DishCard`, `DayView`, `calculator/*`

**Criterios de aceptación:**
- [ ] Toggles funcionan y persisten
- [ ] Modo Pro no aparece hasta activarlo
- [ ] Defaults Simple intactos

**Dependencias:** SP-1.

---

## SP-9 — Confiabilidad del motor

**Estado:** [ ] pendiente · [ ] en progreso · [ ] hecho

**Objetivo:** Si el presupuesto invisible falla, el producto falla.

**En scope:**
- Mejorar fuzzy match / fallbacks
- UX honesta al ajustar porciones
- Smoke tests ampliados

**Archivos probables:**
- `src/services/dishMatchService.ts`
- `src/services/portionEngine.ts`
- `scripts/smoke-ai.mjs`

**Criterios de aceptación:**
- [ ] Umbral de acierto en budget definido y testeado (ej. 90%)
- [ ] Ingredientes desconocidos: fallback graceful
- [ ] Sin platos 0 kcal o macros absurdos en smoke

**Dependencias:** SP-3, SP-5.

---

## Template para ventana nueva

Copiar y pegar al iniciar cada sub-plan:

```markdown
## Sub-plan: SP-X — [nombre]

Leé docs/PRODUCT_PLAN.md primero.

### Objetivo
[1 párrafo del SP correspondiente]

### NO hacer
- [lista del SP]

### Archivos en scope
- [lista]

### Criterios de aceptación
- [ ] ...

### Al terminar
1. npm run build
2. [smoke si aplica]
3. Commit + push
4. Actualizar este PRODUCT_PLAN.md (estado + handoff)
```

---

## Referencias

- `AI_MODULE.md` — arquitectura IA, flujo Gemini
- `DESIGN.md` — design system “Living Journal”
- `docs/ROADMAP_AI.md` — canasta semanal, embeddings (fase futura)
- `docs/architecture/04_motor_calculo_macros.md` — portion engine

---

## Changelog del plan

| Fecha | Cambio |
|-------|--------|
| 2026-07-14 | Creación inicial del plan (SP-0) |
