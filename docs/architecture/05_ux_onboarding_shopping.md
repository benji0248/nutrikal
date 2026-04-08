# Fase 3, 5 y 6: UX, Empty States, Shopping y Onboarding

## 1. Objetivos
- Unificar las piezas de interacción clave de la aplicación para hacer de NutriKal un producto final coherente, instintivo y sin "caminos muertos" (dead-ends) para el usuario.
- Optimizar la experiencia de Lista de Compras, consolidando elementos.
- Crear el nudo inicial del viaje (Onboarding), acompañando al usuario lógicamente desde la inscripción hasta que genera su primer calendario semanal.

## 2. Cambios en el Modelo de Datos (UI)
- **Empty States (Fase 3):** 
  - Cuando el Tab de Calendario está vacío (`Object.keys(dayPlans).length === 0`), renderizar un banner CTA explícito: "No tenés nada planificado aún. ¿Armamos la semana?" que navega directamente a conversar con la IA en la solapa correspondiente.
- **Shopping Line Consolidation (Fase 5):**
  - Refina el algoritmo de la solapa Compras.
  - Si en la semana hay 3 comidas con pechuga de pollo de `150g` cada una, la UI agrupa sumando `450g`.
  - Organiza visualmente por "secciones del supermercado" según el campo `category` de `INGREDIENTS_DB`.
- **Flujo Onboarding Completo (Fase 6):**
  - Tras el registro de usuario (`authState === 'authenticated'` pero `!profile`), se fuerza a pasar por `ProfileSetup`.
  - Al completar la recalibración o inicialización, se lanza un prompt guiado de Gemini que dice: *"¡Terminado! ¿Querés que te prepare un menú para esta semana considerando tus gustos?"*

## 3. Criterios de Aceptación
- Visualizar un calendario limpio cuando no hay data dispara sinergia total con la IA mediante el banner (sin que el usuario adivine qué tab abrir).
- La lista de compras está "des-duplicada" matemáticamente (Ingredient Consolidation) e incluye Checkboxes lógicas y capacidad de borrado de tareas completadas.
- El usuario proveniente de un Login limpio, tiene todo resuelto hasta tener los 7 días de comida diagramados, de manera continua, cálida, y sin salir del hilo de la IA.
