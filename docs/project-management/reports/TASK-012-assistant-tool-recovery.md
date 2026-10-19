# TASK-012 — Entrega

## Evidencia

Lectura de la conversación existente del usuario piloto: el turno del mensaje genérico tiene `tools:[]`. La respuesta posterior atribuyó la falla al calendario sin registro de haber ejecutado `obtener_comidas`. El código usaba el mismo mensaje genérico cuando no obtenía texto final, y no conservaba finishReason. No se puede reconstruir retrospectivamente si fue una salida vacía, llamada inválida u otro límite del proveedor. No hay evidencia de una falla del MCP externo: el asistente integrado llama funciones directamente.

La consulta directa de diagnóstico a comidas existentes del 19 al 25 de octubre de 2026 devolvió cero filas en el momento de revisión. No se crearon comidas ni se ejecutaron generaciones de prueba.

## Cambio

- Nuevo `runAssistantTurn`: distingue errores del proveedor, bloqueos, respuestas vacías/llamadas inválidas y límites. Reintenta una sola salida vacía o inválida recuperable, sin ejecutar llamadas parciales ni repetir guardados exitosos. No reintenta bloqueos de contenido ni errores HTTP del proveedor.
- Límites: ocho respuestas, dieciséis llamadas, plazo global de 200 s y timeout por llamada de hasta 45 s/tiempo restante. Conserva borradores válidos sin otra llamada al modelo. No muestra respuestas parciales, código ejecutable o texto de pensamiento.
- Diagnóstico por turno guardado en el JSON de conversación y log estructurado: motivo de terminación, duración, nombres de llamadas, tokens y recuperación. Actividades incluyen error/duración y, para calendario, intervalo y cantidad/paginación. No registra argumentos completos, recetas, tokens de acceso ni razonamiento interno.
- Contexto de turnos siguientes incorpora evidencias de ejecución y reconoce el antiguo mensaje genérico como causa no registrada. El modelo no debe confundir ausencia de consulta con calendario vacío o con error de herramienta.
- Política compartida con el MCP: consultar y calcular sin pedir permisos reiterados, proponer porciones usando el objetivo, una pregunta solo cuando sea material, elegir detalles secundarios y ofrecer borradores con fechas explícitas y editables.
- Los valores nutricionales declarados por la persona se conservan como tales. No se sustituyen patys de marca por carne cruda, ni se inventan ID/peso/macros. Una sugerencia conversacional puede separar datos declarados de cálculos del catálogo; guardar una propuesta completa conserva la validación estricta existente.

Sin cambios de esquema o nuevas dependencias. No se añadió inventario ni se alteraron alimentos, preferencias o planificación de la cuenta.

## Verificación y límites

Build, TypeScript estricto y ESLint dirigidos. Comprobación de imports ESM y carga nativa del backend. Lecturas de diagnóstico únicamente; sin llamadas funcionales al modelo o creación de datos de prueba por pedido del usuario. El comportamiento conversacional se valida con el uso real del usuario; el reintento no garantiza que un proveedor siempre produzca una respuesta válida.

La documentación oficial distingue salidas inválidas (`MALFORMED_FUNCTION_CALL`), límites y bloqueos: https://ai.google.dev/api/generate-content#FinishReason . Se preserva el protocolo de llamadas/resultados del SDK actual, sin cambiar de proveedor o versión.
