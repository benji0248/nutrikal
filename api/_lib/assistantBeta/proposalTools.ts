import { SchemaType, type FunctionDeclaration, type Schema } from '@google/generative-ai';

const propuesta: Schema = { type: SchemaType.OBJECT, properties: {
  titulo: { type: SchemaType.STRING },
  platos: { type: SchemaType.ARRAY, description: 'Entre 1 y 31 recetas diseñadas por vos: preparación culinaria concreta, no solo alimentos ajustados a calorías. No hay otro generador de IA.', items: { type: SchemaType.OBJECT, properties: {
    clave: { type: SchemaType.STRING, description: 'Clave única interna para referenciar este plato.' }, nombre: { type: SchemaType.STRING },
    ingredientes: { type: SchemaType.ARRAY, description: 'Cantidades TOTALES de la receta, en gramos; IDs reales del catálogo.', items: { type: SchemaType.OBJECT, properties: { ingredientId: { type: SchemaType.STRING }, grams: { type: SchemaType.NUMBER } }, required: ['ingredientId', 'grams'] } },
    porciones: { type: SchemaType.NUMBER, description: 'Número de porciones que rinde la receta; cada asignación usa una porción.' },
    preparacion: { type: SchemaType.STRING, description: 'Instrucciones concretas y ordenadas: técnica, condimentos, cocción y terminación para lograr sabor y textura. Usar los ingredientes y cantidades de la receta; incluir aquí cómo se integran. No alcanza con enumerar alimentos y decir servir juntos. Respetar la sencillez solicitada.' },
    tiempoMinutos: { type: SchemaType.INTEGER, description: 'Tiempo total estimado de preparación y cocción, en minutos.' },
  }, required: ['clave', 'nombre', 'ingredientes', 'porciones', 'preparacion', 'tiempoMinutos'] } },
  asignaciones: { type: SchemaType.ARRAY, description: 'Vacío para guardar solo recetas. Una sola porción por fecha/horario. Hasta 124 comidas en un intervalo de 31 días, consecutivos o no.', items: { type: SchemaType.OBJECT, properties: {
    platoClave: { type: SchemaType.STRING }, fecha: { type: SchemaType.STRING, description: 'YYYY-MM-DD, hoy o futuro.' }, tipo: { type: SchemaType.STRING, format: 'enum', enum: ['desayuno', 'almuerzo', 'cena', 'snack'] },
  }, required: ['platoClave', 'fecha', 'tipo'] } },
}, required: ['titulo', 'platos', 'asignaciones'] };
export const PROPOSAL_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  { name: 'validar_propuesta', description: 'Verifica una propuesta escrita por vos: IDs, gramos, porciones, preferencias y restricciones, fechas, horarios repetidos y objetivos de la rutina. Devuelve errores bloqueantes y avisos; no guarda nada.', parameters: { type: SchemaType.OBJECT, properties: { propuesta }, required: ['propuesta'] } },
  { name: 'guardar_propuesta', description: 'Valida y guarda como BORRADOR la receta o conjunto de comidas que vos diseñaste, sin llamar a otro modelo. Las calorías se calculan con el catálogo. Devuelve una tarjeta revisable; no aplica nada al calendario. Máximo un borrador por turno. Para modificar un borrador, leelo y guardá uno nuevo con el contenido completo.', parameters: { type: SchemaType.OBJECT, properties: { propuesta }, required: ['propuesta'] } },
  { name: 'leer_propuesta', description: 'Lee el contenido completo de un borrador propio por ID para reutilizar o modificar solo lo pedido y conservar el resto. No regenera comidas.', parameters: { type: SchemaType.OBJECT, properties: { propuestaId: { type: SchemaType.STRING } }, required: ['propuestaId'] } },
  { name: 'previsualizar_cambios', description: 'Calcula un antes/después real del calendario y compras para un borrador guardado. No aplica nada. Las alternativas no suman calorías ni compras hasta elegirlas. La confirmación se hace en la tarjeta.', parameters: { type: SchemaType.OBJECT, properties: { propuestaId: { type: SchemaType.STRING }, politica: { type: SchemaType.STRING, format: 'enum', enum: ['fill', 'replace', 'alternatives'] }, inicio: { type: SchemaType.STRING, description: 'Opcional YYYY-MM-DD: desplaza todas las asignaciones conservando distancias.' } }, required: ['propuestaId', 'politica'] } },
];
export const PROPOSAL_TOOL_LABELS: Record<string, string> = { validar_propuesta: 'Validé las comidas propuestas', guardar_propuesta: 'Guardé un borrador para revisar', leer_propuesta: 'Leí el borrador guardado', previsualizar_cambios: 'Revisé los cambios del calendario' };
