import { SchemaType, type FunctionDeclaration, type Schema } from '@google/generative-ai';
import type { FuncionesNutrikal } from '../../../src/domain/nutrikal/createFunctions.js';
import type { ConsultaComidas, CriteriosSeleccion, FiltrosIngredientes, Intervalo } from '../../../src/domain/nutrikal/types.js';
import type { CalculatorEntry } from '../../../src/types/index.js';
import type { MealType } from '../../../src/types/index.js';
import type { AjusteCantidades } from '../../../src/domain/nutrikal/proposals.js';
import { exigir } from '../../../src/domain/nutrikal/validation.js';

const stringList: Schema = { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } };
const date: Schema = { type: SchemaType.STRING, description: 'Fecha válida YYYY-MM-DD.' };
const mealTypes: Schema = { type: SchemaType.ARRAY, items: { type: SchemaType.STRING, format: 'enum', enum: ['desayuno', 'almuerzo', 'cena', 'snack'] } };
const filterProperties: Record<string, Schema> = {
  texto: { type: SchemaType.STRING, description: 'Palabras para buscar por nombre, con o sin tildes.' }, ids: stringList,
  categorias: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING, format: 'enum', enum: ['carnes', 'verduras', 'frutas', 'lacteos', 'cereales', 'legumbres', 'grasas', 'bebidas', 'ultraprocesados', 'comidas_preparadas', 'otros'] } },
  cocinas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING, format: 'enum', enum: ['ar', 'asian', 'mediterranean', 'latin', 'international'] } },
};
export const FUNCTION_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  { name: 'resolver_ingrediente', description: 'Resuelve un nombre o ID contra el catálogo real. Devuelve candidatos ambiguos sin inventar nutrientes. No convierte unidades ni confirma existencias.', parameters: { type: SchemaType.OBJECT, properties: { nombre: { type: SchemaType.STRING } }, required: ['nombre'] } },
  { name: 'obtener_presupuesto_comida', description: 'Objetivo calórico de una fecha y horario concretos, considerando mantenimiento, día libre y rutina. No es el saldo de calorías consumidas.', parameters: { type: SchemaType.OBJECT, properties: { fecha: date, tipo: { type: SchemaType.STRING, format: 'enum', enum: ['desayuno', 'almuerzo', 'cena', 'snack'] } }, required: ['fecha', 'tipo'] } },
  { name: 'ajustar_cantidades', description: 'Escala una receta proporcionalmente por porciones o calorías por porción (elegir solo una). Devuelve gramos y nutrientes reales, límites alcanzados y diferencia respecto del objetivo. No optimiza macros ni garantiza cocción o sabor.', parameters: { type: SchemaType.OBJECT, properties: {
    ingredientes: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { ingredientId: { type: SchemaType.STRING }, grams: { type: SchemaType.NUMBER } }, required: ['ingredientId', 'grams'] } },
    porcionesActuales: { type: SchemaType.NUMBER }, porcionesDeseadas: { type: SchemaType.NUMBER }, objetivoKcal: { type: SchemaType.NUMBER },
    limites: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { ingredientId: { type: SchemaType.STRING }, minimoGramos: { type: SchemaType.NUMBER }, maximoGramos: { type: SchemaType.NUMBER } }, required: ['ingredientId', 'minimoGramos', 'maximoGramos'] } },
  }, required: ['ingredientes', 'porcionesActuales'] } },
  { name: 'obtener_objetivo', description: 'Lee el objetivo guardado y, si el perfil está completo, los presupuestos y macros calculados por Nutrikal. No inventa valores cuando falta el perfil. Solo lectura.' },
  { name: 'obtener_preferencias', description: 'Lee restricciones, ingredientes y grupos excluidos y excepciones explícitas. Son condiciones obligatorias para proponer comida. No infiere gustos por el uso ni modifica el perfil.' },
  { name: 'obtener_rutina', description: 'Lee la rutina guardada: horarios, variedad/repetición, días libres, tiempo y presupuesto. Indica si no está configurada; no crea una rutina por defecto.' },
  { name: 'obtener_comidas', description: 'Consulta el CALENDARIO real del usuario: comidas en un intervalo inclusivo de hasta 366 días. Usar directamente cuando pregunta qué tiene planeado, sin pedir permiso para esta lectura. Distingue realizadas, planificadas y alternativas. Resultado paginado; si hayMas, continuar con offset. Un error no significa calendario vacío. No modifica nada.', parameters: {
    type: SchemaType.OBJECT, properties: { desde: date, hasta: date, tipos: mealTypes, incluirAlternativas: { type: SchemaType.BOOLEAN }, soloRealizadas: { type: SchemaType.BOOLEAN }, offset: { type: SchemaType.INTEGER }, limite: { type: SchemaType.INTEGER, description: '1–200; por defecto 50.' } }, required: ['desde', 'hasta'],
  } },
  { name: 'buscar_ingredientes', description: 'Busca en el catálogo de Nutrikal y los ingredientes propios. Devuelve IDs y nutrientes POR 100 GRAMOS, no existencias en casa. La búsqueda es informativa y no aplica exclusiones: consultar preferencias/afinidad o usar seleccionar_ingredientes para elegir candidatos permitidos.', parameters: {
    type: SchemaType.OBJECT, properties: { ...filterProperties, offset: { type: SchemaType.INTEGER }, limite: { type: SchemaType.INTEGER, description: '1–200; por defecto 50.' } },
  } },
  { name: 'obtener_afinidad_ingredientes', description: 'Para IDs concretos, devuelve exclusiones obligatorias y afinidad heurística de señales de uso de 120 días. Sin evidencia no equivale a que no le guste. Señala IDs desconocidos. No genera ingredientes ni recetas.', parameters: {
    type: SchemaType.OBJECT, properties: { ids: { ...stringList, description: 'Entre 1 y 200 IDs obtenidos del catálogo.' } }, required: ['ids'],
  } },
  { name: 'obtener_uso_reciente_ingredientes', description: 'Cuenta apariciones por ingrediente en 1–120 días hasta hoy. Separa comidas realizadas de solo planificadas; excluye alternativas y muestra nombres sin resolver. No asume que una comida planificada fue consumida.', parameters: {
    type: SchemaType.OBJECT, properties: { desde: date, hasta: date }, required: ['desde', 'hasta'],
  } },
  { name: 'seleccionar_ingredientes', description: 'Devuelve candidatos permitidos combinando restricciones, afinidad, uso reciente y rotación de canastas. Sirve para cualquier plato o conjunto de comidas, sin exigir una semana. Ya consulta sus datos de afinidad y uso: no hace falta llamar antes a todas las herramientas. Priorizar nunca habilita un ingrediente excluido. No confirma stock ni diseña recetas.', parameters: {
    type: SchemaType.OBJECT, properties: { cantidad: { type: SchemaType.INTEGER, description: 'Entre 1 y 100 candidatos.' }, semilla: { type: SchemaType.STRING, description: 'Etiqueta interna para variar resultados, hasta 200 caracteres. No preguntarla al usuario; si se omite se usa la fecha actual.' },
      filtros: { type: SchemaType.OBJECT, properties: filterProperties }, priorizarIds: stringList, excluirIds: stringList }, required: ['cantidad'],
  } },
  { name: 'calcular_nutrientes', description: 'Calcula calorías y macros de cantidades exactas, usando IDs reales del catálogo y gramos. Devuelve total y por porción. Rechaza IDs desconocidos y cantidades inválidas; no estima datos faltantes ni cambia cantidades, recetas o calendario.', parameters: {
    type: SchemaType.OBJECT, properties: { ingredientes: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { ingredientId: { type: SchemaType.STRING }, grams: { type: SchemaType.NUMBER } }, required: ['ingredientId', 'grams'] } }, porciones: { type: SchemaType.NUMBER } }, required: ['ingredientes'],
  } },
];

export const FUNCTION_TOOL_LABELS: Record<string, string> = {
  obtener_objetivo: 'Consulté tu objetivo', obtener_preferencias: 'Consulté tus preferencias', obtener_rutina: 'Consulté tu rutina', obtener_comidas: 'Consulté tus comidas',
  resolver_ingrediente: 'Busqué coincidencias en el catálogo', obtener_presupuesto_comida: 'Consulté el objetivo de esa comida', ajustar_cantidades: 'Ajusté las cantidades de la receta',
  buscar_ingredientes: 'Busqué ingredientes del catálogo', obtener_afinidad_ingredientes: 'Consulté afinidades y exclusiones', obtener_uso_reciente_ingredientes: 'Consulté el uso reciente de ingredientes',
  seleccionar_ingredientes: 'Seleccioné candidatos con afinidad y rotación', calcular_nutrientes: 'Calculé nutrientes con las cantidades indicadas',
};

export function solo(raw: unknown, campos: string[]): Record<string, unknown> {
  exigir(raw !== null && typeof raw === 'object' && !Array.isArray(raw), 'Los parámetros deben ser un objeto.');
  const params = raw as Record<string, unknown>;
  exigir(Object.keys(params).every((key) => campos.includes(key)), 'Hay parámetros no admitidos. La identidad del usuario la determina el servidor.');
  return params;
}

/** This adapter only validates transport fields and delegates. It contains no dietary or rotation rules. */
export async function ejecutarFuncionNutrikal(funciones: FuncionesNutrikal, nombre: string, raw: unknown, fechaReferencia: string): Promise<Record<string, unknown>> {
  switch (nombre) {
    case 'resolver_ingrediente': { const p = solo(raw, ['nombre']); return funciones.resolverIngrediente(p.nombre as string); }
    case 'obtener_presupuesto_comida': { const p = solo(raw, ['fecha', 'tipo']); return funciones.obtenerPresupuestoComida(p.fecha as string, p.tipo as MealType); }
    case 'ajustar_cantidades': { const p = solo(raw, ['ingredientes', 'porcionesActuales', 'porcionesDeseadas', 'objetivoKcal', 'limites']); return funciones.ajustarCantidades(p as unknown as AjusteCantidades); }
    case 'obtener_objetivo': solo(raw, []); return funciones.obtenerObjetivo();
    case 'obtener_preferencias': solo(raw, []); return funciones.obtenerPreferencias();
    case 'obtener_rutina': solo(raw, []); return funciones.obtenerRutina();
    case 'obtener_comidas': {
      const params = solo(raw, ['desde', 'hasta', 'tipos', 'incluirAlternativas', 'soloRealizadas', 'offset', 'limite']);
      return { ...await funciones.obtenerComidas(params as unknown as ConsultaComidas) };
    }
    case 'buscar_ingredientes': return { ...await funciones.buscarIngredientes(solo(raw, [...Object.keys(filterProperties), 'offset', 'limite']) as FiltrosIngredientes) };
    case 'obtener_afinidad_ingredientes': {
      const params = solo(raw, ['ids']);
      return funciones.obtenerAfinidadIngredientes(params.ids as string[]);
    }
    case 'obtener_uso_reciente_ingredientes': {
      const params = solo(raw, ['desde', 'hasta']);
      const result = await funciones.obtenerUsoRecienteIngredientes(params as unknown as Intervalo);
      return { ...result, sinResolver: result.sinResolver.slice(0, 50), totalSinResolver: result.sinResolver.length };
    }
    case 'seleccionar_ingredientes': {
      const params = solo(raw, ['cantidad', 'semilla', 'filtros', 'priorizarIds', 'excluirIds']);
      if (params.filtros !== undefined) solo(params.filtros, Object.keys(filterProperties));
      return funciones.seleccionarIngredientes({ ...params, semilla: params.semilla ?? fechaReferencia } as unknown as CriteriosSeleccion);
    }
    case 'calcular_nutrientes': {
      const params = solo(raw, ['ingredientes', 'porciones']);
      if (Array.isArray(params.ingredientes)) params.ingredientes.forEach((entry) => solo(entry, ['ingredientId', 'grams']));
      return funciones.calcularNutrientes(params.ingredientes as CalculatorEntry[], params.porciones as number | undefined);
    }
    default: throw new Error('Herramienta de Nutrikal desconocida.');
  }
}
