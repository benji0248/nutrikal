# Fase 2: Personalización de IA y RAG (Memoria de Gemini)

## 1. Objetivos
- Proveer de memoria y contexto avanzado a Gemini para que deje de generar iteraciones de semanas partiendo de cero.
- Construir lógica "Anti-Repetición" e inyección de "Afinidad" usando Retrieval-Augmented Generation (RAG).
- Optimizar el flujo de Swaps (sustituciones de comidas) para que las sugerencias de la IA sean contextualmente coherentes con el gusto demostrado del usuario en el tiempo.

## 2. Cambios en el Modelo de Datos
- **Context Builder (`buildContext`):**
  - Se modifica la payload enviada a Gemini, inyectándole el array de platos consumidos recientemente en la última ventana (14 días).
  - Se incorporan los platos marcados como `favoriteDishIds`.
- **Estructura de la Petición:**
  - El Prompt del sistema (System Rules) será dinámico y contará con secciones rojas (PROHIBIDO SUGERIR, por saturación de frecuencia) y secciones verdes (INSPIRACIÓN DE SABOR, por afinidad o favoritos).
  
## 3. Criterios de Aceptación
- Al solicitar "Armame la semana", Gemini no repite ninguna comida principal (ej. almuerzos/cenas) que el usuario haya consumido exhaustivamente en los 7-14 días previos.
- Pide alternativas similares: En un Swap, si el usuario quiere cambiar una comida, el sistema consulta platos similares en el historial vía búsqueda semántica, y le instruye a Gemini sugerir algo de la misma rama de afinidad.
- El LLM prioriza (cuando el parámetro de variedad lo dictamine) reutilizar recetas que al usuario efectivamente le gustaron antes.
