# TASK-006 — Reparación del arranque del backend

## Problema y causa

Producción devolvía `FUNCTION_INVOCATION_FAILED` incluso en una lectura sin credenciales a `/api/profile`. El router compartido no alcanzaba la validación de sesión, afectando a todas las rutas de negocio.

El módulo de calendario empezó a importar código compartido que usaba rutas como `../types` y `./shoppingService`, válidas para el bundler del navegador pero no para la resolución nativa de Node ESM. Reproducción local al cargar el módulo: `Directory import ... src/types is not supported resolving ES modules`.

## Corrección

- Rutas de ejecución explícitas `.js` / `index.js` en las dependencias transitivas del calendario y del asistente. No se modifican cálculos de dieta, preferencias ni operaciones de datos.
- Comprobador estático `scripts/check-server-imports.mjs` integrado al build: recorre imports de ejecución de ambos módulos y rechaza rutas relativas implícitas o no resueltas antes de desplegar.
- La restauración temporal propuesta no llegó a ejecutarse. Por instrucción del usuario se continúa con la reparación directa.

## Verificación

- Revisión estática: 53 módulos, 27 imports implícitos corregidos, cero restantes.
- TypeScript emitido a un directorio temporal ignorado y carga nativa ESM de `api/business.js` y del handler experimental: correcta. No se invocan los handlers, ni se usan credenciales, ni se generan planes.
- Build de producción y TypeScript del backend: correctos. ESLint del comprobador: correcto. Pendiente de confirmar el estado HTTP en producción.
- No se ejecutaron suites de tests ni recorridos de uso con la dieta del usuario. La comprobación HTTP se limita al arranque sin autenticación; debe devolver 401 en lugar de 500.

## Estado

Entregada para publicación directa autorizada por el usuario. El estado HTTP posterior se comunica en el chat.
