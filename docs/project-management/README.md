# Gestión de proyecto — NutriKal

Infraestructura mínima para dirigir, ejecutar y auditar tareas del proyecto.

## Estructura

```
docs/project-management/
├── README.md      ← estas reglas
├── STATUS.md      ← tablero de estados
├── tasks/         ← especificaciones (define el director)
├── reports/       ← entregas del ejecutor
└── reviews/       ← auditorías del director
```

## Reglas

1. El director del proyecto define tareas en `tasks/`.
2. El agente ejecutor no modifica el archivo original de la tarea salvo corrección explícita pedida por el director.
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
8. El agente trabaja en una rama por tarea (`codex/task-XXX-…` u otra indicada por el director).
9. El agente puede y debe hacer commits de su trabajo.
10. El agente debe hacer push de la rama a `origin` y abrir un PR contra la base acordada (`master` por defecto).
11. El agente no debe hacer merge del PR.
12. Mientras el PR permanezca abierto, las correcciones se agregan a la misma rama y al mismo PR (no abrir otro).
13. No debe modificar archivos ajenos al alcance sin justificarlo.
14. Los reportes deben incluir archivos modificados, decisiones, pruebas ejecutadas, resultados y riesgos pendientes.

## Flujo (agentes en la nube)

1. Director crea `tasks/TASK-XXX-slug.md` y registra la fila en `STATUS.md` (`pendiente` o `en progreso`).
2. Ejecutor crea/usa la rama de la tarea, implementa, verifica (lint / tests / build) y documenta en `reports/`.
3. Ejecutor hace commit + push y abre (o actualiza) el PR. Estado → `entregada`.
4. Director audita en `reviews/TASK-XXX-slug.md` y marca `aprobada` o `requiere correcciones`.
5. Si requiere correcciones: el ejecutor sigue en la misma rama/PR, vuelve a entregar y el estado permanece o vuelve a `entregada` tras la nueva entrega.
