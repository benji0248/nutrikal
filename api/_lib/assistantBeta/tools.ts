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
    if (!Object.hasOwn(TOOL_LABELS, name)) return { error: 'Herramienta desconocida.' };
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
      activities.push({ name, label: TOOL_LABELS[name], ok: true });
      return result;
    } catch (e) {
      activities.push({ name, label: TOOL_LABELS[name], ok: false });
      console.error('[assistant-beta-tool]', name, e instanceof Error ? e.name : 'tool_error');
      return e instanceof ErrorFuncionesNutrikal ? { error: e.message, codigo: e.codigo } : { error: 'No pude completar esta operación. El calendario sigue igual.' };
    }
  }
  return { execute, drafts, activities };
}
