# TASK-008 — Entrega

Implementadas las ocho capacidades propuestas y lectura de borradores. Dominio en `src/domain/nutrikal/proposals.ts`; servicio de comandos en `api/_lib/nutrikal/proposalFunctions.ts`. El asistente experimental diseña las recetas directamente y guarda contenido validado: se eliminó su dependencia del generador semanal. El chat clásico conserva su implementación.

La tarjeta muestra ingredientes y macros por porción, preparación, asignaciones y avisos. Permite desplazar fechas, elegir cómo resolver coincidencias, revisar antes/después de calendario/compras y confirmar; también deshacer. Se reutiliza el reductor y el RPC transaccional con protección de comidas realizadas, versiones e idempotencia.

Migración Supabase `20261019004007_reusable_proposals` aplicada. Metadatos verificados: RLS activado, sin SELECT de anon ni INSERT de authenticated, acceso de backend. Asesor de seguridad: las tablas del backend sin políticas generan el aviso informativo esperado; permanecen hallazgos anteriores de funciones/extensión fuera del alcance. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Verificación completada: `npm run build`; TypeScript estricto del handler y dependencias; ESLint dirigido; compilación y carga nativa ESM de business/handler. No se ejecutaron suites ni se crearon comidas de prueba en la cuenta. Pruebas funcionales a cargo del usuario.

Límites: resolución exacta o candidatos parciales, sin inventario persistente; escalado proporcional y no optimización culinaria/macros; revisiones caducan para aplicar pero no se purgan automáticamente. Documentación completa: `docs/architecture/09_proposals.md`.
