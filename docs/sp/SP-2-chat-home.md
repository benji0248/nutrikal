# SP-2 — Chat como home

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [x] hecho |
| **Dependencias** | SP-1 |
| **Próximo** | SP-3 |

---

## Contexto

**Norte star:** el usuario delega qué comer hablando, no navegando tabs.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Abrir la app = **conversación**. El calendario, compras e historial son consecuencias del chat, no el punto de entrada.

---

## En scope

- Tab default tras login: `assistant` (no `calendar`)
- Persistir preferencia de tab si ya existe lógica; si no, default hardcoded a assistant
- Empty state del calendario (sin comidas planificadas) → banner CTA: “¿Armamos la semana?” / “¿Qué cocinamos?” → navega al chat
- Welcome message del chat más directo y delegador (menos “elegí una opción”, más “contame qué necesitás”)
- Opcional: badge o copy en BottomNav que refuerce chat como “inicio”

---

## NO hacer

- Onboarding conversacional (SP-4)
- Replan semanal automático
- Eliminar tabs (calendar/shopping siguen existiendo)
- Cambios en motor de IA

---

## Archivos en scope

```
src/App.tsx
src/components/calendar/WeekView.tsx
src/components/calendar/DayView.tsx
src/components/calendar/MonthView.tsx
src/components/assistant/useChatEngine.ts
src/components/layout/BottomNav.tsx
src/types/index.ts  (solo si hace falta para tab default)
```

---

## Criterios de aceptación

- [x] Tras login con perfil completo, la app abre en tab **assistant**
- [x] Calendario vacío muestra CTA visible que lleva al chat en 1 tap
- [x] Welcome del chat invita a delegar (“¿Qué comemos hoy?” / equivalente)
- [x] Usuario puede ir al calendario manualmente sin fricción
- [x] `npm run build` pasa

---

## Smoke manual

1. Login → verificar tab activo = assistant
2. Ir a calendario vacío → tap CTA → llega al chat
3. Recargar app → sigue abriendo en assistant

---

## Al terminar

1. `npm run build`
2. Commit: `feat(ux): SP-2 chat as default home tab`
3. Push + actualizar `PRODUCT_PLAN.md` + handoff

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | feat(ux): SP-2 chat as default home tab |
| **Qué quedó hecho** | Tab default `assistant` con persistencia localStorage; nav reordenada (Inicio primero); empty states en week/day/month; welcome delegador contextual; CTA flotante “¿Qué cocinamos?” |
| **Desviaciones** | Persistencia de tab añadida (no estaba en plan original, mejora UX) |
| **Deuda técnica** | Usuarios con tab guardado en `calendar` seguirán ahí hasta cambiar manualmente |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-2-chat-home.md y ejecutalo. Depende de SP-1 estar hecho (Modo Simple). No toques onboarding ni week plan.
```
