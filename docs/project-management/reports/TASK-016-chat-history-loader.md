# TASK-016 — Entrega local

`src/components/assistant/ExperimentalAssistant.tsx`: estado explícito para abrir/crear una conversación. Mientras espera la respuesta, muestra un spinner centrado y un mensaje de carga en el área del chat, independiente del scroll de la conversación anterior. Incluye carga inicial, selección desde el historial, actualización y creación; el indicador de respuesta del modelo sigue separado.

Controles deshabilitados durante la operación, anuncio accesible con `role="status"`, icono decorativo y animación que respeta movimiento reducido. La carga termina tanto al completar como al fallar; en caso de error se conserva la conversación previa y el error existente. El scroll se ubica al final al montar la conversación cargada, incluso si tiene la misma cantidad de mensajes que la anterior. El listado del historial ya está en memoria y abre inmediatamente, sin esperas artificiales ni nuevas peticiones.

Verificación: build/TypeScript y ESLint dirigido. Sin pruebas funcionales por indicación del usuario. Sin cambios al backend, al chat clásico ni a los datos.

La entrega inicial se conservó local, incluyendo como base TASK-014 y TASK-015. El 19/10/2026 el usuario autoriza subir los tres cambios pendientes en conjunto. Las pruebas de uso continúan a su cargo.
