import type { CalculatorEntry, DietaryRestriction, Goal, Ingredient, IngredientCategory, IngredientSignalEntry, MealType, UserProfile, WeekPlanningProfile } from '../../types/index.js';
import type { FoodPreferences } from '../../utils/foodPreferences.js';

export interface PreferenciasUsuario extends FoodPreferences { restrictions: DietaryRestriction[]; dislikedIngredientIds: string[] }
export interface ContextoUsuario {
  existe: boolean;
  objetivo: Goal | null;
  preferencias: PreferenciasUsuario | null;
  rutina: WeekPlanningProfile | null;
  perfilMetabolico: UserProfile | null;
  historialCanastas: string[][];
}
export interface Intervalo { desde: string; hasta: string }
export interface ComidaRegistrada {
  id: string; fecha: string; tipo: MealType; nombre: string;
  realizada: boolean; alternativa: boolean;
  ingredientes: CalculatorEntry[];
  ingredientesIA: Array<{ name: string; grams?: number }>;
}
export interface Pagina<T> { elementos: T[]; total: number; offset: number; limite: number; hayMas: boolean }
export interface FiltrosIngredientes {
  texto?: string; ids?: string[]; categorias?: IngredientCategory[]; cocinas?: string[];
  offset?: number; limite?: number;
}
export interface ConsultaComidas extends Intervalo {
  tipos?: MealType[]; incluirAlternativas?: boolean; soloRealizadas?: boolean;
  offset?: number; limite?: number;
}
export interface AfinidadIngrediente {
  ingredienteId: string; nombre: string; permitido: boolean;
  puntuacion: number | null;
  fuente: 'exclusion_explicita' | 'restriccion' | 'senales_de_uso' | 'sin_evidencia';
  senales: number;
}
export interface UsoIngrediente {
  ingredienteId: string; nombre: string;
  comidasRealizadas: number; comidasPlanificadas: number;
  ultimaRealizada: string | null; ultimaPlanificada: string | null;
}
export interface UsoReciente extends Intervalo {
  ingredientes: UsoIngrediente[];
  sinResolver: Array<{ comidaId: string; fecha: string; referencia: string }>;
  alternativasExcluidas: number;
}
export interface CriteriosSeleccion {
  cantidad: number; semilla: string; filtros?: FiltrosIngredientes;
  priorizarIds?: string[]; excluirIds?: string[];
}
export interface RepositorioNutrikal {
  leerContexto(usuarioId: string): Promise<ContextoUsuario>;
  leerIngredientesPropios(usuarioId: string): Promise<Ingredient[]>;
  leerComidas(usuarioId: string, intervalo: Intervalo): Promise<ComidaRegistrada[]>;
  leerSenales(usuarioId: string, intervalo: Intervalo): Promise<IngredientSignalEntry[]>;
}
