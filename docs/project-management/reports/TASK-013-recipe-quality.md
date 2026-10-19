# TASK-013 — Entrega

## Evidencia y alcance

El turno existente consultado es del 19/10/2026 a las 09:17 UTC (06:17 Argentina), anterior al despliegue de TASK-012, disponible a las 09:25 UTC. Registró consultas de catálogo, presupuesto y ajuste de cantidades; no guardó una propuesta. El texto equiparó dos patys de 130 kcal a gramos de bondiola y solo indicó cocinarlas, hervir pasta y servir. No se atribuye ese resultado al nuevo código ni se presupone que un cambio de instrucciones garantice la calidad de respuestas futuras.

## Cambios

- `src/domain/nutrikal/assistantPolicy.ts`: criterio culinario compartido por el asistente integrado y la guía MCP. Diseñar la preparación antes de ajustar calorías; explicar técnica, sabor, textura, secuencia y terminación. Permitir platos sencillos sin exigir complejidad artificial ni recetas predefinidas.
- Respetar productos y cantidades fijados por la persona. Un producto ausente permite una sugerencia orientativa, sin sustituirlo por otra carne ni inventar gramos/macros. Complementos no declarados se presentan como opcionales o necesarios por conseguir. Contabilizar los ingredientes necesarios, aceites y salsas; recalcular si se redondean las cantidades mostradas.
- `api/_lib/assistantBeta/functionTools.ts`: aclarar que el ajuste proporcional escala todos los ingredientes y no diseña recetas ni debe cambiar cantidades fijadas o servir para suplantar productos ausentes.
- `api/_lib/assistantBeta/proposalTools.ts`: describir la preparación esperada y declarar preparación y tiempo como campos requeridos para nuevas llamadas de propuestas. El MCP deriva su esquema y validador de esta misma declaración. El validador de dominio sigue aceptando borradores antiguos sin preparación/tiempo; no se reescriben datos existentes.

## Verificación y límites

Build, comprobación de imports, TypeScript estricto del backend y ESLint de los tres archivos modificados. Sin generaciones de prueba ni cambios en la dieta, por indicación del usuario. Sin dependencias ni migraciones nuevas. No se modificó el chat clásico.

El contrato persistente continúa requiriendo ingredientes del catálogo con gramos y nutrientes completos: todavía no permite guardar un producto desconocido con solo unidades/calorías declaradas. La mejora indica explicar ese límite y ofrecer igualmente una receta orientativa, sin fabricar una equivalencia. La calidad culinaria la decide el modelo con estas instrucciones; el esquema exige campos, no certifica sabor ni la calidad del texto. La evaluación funcional queda a cargo del usuario.
