# Funciones reutilizables de Nutrikal

## Separación

La capa está en `src/domain/nutrikal/`. No importa React, stores, SDKs de IA, prompts ni Supabase. Las funciones reciben datos estructurados y aplican las reglas de Nutrikal. `crearFuncionesNutrikal` une esas funciones con un repositorio, una identidad confiable, el catálogo y una fecha de referencia.

`api/_lib/nutrikal/repository.ts` es el adaptador de lectura de Supabase. `api/_lib/assistantBeta/functionTools.ts` es el adaptador de herramientas del modelo. Cambiar el proveedor de IA, implementar un MCP o usar otro almacenamiento no requiere reescribir la selección o el cálculo nutricional.

## API disponible

| Función de la instancia | Parámetros | Resultado |
| --- | --- | --- |
| `obtenerObjetivo()` | Ninguno | Objetivo guardado y cálculo de presupuestos/macros de las reglas actuales si hay perfil completo; no inventa datos faltantes |
| `obtenerPreferencias()` | Ninguno | Restricciones, IDs y grupos excluidos y excepciones explícitas; indica si falta el perfil |
| `obtenerRutina()` | Ninguno | Rutina guardada, horarios activos y presupuestos por horario; sin rutina devuelve `configurada: false` |
| `obtenerComidas(consulta)` | Fechas, horarios opcionales, alternativas/realizadas y paginación | Comidas registradas ordenadas, con ingredientes, estado y total/paginación |
| `buscarIngredientes(filtros)` | Texto, IDs, categorías, cocinas y paginación | Catálogo base y propio, con nutrientes por 100 g; no filtra preferencias ni representa stock |
| `obtenerAfinidadIngredientes(ids)` | 1–200 IDs del catálogo | Permitido/excluido, puntuación heurística, fuente de evidencia y IDs desconocidos |
| `obtenerUsoRecienteIngredientes(intervalo?)` | 1–120 días hasta la referencia; por defecto últimos 21 días | Apariciones en comidas realizadas y solo planificadas, últimas fechas, referencias sin resolver y alternativas excluidas |
| `seleccionarIngredientes(criterios)` | Cantidad, semilla, filtros opcionales, IDs a priorizar/excluir | Candidatos permitidos, puntuaciones y motivos; devuelve faltantes si no alcanzan |
| `calcularNutrientes(entradas, porciones?)` | IDs reales y gramos; por defecto una porción | Totales, valores por porción y detalle por ingrediente; rechaza datos desconocidos, negativos, no finitos o resultados fuera de rango |

Los nombres del adaptador del modelo usan snake_case: `obtener_objetivo`, `obtener_preferencias`, `obtener_rutina`, `obtener_comidas`, `buscar_ingredientes`, `obtener_afinidad_ingredientes`, `obtener_uso_reciente_ingredientes`, `seleccionar_ingredientes` y `calcular_nutrientes`. La lógica vive en las funciones, no en esas declaraciones.

## Composición

```ts
const funciones = crearFuncionesNutrikal({
  usuarioId: identidadVerificada.sub,
  repositorio: crearRepositorioSupabase(clienteBackend),
  catalogoBase: INGREDIENTS_DB,
  fechaReferencia: fechaLocalDelUsuario,
});

const preferencias = await funciones.obtenerPreferencias();
const objetivo = await funciones.obtenerObjetivo();
const candidatos = await funciones.seleccionarIngredientes({
  cantidad: 12,
  semilla: 'cenas-de-esta-conversacion',
  filtros: { categorias: ['carnes', 'verduras', 'legumbres'] },
});
// El modelo decide un plato con estos datos. Los IDs se toman de los candidatos.
const nutrientes = await funciones.calcularNutrientes(ingredientesElegidosConGramos, 2);
```

Las funciones también se pueden usar desde otra pantalla o servicio implementando `RepositorioNutrikal`. Para trabajar con datos ya cargados se exportan las operaciones de `functions.ts`; no necesitan un modelo ni una conexión de base de datos.

## Afinidad y rotación

Se reutilizan los filtros alimentarios, la puntuación de señales y la matemática nutricional existentes. El filtro recibe ahora solo los campos que realmente necesita; es un cambio de tipo sin cambio de comportamiento. La puntuación acepta una fecha opcional para las funciones nuevas; los llamadores anteriores siguen usando la hora actual.

La afinidad usa exclusivamente señales de aceptación/rechazo/modificación/ignorado/repetición de los últimos 120 días. No interpreta ausencia de señales como rechazo. Las exclusiones y restricciones se aplican antes de seleccionar; una prioridad nunca las anula.

La selección genérica combina esa afinidad con apariciones registradas en los últimos 21 días, las últimas cinco canastas guardadas y una variación determinista por semilla/ID. No exige siete días, no impone cupos semanales, no genera recetas y no guarda otra canasta por el solo hecho de consultarla. Con los mismos datos, fecha y semilla produce la misma selección.

Las comidas realizadas y planificadas se cuentan por separado y tienen distinto peso. Las alternativas no participan. Si una comida tiene el mismo ingrediente por ID y por nombre se cuenta una sola aparición. Los nombres solo se resuelven de forma exacta normalizando tildes/espacios; una coincidencia ambigua o ausente se informa como `sinResolver`. No se inventa consumo a partir del nombre del plato. Esos registros incompletos limitan la precisión de la rotación.

## Lectura, seguridad y límites

- Todas las funciones son de lectura/cálculo. No modifican comidas, preferencias, inventario, canastas ni señales.
- El servidor construye la instancia con el usuario del JWT. Ninguna herramienta permite elegir otro `userId`.
- Las consultas al repositorio filtran `user_id`; la caché de contexto, catálogo, señales y rangos de comidas dura una sola petición.
- El catálogo incluye los ingredientes propios. IDs duplicados se rechazan para evitar elegir arbitrariamente valores nutricionales.
- Las consultas de comidas admiten hasta 366 días y páginas de 1–200 resultados. El repositorio pagina con conteos explícitos hasta 10 000 filas y falla si se excede, sin devolver silenciosamente un historial parcial.
- El uso reciente excluye fechas futuras. Consultar el calendario permite ver planificación futura.
- El cálculo valida los datos antes de reutilizar `computeTotalMacros`, para impedir que un ingrediente desconocido sea omitido silenciosamente. Agrupa IDs repetidos y conserva el criterio de redondeo de Nutrikal.
- Buscar un alimento o priorizarlo no demuestra que exista en el freezer. No hay inventario persistente ni inferencia de existencias.
- No se requieren migraciones ni tablas nuevas.

## Integración actual

El asistente experimental puede elegir las funciones que necesita; no debe invocarlas todas por sistema. Los nombres de lectura anteriores siguen aceptados internamente como alias, pero no se anuncian como herramientas duplicadas.

El flujo anterior `preparar_plan` se conserva para las tarjetas y su aplicación revisada. Esta entrega crea la base de funciones y no reemplaza todavía ese generador semanal por una composición de propuestas escritas directamente por el modelo. El chat actual y el rotador semanal anterior mantienen sus recorridos.

Un futuro MCP puede exponer estas mismas funciones después de resolver identidad y autorización. La capa compartida no depende de ese transporte.
