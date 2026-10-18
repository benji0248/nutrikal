# TASK-002 — Fechas de planificación semanal

El domingo 18/10/2026 el generador tomaba el lunes de la semana actual y producía fechas del 12/10 al 18/10. Ahora propone mañana y permite elegir hoy u otra fecha futura antes de generar siete días consecutivos. El calendario conserva su navegación por semanas de lunes a domingo.

## Cambios

- Selector compartido de fecha de inicio en el asistente principal y en el chat del calendario, con confirmación del rango completo.
- Generación, semana ISO e inventario basados en la fecha elegida.
- Regeneración permite revisar la fecha anterior, si sigue vigente.
- Aplicación rechaza planes con fechas pasadas y posiciona el calendario en la fecha inicial del plan.
- No se modifican los planes que ya estaban guardados.

## Verificación

Antes de que el usuario solicitara realizar personalmente las pruebas: 43 pruebas aprobadas, compilación correcta y ESLint sin errores (seis advertencias de dependencias de hooks). Incluye regresión 19/10–25/10, inicio a mitad de semana, cambio de año y año bisiesto. La revisión visual fue interrumpida por el usuario. No se ejecutan más pruebas a partir de esa solicitud.

## Publicación

El usuario autorizó publicar directamente en producción mediante push a `master`, como excepción al flujo de PR. La validación funcional en producción queda a cargo del usuario. No se corrigen automáticamente los datos del plan previamente guardado en fechas incorrectas.
