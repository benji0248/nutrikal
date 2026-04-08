# Fase 0: Infraestructura y DB Vectorial

## 1. Objetivos
- Activar y configurar la base de datos vectorial (pgvector) en Supabase para habilitar capacidades de RAG (Retrieval-Augmented Generation) y búsqueda semántica.
- Asegurar la privacidad de los datos mediante políticas de Row-Level Security (RLS), garantizando que cada usuario solo acceda a sus propios embeddings.
- Preparar la base para que el módulo de IA pueda almacenar y recuperar platos usando similitud coseno.

## 2. Cambios en el Modelo de Datos
- **Activación de Extensión:** Habilitar `vector` en PostgreSQL.
- **Nueva Tabla (`dish_embeddings`):**
  - `id` (uuid)
  - `user_uuid` (uuid) - Relación con el usuario propietario.
  - `content` (text) - Representación textual del plato para generar el embedding.
  - `embedding` (vector) - Vector de dimensiones (ej. 768 para text-embedding-004).
  - `metadata` (jsonb) - Datos adicionales (nombre del plato, ingredientes base).
- **Índices y Funciones:**
  - Crear índice `HNSW` utilizando la métrica `cosine` para búsquedas eficientes.
  - Crear función RPC `find_similar_dishes` que reciba el vector de la query y retorne los matches filtrados por `user_uuid`.

## 3. Criterios de Aceptación
- La migración SQL se ejecuta sin errores en Supabase.
- El endpoint `/api/ai/embed` logra insertar nuevos platos correctamente y poblar la tabla.
- Evaluando vía el panel de Supabase o API, el RLS impide de forma estricta que un usuario consulte o modifique embeddings asociados al `user_uuid` de otra persona.
- Las funciones RPC de similitud devuelven los items más cercanos según la tolerancia provista.
