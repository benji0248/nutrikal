# SP-4 — Onboarding mínimo

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [x] hecho |
| **Dependencias** | SP-3 |
| **Próximo** | SP-5 |

---

## Contexto

**Norte star:** llegar a la primera magia rápido. Formularios solo para lo que el motor **necesita**; el resto se difiere o se infiere después.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Reducir fricción antes del primer plato. **Versión pragmática** (forms reducidos), no onboarding 100% conversacional (eso es SP-4b futuro).

---

## En scope

- Reducir pasos de `ProfileSetup` (fusionar steps si tiene sentido sin perder datos mínimos)
- **Diferir** `WeekPlanningSetup`: solo obligatorio al elegir “Planificá mi semana”
- Tras completar perfil básico → redirigir al chat con CTA contextual (“¿Armamos tu [comida actual]?”)
- Campos mínimos obligatorios para motor:
  - objetivo (lose/maintain/gain)
  - peso, altura, sexo, fecha nacimiento
  - actividad
  - nacionalidad (cocina/jerga)
  - restricciones alimentarias (puede ser vacío)
- Dislikes detallados → opcional / diferido

---

## NO hacer

- Extracción de perfil vía LLM (SP-4b)
- Eliminar ProfileSetup por completo
- Week plan generation en onboarding
- Cambios en portion engine

---

## Archivos en scope

```
src/components/profile/ProfileSetup.tsx
src/components/profile/WeekPlanningSetup.tsx
src/components/assistant/ChatAssistant.tsx
src/components/assistant/useChatEngine.ts
src/App.tsx
src/store/useProfileStore.ts
```

---

## Criterios de aceptación

- [x] Usuario nuevo completa perfil en **menos pasos/pantallas** que antes (documentar antes/después)
- [x] Tras perfil → llega al chat con sugerencia contextual (no calendario vacío sin guía)
- [x] Puede pedir **1 plato** sin completar week planning profile
- [x] Elegir “Planificá mi semana” sin week planning → abre `WeekPlanningSetup` (no falla silenciosamente)
- [x] `npm run build` pasa

---

## Smoke manual

1. Registrar usuario nuevo → contar pasos hasta chat
2. Pedir plato sin abrir week planning setup
3. Pedir plan semanal → week planning setup aparece

---

## SP-4b (futuro, fuera de scope)

Onboarding 100% conversacional: perfil extraído del chat. Ventana aparte.

---

## Al terminar

1. `npm run build`
2. Commit: `feat(onboarding): SP-4 minimal profile path to first dish`
3. Push + actualizar `PRODUCT_PLAN.md` + handoff

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | feat(onboarding): SP-4 minimal profile path to first dish |
| **Pasos antes / después** | ProfileSetup: **4 pasos → 3** (actividad+meta fusionados; dislikes diferidos) |
| **Qué quedó hecho** | Onboarding mínimo: 3 pasos de perfil, dislikes solo al editar, welcome contextual post-perfil (`justOnboarded`), week planning sigue diferido hasta elegir plan semanal |
| **Desviaciones** | Ninguna |
| **Deuda técnica** | Dislikes en edición de perfil siguen en ProfileSetup; falta entrada dedicada en ajustes |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-4-onboarding-minimo.md y ejecutalo. No hagas onboarding conversacional (SP-4b).
```
