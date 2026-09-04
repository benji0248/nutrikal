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

## Flujo

1. Director crea `tasks/TASK-XXX-slug.md` y registra la fila en `STATUS.md` (`pendiente` o `en progreso`).
2. Ejecutor implementa sin alterar el archivo de la tarea.
3. Ejecutor escribe `reports/TASK-XXX-slug.md` y pasa el estado a `entregada`.
4. Director audita en `reviews/TASK-XXX-slug.md` y marca `aprobada` o `requiere correcciones`.
