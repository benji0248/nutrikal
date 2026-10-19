# TASK-007 — Entrega de funciones reutilizables

## Cambios

- Capa `src/domain/nutrikal/`: contratos, validación, operaciones independientes y factoría con repositorio inyectado. Nueve funciones para objetivo, preferencias, rutina, comidas, catálogo, afinidad, uso reciente, selección y nutrientes.
- Adaptador Supabase de solo lectura, consultas por identidad autenticada, paginación completa con límite explícito y rechazo de datos inválidos o catálogos ambiguos.
- Adaptador de nueve herramientas para el asistente experimental. El modelo decide cuáles necesita; no se repite la lógica en cada herramienta. Nombres de lectura antiguos mantenidos como alias internos.
- Reutilización de filtros, puntuación de señales y matemática nutricional existentes. En las funciones nuevas, afinidad y rotación son datos separados; se distinguen exclusiones, evidencia y ausencia de evidencia.
- Selección independiente de semanas, con semilla determinista, motivos y preferencias obligatorias. El cálculo rechaza IDs desconocidos y cantidades inválidas, agrupa IDs repetidos y devuelve total/porción/detalle.
- La documentación de contratos, decisiones, límites y futura integración MCP está en `docs/architecture/08_reusable_functions.md`.

## Compatibilidad

El chat actual no se modifica. El tipo de entrada del filtro se reduce a los campos que ya utilizaba; la puntuación de señales acepta una fecha opcional sin cambiar el comportamiento de los llamadores anteriores. La única integración activa es el asistente experimental, que conserva el generador `preparar_plan` hasta una futura entrega de composición de propuestas por el modelo.

No hay migraciones ni escrituras en Supabase. Solo se consultaron metadatos de columnas para comprobar el adaptador. Los archivos locales previos del usuario y el reporte de TASK-004 se conservan.

## Verificación

- TypeScript de la app y del handler del asistente: correctos.
- ESLint de los archivos nuevos/modificados: correcto.
- Resolución de imports de ejecución: sin rutas implícitas.
- Compilación y carga nativa ESM del router y del handler con la capa nueva: correctas; sin invocar handlers, credenciales ni generación de comidas.
- Build final de producción: correcto. Pendiente publicación; el resultado de despliegue y la comprobación de arranque se comunican en el chat.
- Por instrucción del usuario, no se ejecutaron suites de tests ni pruebas funcionales con su dieta. Las funciones de afinidad/rotación usan heurísticas y referencias exactas; su comportamiento de uso queda para su revisión.

## Estado

Entregada: funciones, adaptadores y documentación completos. Publicación directa autorizada a producción; pruebas de uso a cargo del usuario.
