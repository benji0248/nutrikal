import type { FunctionDeclaration } from '@google/generative-ai';
import { getSupabase } from '../supabase.js';
import { INGREDIENTS_DB } from '../../../src/data/ingredients.js';
import { crearFuncionesNutrikal } from '../../../src/domain/nutrikal/createFunctions.js';
import { ErrorFuncionesNutrikal, exigir } from '../../../src/domain/nutrikal/validation.js';
import type { PropuestaGuardada } from '../../../src/domain/nutrikal/proposals.js';
import type { ConsultaPrevisualizacion } from '../../../src/domain/nutrikal/proposalOperations.js';
import type { AssistantToolActivity } from '../../../src/types/assistantBeta.js';
import { crearRepositorioSupabase } from '../nutrikal/repository.js';
import { crearFuncionesPropuestas } from '../nutrikal/proposalFunctions.js';
import { FUNCTION_TOOL_DECLARATIONS, FUNCTION_TOOL_LABELS, ejecutarFuncionNutrikal, solo } from './functionTools.js';
import { PROPOSAL_TOOL_DECLARATIONS, PROPOSAL_TOOL_LABELS } from './proposalTools.js';

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [...FUNCTION_TOOL_DECLARATIONS, ...PROPOSAL_TOOL_DECLARATIONS];
export const TOOL_LABELS = { ...FUNCTION_TOOL_LABELS, ...PROPOSAL_TOOL_LABELS };

export function createToolContext(userId: string, today: string, requestId: string) {
  const funciones = crearFuncionesNutrikal({ usuarioId: userId, fechaReferencia: today, catalogoBase: INGREDIENTS_DB, repositorio: crearRepositorioSupabase(getSupabase()) });
  const gestion = crearFuncionesPropuestas(userId, today);
  const drafts: PropuestaGuardada[] = [];
  const activities: AssistantToolActivity[] = [];
  async function execute(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const started = Date.now();
    const calendarQuery = name === 'obtener_comidas' && typeof args?.desde === 'string' && typeof args?.hasta === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(args.desde) && /^\d{4}-\d{2}-\d{2}$/.test(args.hasta) ? { desde: args.desde, hasta: args.hasta } : undefined;
    if (!Object.hasOwn(TOOL_LABELS, name)) {
      activities.push({ name: name.slice(0, 80), label: 'No pude ejecutar una consulta solicitada', ok: false, code: 'herramienta_desconocida', durationMs: 0 });
      return { error: 'Herramienta desconocida. Usá exactamente un nombre del catálogo de herramientas declaradas.', codigo: 'herramienta_desconocida' };
    }
    try {
      let result: Record<string, unknown>;
      if (Object.hasOwn(FUNCTION_TOOL_LABELS, name)) result = await ejecutarFuncionNutrikal(funciones, name, args, today);
      else if (name === 'validar_propuesta') {
        const p = solo(args, ['propuesta']); result = { ...await funciones.validarPropuesta(p.propuesta) };
      } else if (name === 'guardar_propuesta') {
        const p = solo(args, ['propuesta']);
        exigir(!drafts.length, 'Ya guardaste un borrador en este turno.');
        const saved = await gestion.guardarPropuesta(p.propuesta, requestId);
        drafts.push(saved);
        result = { propuestaId: saved.id, estado: 'borrador', calendarioModificado: false, validacion: saved.validacion,
          instruccion: 'La tarjeta está lista para revisar. No se aplicó al calendario ni se descontaron existencias.' };
      } else if (name === 'leer_propuesta') {
        const p = solo(args, ['propuestaId']); result = { ...await gestion.leerPropuesta(p.propuestaId as string) };
      } else {
        const p = solo(args, ['propuestaId', 'politica', 'inicio']); result = { ...await gestion.previsualizarCambios(p as unknown as ConsultaPrevisualizacion), calendarioModificado: false };
      }
      activities.push({ name, label: TOOL_LABELS[name], ok: true, durationMs: Date.now() - started,
        ...(calendarQuery ? { calendarQuery: { ...calendarQuery, total: typeof result.total === 'number' ? result.total : undefined, returned: Array.isArray(result.elementos) ? result.elementos.length : undefined, hasMore: typeof result.hayMas === 'boolean' ? result.hayMas : undefined } } : {}),
      });
      return result;
    } catch (e) {
      activities.push({ name, label: TOOL_LABELS[name], ok: false, code: e instanceof ErrorFuncionesNutrikal ? e.codigo : 'operacion_no_disponible', durationMs: Date.now() - started, calendarQuery });
      console.error('[assistant-beta-tool]', name, e instanceof Error ? e.name : 'tool_error');
      return e instanceof ErrorFuncionesNutrikal ? { error: e.message, codigo: e.codigo } : { error: 'No pude completar esta operación. El calendario sigue igual.' };
    }
  }
  return { execute, drafts, activities };
}
