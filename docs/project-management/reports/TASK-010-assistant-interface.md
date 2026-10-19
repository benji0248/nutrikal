# TASK-010 — Entrega

La entrada del nuevo asistente se reduce a una pregunta y un campo expansible. Al comenzar una conversación, los mensajes ocupan un área con scroll propio y el campo permanece abajo. Se eliminan el bloque explicativo, ejemplos predeterminados y enlace MCP prominente. El selector de asistente se integra a la cabecera, conserva la elección durante la sesión por usuario y mantiene clásico como elección inicial.

Historial lateral bajo demanda, con búsqueda local y diálogo nativo (Escape/foco), y menú secundario para actualizar o abrir conexiones. Se conserva la tipografía y paleta de `DESIGN.md`, superficies suaves y controles con áreas de interacción de al menos 44 px. No se alteran sidebar, calendario o motor del chat clásico.

Las propuestas presentan título, recetas y fechas con detalles desplegables. Fecha y política de superposición aparecen solo al pedir revisar/agregar; se conserva la confirmación explícita. Los mensajes de validación se deduplican y dejan de mostrar rutas técnicas.

Al pedir un ajuste se adjunta una referencia estructurada con el nombre del borrador, en lugar de insertar UUIDs en el texto. El backend valida y lee esa referencia por usuario autenticado y la incorpora al contexto del modelo, persistiendo el mensaje visible separado de los metadatos. Las conversaciones anteriores siguen siendo compatibles al ser un campo JSON opcional; no requiere migración.

Archivos: componentes AssistantEntry/ExperimentalAssistant/ProposalCard/McpPortal; nuevos AssistantOptions y ExperimentalHistory; tipos y servicio beta; handler beta para referencia de borrador.

Verificación: build y comprobación estática de imports ESM, TypeScript estricto del backend y ESLint dirigido. No se ejecutaron pruebas funcionales, llamadas autenticadas al modelo ni cambios en la dieta; validación visual y de uso a cargo del usuario. El diseño se ofrece para que el usuario evalúe su comodidad en móvil y escritorio.
