# TASK-005 — Entrega del asistente experimental

## Implementación

- Endpoint independiente `/api/assistant-beta`, habilitación exclusiva por ID autenticado y apagado mediante `ASSISTANT_BETA_DISABLED=true`. Se monta en el router existente mediante importación diferida, sin agregar una función serverless.
- Herramientas internas con contratos de Gemini: leer preferencias, consultar calendario y preparar propuestas para 1–7 días. Las modificaciones parciales crean una propuesta nueva conservando las comidas que no se seleccionaron.
- Reutilización del generador semanal y cálculo de porciones existentes. Exclusiones del perfil verificadas durante la generación y antes de presentar la propuesta.
- Historial en una tabla nueva, con control de revisión e idempotencia de mensajes; el modelo recibe historial guardado, no historial arbitrario del cliente.
- Interfaz `Chat actual` / `Asistente experimental`, carga diferida, límite de errores, historial propio y propuestas revisables. La API de herramientas no permite escrituras en el calendario. La aplicación explícita usa la administración existente.
- Documentación de contratos y evolución a MCP en `docs/architecture/07_assistant_tools.md`.

## Archivos

Nuevos: `api/_lib/assistantBeta/{access,handler,tools}.ts`, `src/types/assistantBeta.ts`, `src/services/assistantBetaService.ts`, `src/components/assistant/{AssistantEntry,ExperimentalAssistant}.tsx`, migración de historial y documentación de arquitectura/tarea/entrega.

Integración limitada a `src/App.tsx` (entrada del asistente) y `api/business/[...route].ts` (dos rutas nuevas). No se cambian los componentes ni el motor del chat actual. La entrega depende de TASK-004 para aplicar propuestas con administración de superposiciones.

## Verificación

- Compilación TypeScript de la app, del módulo nuevo y del router/local API: correcta. ESLint de los archivos nuevos: correcto. Build de producción: correcto.
- Migración `20261018213654_assistant_beta_conversations` aplicada en el proyecto Supabase de Nutrikal. Archivo local alineado con la versión registrada en el servidor.
- Verificados columnas, RLS y grants: `anon` y `authenticated` sin lectura; backend con lectura/inserción/actualización. Tabla vacía después de instalarla. No se insertaron conversaciones de prueba ni se modificaron comidas.
- El asesor informa RLS sin políticas en la tabla nueva, esperado por el acceso exclusivo desde el backend con JWT propio. [Referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Los avisos previos de funciones y extensión no se modificaron.
- Vercel preview del commit de implementación `e0b2a09`: Ready, despliegue `dpl_HtbK4iYiyoLWYyb6g1ki8biVmoGc`. Se verificó el estado de compilación, sin ejecutar flujos de la app.
- No se ejecutaron pruebas funcionales, suites de tests ni llamadas al modelo con datos del usuario, por pedido del usuario.

## Límites

El piloto comparte calendario y cuota diaria con el chat actual. No permite al modelo mover/borrar planes ni cambiar el perfil. Las existencias del freezer se usan como contexto; no hay inventario ni descuento automático de compras. La conservación de los recorridos anteriores reduce el alcance del cambio, pero la publicación sigue requiriendo la verificación de uso que hará el usuario.

## Estado

Entregada: implementación, migración y build de Vercel listos. Publicación en `master` autorizada por el usuario; las pruebas funcionales y la revisión de uso quedan a su cargo. El reporte se actualiza antes del push de publicación; el estado final de producción se comunica en el chat.
