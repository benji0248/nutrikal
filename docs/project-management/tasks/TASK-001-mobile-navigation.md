# TASK-001 — Navegación móvil

| Campo | Valor |
|-------|-------|
| **ID** | TASK-001 |
| **Estado inicial** | en progreso |
| **Archivo de reporte** | `docs/project-management/reports/TASK-001-mobile-navigation.md` |
| **Archivo de revisión** | `docs/project-management/reviews/TASK-001-mobile-navigation.md` (lo completa el director) |

---

## Especificación completa de la solicitud

Antes de implementar, prepará la infraestructura mínima de gestión del proyecto.

Creá:

```
docs/project-management/
├── README.md
├── STATUS.md
├── tasks/
├── reports/
└── reviews/
```

En README.md documentá estas reglas:

1. El director del proyecto define tareas en `tasks/`.
2. El agente ejecutor no modifica el archivo original de la tarea.
3. Cada tarea tiene un identificador correlativo: TASK-001, TASK-002, etc.
4. El ejecutor registra su entrega en `reports/` usando el mismo nombre del archivo.
5. El director registra la auditoría en `reviews/`.
6. Ninguna tarea se considera terminada hasta que tenga revisión aprobada.
7. Los estados permitidos son:
   - pendiente
   - en progreso
   - entregada
   - requiere correcciones
   - aprobada
8. El agente no debe hacer commits salvo instrucción explícita.
9. No debe modificar archivos ajenos al alcance sin justificarlo.
10. Los reportes deben incluir archivos modificados, decisiones, pruebas ejecutadas, resultados y riesgos pendientes.

Creá `docs/project-management/STATUS.md` con una tabla que incluya:
- ID
- Tarea
- Estado
- Archivo de tarea
- Reporte
- Revisión

Registrá inicialmente TASK-001 como “en progreso”.

Guardá la especificación completa de esta solicitud en:
`docs/project-management/tasks/TASK-001-mobile-navigation.md`

No reduzcas ni reemplaces los criterios de aceptación proporcionados en el prompt.

Después implementá TASK-001.

Al terminar, creá:
`docs/project-management/reports/TASK-001-mobile-navigation.md`

El reporte debe contener:

```
# TASK-001 — Reporte de implementación

## Resumen
Descripción concreta del resultado.

## Archivos modificados
Lista de archivos y motivo de cada cambio.

## Decisiones tomadas
Decisiones técnicas o visuales no triviales.

## Criterios de aceptación
Checklist con cada criterio original marcado como cumplido o pendiente.

## Verificación
Comandos ejecutados y resultado exacto:
- npm run lint
- npm run test:unit
- npm run build

## Validación visual
Anchos móviles comprobados y resultado observado.

## Riesgos o pendientes
Problemas conocidos, supuestos o aspectos que deberían revisarse.
```

Actualizá TASK-001 en STATUS.md de “en progreso” a “entregada”.
No crees todavía el archivo de `reviews/`: lo completará el director después de auditar la entrega.
No hagas commit.

---

## Criterios de aceptación

> Criterios de aceptación del prompt (sin reducir ni reemplazar). Incluyen la infraestructura de gestión y la entrega de TASK-001 (navegación móvil), más la verificación y el reporte exigidos.

### Infraestructura de gestión

- [ ] Existe `docs/project-management/` con `README.md`, `STATUS.md`, `tasks/`, `reports/` y `reviews/`
- [ ] `README.md` documenta las 10 reglas listadas en la solicitud
- [ ] `STATUS.md` tiene tabla con columnas: ID, Tarea, Estado, Archivo de tarea, Reporte, Revisión
- [ ] La especificación completa quedó en `tasks/TASK-001-mobile-navigation.md`
- [ ] El ejecutor no modifica el archivo original de la tarea tras crearlo
- [ ] No se crea todavía el archivo de `reviews/` para esta tarea
- [ ] No se hace commit

### Implementación — navegación móvil

- [ ] La barra inferior (`BottomNav`) es usable en anchos móviles sin overflow horizontal
- [ ] Los 5 destinos (Inicio, Calendario, Estudios, Favoritos, Ajustes) permanecen visibles y tappeables
- [ ] El estado activo es claro sin ensanchar de más el ítem (evita empujar/ocultar vecinos)
- [ ] Se respeta el safe-area inferior (PWA / notch / home indicator)
- [ ] En `md+` la BottomNav sigue oculta (sidebar desktop sin cambios de alcance innecesario)
- [ ] El contenido principal no queda tapado por la barra (padding inferior coherente)

### Entrega y verificación

- [ ] Existe `reports/TASK-001-mobile-navigation.md` con las secciones pedidas
- [ ] `STATUS.md` marca TASK-001 como `entregada` (no `aprobada`)
- [ ] `npm run lint` ejecutado y reportado
- [ ] `npm run test:unit` ejecutado y reportado
- [ ] `npm run build` ejecutado y reportado
- [ ] Validación visual en anchos móviles documentada en el reporte

---

## Alcance de implementación

- `src/components/layout/BottomNav.tsx` (y CSS/utilidades estrictamente necesarias para safe-area / overflow)
- Documentación bajo `docs/project-management/` según la solicitud

## Fuera de alcance

- Rediseño del Sidebar desktop salvo alineación mínima de labels si hace falta consistencia
- Cambios de IA, stores o módulos de negocio
- Crear archivo de revisión
- Commits / PR (salvo instrucción explícita posterior)
