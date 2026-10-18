# TASK-005 — Asistente experimental con herramientas

## Pedido

Crear las bases del asistente conversacional de Nutrikal, habilitado exclusivamente para la cuenta del usuario verificada en Supabase. Conservar el chat actual como alternativa y evitar que el modelo cambie la planificación directamente. El usuario realiza las pruebas funcionales; autoriza publicación directa a producción.

## Entrega

- Herramientas de preferencias, calendario y preparación de propuestas, con contratos documentados y validaciones en servidor.
- Motor de llamadas a herramientas separado del chat actual.
- Selector de módulo solo para la cuenta habilitada; por defecto se conserva el chat actual.
- Historial experimental persistido de forma separada, con control de concurrencia y reintentos.
- Revisión visual de propuestas y aplicación mediante el flujo de calendario existente.
- Base reutilizable para un futuro adaptador MCP, sin añadir un servidor MCP ahora.

## Criterios

La interfaz y la API comprueban la habilitación; el ID autenticado determina el alcance de todas las consultas. Una conversación o propuesta no modifica comidas ni preferencias. Se reutilizan las reglas existentes de fechas, porciones, exclusiones y superposición. La instalación de la tabla es aditiva y no modifica datos del chat actual.
