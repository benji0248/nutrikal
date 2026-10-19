# TASK-011 — Entrega

Se reemplazó el select nativo por `AssistantModeSelect`: superficie redondeada, sombra suave, iconos, descripción breve y marca verde de selección. El botón conserva la etiqueta actual y anima la flecha al abrir.

Accesibilidad: botón con estado expandido y popup listbox, opciones con aria-selected; flechas, Home/End, selección con Enter/Espacio y búsqueda por inicial. Escape devuelve el foco, Tab permite continuar y salir cierra el popup. Clic fuera cierra. Al cambiar entre interfaces se restaura el foco al nuevo botón de la cabecera.

Cambios limitados a AssistantEntry, componente nuevo y documentación. Se conserva la selección por usuario durante la sesión. Sin backend, base de datos ni dependencias nuevas.

Verificación: build y ESLint dirigido. No se ejecutaron pruebas funcionales ni se modificó la dieta; evaluación visual y de uso a cargo del usuario.
