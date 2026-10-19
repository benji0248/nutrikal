# TASK-007 — Funciones reutilizables de Nutrikal

El usuario solicita implementar las nueve funciones discutidas para aportar contexto y operaciones confiables al modelo, con independencia de que use todas en cada pedido. La lógica debe poder utilizarse desde otros módulos y un futuro MCP, conservando el flujo actual.

## Alcance

Crear objetivo, preferencias, rutina, comidas, búsqueda de ingredientes, afinidad, uso reciente, selección/rotación y cálculo nutricional. Separar contratos y reglas del acceso a datos y de los adaptadores del modelo. Aprovechar la lógica existente sin introducir otro generador de IA dentro de estas funciones.

Las funciones no modifican datos. Se integran al asistente experimental de la cuenta piloto. No se reescribe el chat actual, no se agregan tablas y no se implementa un servidor MCP. El usuario realiza las pruebas de uso.
