# TASK-001 — Navegación móvil

| Campo | Valor |
|-------|-------|
| **ID** | TASK-001 |
| **Estado** | entregada (pendiente de nueva auditoría tras correcciones) |
| **Rama** | `codex/task-001-mobile-navigation` |
| **PR** | #33 (mismo PR; no abrir otro) |
| **Archivo de reporte** | `docs/project-management/reports/TASK-001-mobile-navigation.md` |
| **Archivo de revisión** | `docs/project-management/reviews/TASK-001-mobile-navigation.md` (lo completa el director) |

---

## Objetivo

Reducir la navegación principal móvil a **tres destinos** y trasladar los módulos secundarios al menú del avatar. Eliminar importar/exportar JSON del menú de cuenta.

---

## Especificación

### BottomNav (móvil)

Únicamente tres destinos:

| Label | Tab |
|-------|-----|
| Inicio | `assistant` |
| Calendario | `calendar` |
| Compras | `shopping` |

No conservar en la barra inferior: Estudios, Favoritos ni Ajustes.

Los tres botones deben:

- Distribuirse uniformemente.
- Mantener icono y texto legibles (sin comprimir artificialmente ni forzar texto de 9px).
- Tener área táctil mínima de 44px.
- Mostrar claramente el estado activo.
- Respetar safe-area inferior.
- Funcionar desde 320px sin overflow horizontal.

### Menú del avatar (`UserMenu`)

Eliminar completamente:

- Exportar datos (JSON)
- Importar datos (JSON)
- Selector de archivos
- Confirmación de importación
- `buildExportPayload` / `hydrateFromImport`
- Estados, refs, imports e iconos asociados

Si `AppPayload` solo existía para importar/exportar JSON, eliminar también su definición en `src/types/index.ts`.

En **móvil**, añadir sección **Módulos** con:

| Label | Tab |
|-------|-----|
| Mis estudios | `estudios` |
| Favoritos | `historial` |
| Ajustes | `settings` |

Cada opción debe cambiar la pestaña activa (`onTabChange`) y cerrar inmediatamente el BottomSheet.

Pasar `onTabChange` desde `App.tsx` a `UserMenu`.

En **escritorio**:

- La navegación continúa en Sidebar.
- No duplicar la sección “Módulos” en el menú del avatar.
- Importar/exportar JSON también debe desaparecer.

### Documentación / proceso

- Actualizar esta tarea y el reporte para reflejar la especificación real (3 tabs + módulos en avatar + sin JSON).
- README de project-management: agentes en la nube trabajan en rama por tarea, hacen commits, push y PR; no merge; correcciones en la misma rama/PR.
- Estado de TASK-001: `entregada` (no `aprobada`). No escribir la review del director.

---

## Criterios de aceptación

- [ ] BottomNav muestra solo Inicio, Calendario y Compras
- [ ] Estudios, Favoritos y Ajustes no están en BottomNav
- [ ] Los tres botones: distribución uniforme, icono+texto legibles, min 44px, activo claro, safe-area, sin overflow desde 320px
- [ ] UserMenu móvil tiene sección Módulos (Mis estudios, Favoritos, Ajustes) que navega y cierra el sheet
- [ ] `onTabChange` se pasa desde `App.tsx` a `UserMenu`
- [ ] Desktop: sin sección Módulos en avatar; Sidebar sigue siendo la navegación
- [ ] No queda UI ni código de importar/exportar JSON en UserMenu
- [ ] `AppPayload` eliminado si solo servía para JSON
- [ ] Docs (task, report, README) alineados con esta especificación
- [ ] STATUS = `entregada`; sin archivo de review escrito por el ejecutor
- [ ] `npm run lint`, `npm run test:unit`, `npm run build` ejecutados y reportados
- [ ] Validación visual en 320, 375, 390 y 430px
- [ ] Inicio → assistant; Calendario → calendar; Compras → shopping
- [ ] Mis estudios / Favoritos / Ajustes funcionan desde el avatar (móvil)

---

## Alcance

```
src/components/layout/BottomNav.tsx
src/components/auth/UserMenu.tsx
src/App.tsx
src/types/index.ts          (solo si AppPayload queda sin usos)
src/index.css               (safe-area de la nav, si aplica)
docs/project-management/**
```

## Fuera de alcance

- Rediseño del Sidebar (salvo lo ya existente)
- Merge del PR
- Escribir `reviews/` en nombre del director
- Marcar la tarea como `aprobada`
