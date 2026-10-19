# TASK-015 — Entrega local

## Hallazgo

El asistente empezaba sin datos personales en su contexto inicial. Dependía de que el modelo decidiera ejecutar las herramientas de objetivo, preferencias y rutina. El prompt acumulaba reglas de conversación, ejemplos específicos y criterios culinarios, además de repetir contratos que ya están en las herramientas. Las capturas muestran preguntas de preferencias con una lista de ejecuciones vacía. Esto no demuestra que la longitud del prompt sea la única causa del comportamiento.

## Cambio

- `api/_lib/assistantBeta/tools.ts`: carga previa de objetivo, preferencias y rutina mediante las tres funciones existentes. Usa el mismo ejecutor con registro real de éxito/error y la caché del perfil por petición de `crearFuncionesNutrikal`: las tres lecturas comparten una consulta a `user_profiles`, limitada al usuario autenticado. Las herramientas siguen disponibles para reutilizarlas; no se agregan otro modelo ni un nuevo catálogo de acciones.
- `api/_lib/assistantBeta/handler.ts`: esperar esa lectura antes de la primera llamada al modelo e incluir sus resultados en contexto interno separado. El perfil se vuelve a leer en cada mensaje nuevo, sin caché entre usuarios o peticiones. Los reintentos de un turno ya guardado conservan su idempotencia y no disparan otra lectura/generación. Las consultas de calendario, presupuesto de fecha y catálogo siguen dependiendo de la necesidad del pedido.
- El contexto distingue perfil ausente/campos nulos de errores de lectura, sin rellenar datos personales. No se registran sus contenidos en los logs de diagnóstico. Un fallo de consulta no se convierte en una lista vacía de preferencias.
- `src/domain/nutrikal/assistantPolicy.ts`: reemplazar las instrucciones extensas de conversación y cocina por límites del producto: iniciativa, personalización, fidelidad a datos y resultados, contratos y confirmación del calendario. La guía MCP también recibe esa política simplificada; los clientes externos continúan consultando los datos con las herramientas, sin carga automática desde el asistente integrado.
- `api/_lib/assistantBeta/proposalTools.ts` y `functionTools.ts`: retirar las indicaciones sobre cómo diseñar una receta. Se mantienen parámetros, campos requeridos y significado de las operaciones.
- `api/_lib/assistantBeta/runTurn.ts`: distinguir todas las consultas fallidas de consultas completadas cuando se necesita un mensaje de fallback. La carga previa también figura como actividad del servidor.

## Verificación y límites

Build, comprobación de imports ESM, TypeScript estricto del backend y ESLint dirigidos. Sin generaciones, pruebas funcionales ni modificaciones a datos de la dieta, según indicación del usuario. Se reutiliza el adaptador de lectura existente; no se cambian el SDK, esquema, RLS ni dependencias. Se mantiene el aislamiento por usuario verificado.

No se cambió de modelo. El resultado culinario y la cantidad de preguntas deben evaluarse con uso real: el cambio garantiza que la carga de contexto se intente antes de cada respuesta, no una calidad determinada del texto. Si falla la lectura, el modelo recibe el error explícito. Persiste el límite para guardar productos desconocidos con nutrientes parciales; no se implementa aquí otro modelo de alimentos. No se modifican mensajes previos ni el chat clásico.

**Sin push, PR ni despliegue por indicación vigente del usuario.** Incluye como base el commit local de TASK-014, todavía sin publicar.
