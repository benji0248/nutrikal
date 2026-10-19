import type { CalendarChangeSummary, CalendarOperationResult, OverlapPolicy } from '../../services/calendarPlanTypes.js';
import type { MealType } from '../../types/index.js';
import type { PropuestaGuardada, ValidacionPropuesta } from './proposals.js';

export interface ConsultaPrevisualizacion { propuestaId: string; politica: OverlapPolicy; inicio?: string }
export interface CambioPropuesto {
  fecha: string; tipo: MealType; antes: string[]; despues: string[]; alternativasAntes: string[]; alternativasDespues: string[];
  accion: 'agregar' | 'reemplazar' | 'alternativa' | 'conservar' | 'protegido';
}
export interface PrevisualizacionPropuesta {
  id: string; propuestaId: string; versionCalendario: string; politica: OverlapPolicy;
  venceEn: string; resumen: CalendarChangeSummary; cambios: CambioPropuesto[];
  validacion: ValidacionPropuesta; compras: Array<{ lista: string; antes: string[]; despues: string[] }>;
}
/** Commands are separate from model read tools: application requires an explicit UI review. */
export interface FuncionesPropuestas {
  guardarPropuesta(propuesta: unknown, requestId: string): Promise<PropuestaGuardada>;
  leerPropuesta(id: string): Promise<PropuestaGuardada>;
  previsualizarCambios(consulta: ConsultaPrevisualizacion): Promise<PrevisualizacionPropuesta>;
  aplicarCambios(previsualizacionId: string): Promise<CalendarOperationResult>;
  deshacerOperacion(operacionId: string, versionCalendario: string, requestId: string): Promise<CalendarOperationResult>;
}
