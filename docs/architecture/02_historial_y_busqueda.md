# Fase 1: Historial y Búsqueda Semántica (Módulo 3)

## 1. Objetivos
- Dotar a la aplicación de un módulo donde el usuario pueda consultar qué platos ha comido (Historial).
- Reemplazar la anticuada pestaña de "Recetas" por una experiencia centrada en los hábitos del usuario.
- Implementar una barra de búsqueda semántica apoyada en la DB Vectorial, permitiendo que una consulta como "algo fresco y verde" devuelva "Ensalada César" o "Wok de vegetales".
- Establecer el sistema base de "Frecuencia de Consumo" y "Favoritos", vitales para la fase de IA.

## 2. Cambios en el Modelo de Datos
- **Zustand Synced Store (Estado Local y Nube):**
  - Agregar `dishFrequency: Record<string, number>`: Diccionario que incrementa un contador cada vez que se agenda e ingiere un plato.
  - Agregar `favoriteDishIds: string[]`: Array con los IDs/Nombres de las comidas que el usuario ha marcado expresamente con el corazón "♥".
- **Backend:** 
  - Asegurar la integración del endpoint `/api/ai/search` de forma fluida con el frontend.

## 3. Criterios de Aceptación
- El tab de Historial muestra los platos ordenados por `dishFrequency`, visibilizando lo más consumido en la parte superior.
- Se cuenta con funcionalidad UI para marcar/desmarcar platos como favoritos.
- La barra de búsqueda semántica arroja resultados contextuales utilizando la función SQL de similitud, tolerando descripciones indirectas (no solo coincidencia exacta de strings).
- Cada vez que el usuario consolida o aplica un plan en el Calendario, los contadores de frecuencia de los platos involucrados se incrementan correctamente en el Store.
