# TASK-001 — Reporte de implementación

## Resumen

Navegación móvil reducida a **tres destinos** en `BottomNav` (Inicio, Calendario, Compras). Módulos secundarios (Mis estudios, Favoritos, Ajustes) viven en el menú del avatar en móvil. Se eliminó por completo importar/exportar JSON y el tipo `AppPayload`. Entrega en la misma rama/PR #33, estado **entregada**, pendiente de nueva auditoría del director.

## Archivos modificados

| Archivo | Motivo |
|---------|--------|
| `src/components/layout/BottomNav.tsx` | Solo 3 tabs: assistant / calendar / shopping; touch ≥44px; activo claro; safe-area |
| `src/components/auth/UserMenu.tsx` | Sin JSON; sección Módulos en móvil; `onTabChange`; desktop solo cuenta + logout |
| `src/App.tsx` | Pasa `onTabChange={setActiveTab}` a `UserMenu` |
| `src/types/index.ts` | Eliminado `AppPayload` (solo servía al backup JSON) |
| `src/index.css` | Utilidad `.safe-bottom-nav` (padding base + safe-area) |
| `docs/project-management/README.md` | Flujo de agentes en la nube (rama, commits, push, PR, sin merge) |
| `docs/project-management/tasks/TASK-001-mobile-navigation.md` | Especificación real (3 tabs + módulos en avatar + sin JSON) |
| `docs/project-management/STATUS.md` | TASK-001 = entregada |
| `docs/project-management/reports/TASK-001-mobile-navigation.md` | Este reporte |
| `docs/project-management/reviews/.gitkeep` | Directorio reviews vacío (sin review del ejecutor) |

## Decisiones tomadas

1. **Tres tabs, no cinco comprimidos:** la nav inferior es primaria; estudios/favoritos/ajustes salen del chrome fijo.
2. **Active pill solo en el ícono** (`w-11 h-9`), label `text-xs` sin forzar 9px.
3. **Módulos solo en BottomSheet (móvil):** el Modal de escritorio no duplica la sección; Sidebar sigue siendo la nav desktop.
4. **Cierre inmediato del sheet** al elegir un módulo (`onTabChange` + `setOpen(false)`).
5. **`AppPayload` borrado:** no quedaban otros usos tras quitar import/export.
6. **Misma rama/PR:** correcciones sobre `codex/task-001-mobile-navigation` / PR #33; sin merge.

## Criterios de aceptación

- [x] BottomNav muestra solo Inicio, Calendario y Compras
- [x] Estudios, Favoritos y Ajustes no están en BottomNav
- [x] Los tres botones: distribución uniforme, icono+texto legibles, min 44px, activo claro, safe-area, sin overflow desde 320px
- [x] UserMenu móvil tiene sección Módulos (Mis estudios, Favoritos, Ajustes) que navega y cierra el sheet
- [x] `onTabChange` se pasa desde `App.tsx` a `UserMenu`
- [x] Desktop: sin sección Módulos en avatar; Sidebar sigue siendo la navegación
- [x] No queda UI ni código de importar/exportar JSON en UserMenu
- [x] `AppPayload` eliminado (`rg AppPayload` → sin matches en el repo de código)
- [x] Docs (task, report, README) alineados con la especificación
- [x] STATUS = `entregada`; sin archivo de review escrito por el ejecutor
- [x] `npm run lint`, `npm run test:unit`, `npm run build` ejecutados y reportados
- [x] Validación visual en 320, 375, 390 y 430px (BottomNav)
- [x] Inicio → assistant; Calendario → calendar; Compras → shopping (harness + mapeo de tabs)
- [x] Mis estudios / Favoritos / Ajustes cableados desde el avatar (`UserMenu` → `onTabChange`); smoke autenticado pendiente en dispositivo real

## Verificación

### `npm run lint`

- **Exit code:** `1`
- **Resultado:** 9 problems (4 errors, 5 warnings), todos **preexistentes** y fuera de alcance:
  - `api/_lib/medicalStudyPipeline.ts` — unused var
  - `src/App.tsx:113` — `set-state-in-effect` (mealChat)
  - `src/components/estudios/MedicalStudyDetailView.tsx:73` — `set-state-in-effect`
  - `src/store/usePlanRotationStore.ts:67` — unused `_plan`
  - warnings exhaustive-deps en `useChatEngine.ts`
- Sin hallazgos nuevos en `BottomNav.tsx` / `UserMenu.tsx` / docs.

### `npm run test:unit`

- **Exit code:** `0`
- ```
  Test Files  5 passed (5)
  Tests  14 passed (14)
  ```

### `npm run build`

- **Exit code:** `0` — `✓ built in 836ms`

## Validación visual

BottomNav (3 tabs) — métricas:

| Ancho | overflow | Alturas tab | Anchos | Labels |
|------:|:--------:|------------:|--------|--------|
| 320px | false | 71 | 90/90/90 | Inicio, Calendario, Compras |
| 375px | false | 71 | 115/115/115 | OK |
| 390px | false | 71 | 119/119/119 | OK |
| 430px | false | 71 | 133/133/133 | OK |

Clicks: Inicio→`assistant`, Calendario→`calendar`, Compras→`shopping`. Touch target 71px ≥ 44px.

<img alt="BottomNav 3 tabs 320px" src="/opt/cursor/artifacts/screenshots/nav3-320px.webp" />
<img alt="BottomNav 3 tabs 375px" src="/opt/cursor/artifacts/screenshots/nav3-375px.webp" />
<img alt="BottomNav 3 tabs 390px" src="/opt/cursor/artifacts/screenshots/nav3-390px.webp" />
<img alt="BottomNav 3 tabs 430px" src="/opt/cursor/artifacts/screenshots/nav3-430px.webp" />

## Riesgos o pendientes

1. **Lint preexistente** sigue fallando fuera de alcance.
2. **Smoke del avatar autenticado** (abrir BottomSheet → Mis estudios / Favoritos / Ajustes) no se ejecutó end-to-end sin JWT/API; el cableado en código está listo.
3. **Compras en desktop:** Sidebar no incluye shopping (igual que antes de esta tarea); solo BottomNav móvil lo expone. Valorar tarea aparte si hace falta en desktop.
4. **Review del director** pendiente; no se escribió `reviews/`.
