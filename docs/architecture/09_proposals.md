# Propuestas reutilizables

El asistente experimental escribe las recetas directamente usando el catálogo. Ya no llama al generador semanal para resolver un plato o días sueltos. El chat clásico y las tarjetas antiguas conservan su flujo.

## Contratos

`src/domain/nutrikal/proposals.ts` contiene funciones sin HTTP, base de datos ni proveedor de IA:

- `resolverIngrediente(catalogo, nombre)`: resuelve solo nombre exacto normalizado o ID único. Las búsquedas parciales devuelven candidatos y ambigüedad; nunca inventa nutrientes.
- `obtenerPresupuestoComida(contexto, fecha, tipo)`: aplica rutina y mantenimiento de esa fecha. Día libre, horario inactivo o perfil incompleto producen `null`, no un objetivo ficticio. No calcula saldo de consumo.
- `ajustarCantidades(catalogo, ajuste)`: escala por porciones o calorías por porción, exclusivamente. Factor 0,05–20, gramos redondeados a décimas, límites explícitos opcionales por ingrediente. Expone límites alcanzados y desvío respecto del objetivo. No es un optimizador de macros ni un validador culinario.
- `validarPropuesta(catalogo, contexto, raw, hoy)`: resultados estructurados `error`/`aviso`. Errores: estructura, ID, gramos, exclusiones, fecha pasada, duplicación de horarios, etc. Avisos: falta de preparación, horario fuera de rutina, diferencia mayor al 20% del objetivo. Reutiliza los filtros existentes de restricciones; no reemplaza validación clínica ni etiquetas de alérgenos.

Una propuesta tiene título, 1–31 platos y 0–124 asignaciones en un intervalo de hasta 31 días. Cada plato tiene clave, nombre, ingredientes con IDs y gramos **totales de receta**, porciones que rinde, preparación y tiempo opcionales. Cada asignación consume **una porción** del plato para una fecha y horario. Puede guardarse una receta sin calendario. No se afirma stock ni se descuentan existencias.

`api/_lib/nutrikal/proposalFunctions.ts` implementa el puerto `FuncionesPropuestas`, independiente de HTTP y Gemini:

- `guardarPropuesta`: valida y persiste un borrador nuevo. La clave de pedido es idempotente por usuario. Modificar implica guardar otro borrador.
- `leerPropuesta`: contenido completo propio para reutilizar sin reconstruir gramos desde el historial.
- `previsualizarCambios`: fecha de inicio opcional desplaza todas las asignaciones; políticas `fill`, `replace`, `alternatives`. Construye antes/después real con el mismo reductor de calendario y compras. Persiste la revisión por 30 minutos sin cambiar comidas.
- `aplicarCambios`: solo recibe ID de revisión propio almacenado por servidor; no acepta un snapshot enviado por el cliente. Revalida perfil, catálogo y propuesta; compara la huella del contexto y confirma con el RPC transaccional existente. ID de revisión = ID de operación idempotente. Snapshot obsoleto exige nueva revisión.
- `deshacerOperacion`: revierte diferencias de una operación propia, conserva cambios ajenos y rechaza fechas pasadas, comidas realizadas o ediciones posteriores incompatibles. Reutiliza el diario y RPC atómico de calendario.

Los imports runtime usan `.js` explícito para Node ESM. El adaptador Gemini solo declara funciones y delega; no expone aplicar/deshacer al modelo. La tarjeta ejecuta esas acciones con un clic explícito. Los endpoints están dentro del router existente, sin añadir funciones serverless.

## Persistencia y límites

Migración `20261019004007_reusable_proposals`: tablas `nutrikal_proposals` y `nutrikal_previews`, RLS y acceso de backend. La aplicación autentica su propio JWT; **no** usa `auth.uid()`. Cada consulta filtra por el usuario verificado. La relación de revisión a propuesta incluye usuario. Ninguna credencial administrativa llega al modelo.

Las revisiones conservan snapshots para confirmación y auditoría, aunque estén vencidas; todavía no hay política de purga. La validación de preferencias se vuelve a leer al confirmar, antes del commit de calendario; las preferencias no forman parte del bloqueo transaccional del calendario. La receta y el calendario no simulan cocina, stock, descongelado ni consumo.

Verificación: build, TypeScript estricto del backend, ESLint dirigido y carga nativa ESM. Metadatos de tablas y permisos comprobados en la base. Las pruebas funcionales quedan a cargo del usuario por pedido explícito.
