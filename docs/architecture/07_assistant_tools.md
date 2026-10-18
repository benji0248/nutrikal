# Asistente experimental y herramientas de Nutrikal

## Alcance

Piloto habilitado exclusivamente para la cuenta verificada `benjaminog`. El servidor usa el ID autenticado en `api/_lib/assistantBeta/access.ts`; nunca acepta un ID de usuario enviado por el modelo o el navegador. `ASSISTANT_BETA_DISABLED=true` desactiva el piloto. El chat actual sigue siendo la entrada predeterminada y conserva sus componentes, motor e historial.

La conversación experimental se guarda en `assistant_beta_conversations`, separada de `chat_conversations` y `chat_messages`. El cambio de módulo no copia mensajes ni ejecuta cambios de calendario. El módulo se carga de forma diferida y tiene un límite de errores propio. `/api/assistant-beta` usa el router existente y carga su handler de forma diferida; no agrega una función serverless al despliegue ni modifica las rutas del chat clásico.

## Contratos de herramientas

La fuente ejecutable de nombres, descripciones y parámetros es `api/_lib/assistantBeta/tools.ts` (`TOOL_DECLARATIONS`). No se mantienen esquemas distintos para la UI y el modelo. El SDK de Gemini recibe esas declaraciones y devuelve llamadas; el servidor valida y ejecuta cada una, y devuelve el resultado al modelo. No se interpreta texto libre como una orden de escritura.

| Herramienta | Entrada | Resultado | Efectos |
| --- | --- | --- | --- |
| `consultar_preferencias` | Sin parámetros | Nombre, objetivo, nacionalidad, restricciones, exclusiones legibles y rutina | Lectura del perfil del usuario autenticado |
| `consultar_calendario` | `desde`, `hasta` en YYYY-MM-DD; intervalo inclusivo de 1–31 días | Fecha, horario, nombre, realizado/alternativa; indicador de truncamiento | Lectura de hasta 500 comidas propias |
| `preparar_plan` | `desde`, `dias` (1–7), `comidas`, `pedido`; opcionalmente `propuesta_base` y `cambiar_solo` | ID y resumen de una propuesta revisable; estado `draft` | Generación de una propuesta guardada en el historial experimental; ninguna escritura en comidas, perfil o compras |

`preparar_plan` carga siempre el perfil en el servidor, consulta comidas cercanas y reutiliza `generateWeekPlanOneShot`, `buildWeekPlanningContext` y `buildFullWeekPlanFromApiResponse`. Se conservan los presupuestos de porciones, rutina semanal, días libres y validación de alimentos excluidos. Los horarios que no existen en la rutina son rechazados. El generador produce un contenedor de siete días compatible con la administración existente; fuera del alcance pedido no contiene comidas.

Para cambios parciales, la propuesta base debe pertenecer al historial de la conversación autenticada. El servidor reemplaza únicamente los pares fecha/horario indicados y copia el resto desde esa propuesta. No acepta una propuesta base proporcionada libremente por el navegador. Se genera un ID nuevo y no se altera el original.

## Aplicación al calendario

El modelo no dispone de herramientas para aplicar, borrar, mover, completar comidas ni cambiar preferencias. La tarjeta muestra `Revisar y agregar`; esa acción explícita abre el flujo existente `requestApply` / `PlanApplyDialog`. Antes de guardar, ese flujo consulta el estado actual y administra superposiciones, versiones, comidas realizadas y listas de compras. Una propuesta sin conflictos puede aplicarse al pulsar el botón, según el comportamiento existente. Se usa el mismo ID al reintentar para evitar aplicar el mismo plan dos veces.

La separación de chats no crea una copia del calendario. Las propuestas no lo cambian; cuando el usuario aplica una, escribe en su calendario real. El estado aplicado de la tarjeta se deriva de los planes guardados, no de afirmaciones del modelo. El historial clásico puede reflejar cambios de calendario mediante su sincronización existente, pero no recibe mensajes del piloto.

## Conversación, errores y límites

- La API solo utiliza historial persistido del usuario; no acepta mensajes de sistema ni historial arbitrario del cliente.
- Gemini `gemini-2.5-flash`, compatible con el proveedor ya configurado; no se modifica el adaptador del chat actual.
- Hasta cinco rondas de modelo, ocho llamadas a herramientas y un intento de generación de propuesta por mensaje.
- Se reutiliza la cuota diaria existente; el piloto comparte esa cuota con el chat actual.
- Hasta 6000 caracteres por mensaje y 60 mensajes por conversación; las últimas 20 entradas aportan contexto al modelo. Los IDs de propuestas anteriores siguen siendo verificables desde el historial completo.
- Guardado con comparación de `revision`; una ventana desactualizada recibe 409 y debe recargar. Los reintentos con el mismo `requestId` recuperan la respuesta guardada. El botón se bloquea durante un envío.
- Un borrador válido se devuelve inmediatamente después de generarlo, evitando perderlo por un fallo de una llamada adicional al modelo. La tarjeta contiene el detalle; el texto de cierre solo informa su disponibilidad.
- El contenido de herramientas se trata como datos. Todas las consultas llevan el usuario del JWT. No se exponen SQL, claves, herramientas administrativas ni acceso general a Supabase al modelo.
- La tabla nueva tiene RLS y grants únicamente de lectura/inserción/actualización para el backend `service_role`. La app usa JWT propio, no `auth.uid()` de Supabase.
- El selector permanece en el chat actual si falla la consulta de habilitación; un fallo del módulo experimental tiene su propio límite de errores.

## Alimentos disponibles

El usuario puede describir alimentos del freezer o despensa en lenguaje natural. El pedido se transmite al generador como contexto culinario y se mantienen las exclusiones del perfil. Esta versión no crea un inventario, no reserva cantidades ni descuenta existencias o compras automáticamente. Las cantidades son declaradas por el usuario; no existe validación de balance de stock. El asistente debe explicar este límite y no prometer disponibilidad exacta.

## Evolución hacia MCP

No se implementa un servidor MCP en esta entrega. Los contratos de herramientas y sus ejecutores son independientes de la conversación y pueden recibir un adaptador MCP más adelante. Ese adaptador debe resolver una identidad autenticada antes de construir el contexto; nunca exponer las herramientas administrativas de Supabase ni aceptar `userId` del modelo. MCP estandariza descubrimiento y llamadas, pero no sustituye validación, autorización ni reglas de negocio.

Referencias: [function calling de Gemini](https://ai.google.dev/gemini-api/docs/function-calling), [MCP](https://github.com/modelcontextprotocol/docs/blob/main/introduction.mdx), [acceso a tablas de Supabase](https://supabase.com/docs/guides/api/securing-your-api).
