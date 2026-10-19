import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { McpAccess } from './access.js';
import { MCP_TOOLS, MCP_VALIDATORS, MCP_MUTATIONS, MCP_GUIDE } from './catalog.js';
import { requestMcpReview, loadMcpReview } from './reviews.js';
import { getSupabase } from '../supabase.js';
import { crearFuncionesNutrikal } from '../../../src/domain/nutrikal/createFunctions.js';
import { crearRepositorioSupabase } from '../nutrikal/repository.js';
import { crearFuncionesPropuestas } from '../nutrikal/proposalFunctions.js';
import { INGREDIENTS_DB } from '../../../src/data/ingredients.js';
import { ejecutarFuncionNutrikal, FUNCTION_TOOL_LABELS } from '../assistantBeta/functionTools.js';
import type { ConsultaPrevisualizacion } from '../../../src/domain/nutrikal/proposalOperations.js';
import { ErrorFuncionesNutrikal, exigir } from '../../../src/domain/nutrikal/validation.js';

export function createNutrikalMcpServer(access: McpAccess, origin: string) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  const db = getSupabase();
  const funciones = crearFuncionesNutrikal({ usuarioId: access.userId, repositorio: crearRepositorioSupabase(db), catalogoBase: INGREDIENTS_DB, fechaReferencia: today });
  const propuestas = crearFuncionesPropuestas(access.userId, today);
  const allowed = MCP_TOOLS.filter((t) => access.canPropose || !MCP_MUTATIONS.has(t.name));
  const server = new Server({ name: 'nutrikal', version: '1.0.0' }, { capabilities: { tools: {}, resources: {}, prompts: {} }, instructions: `Fecha de referencia: ${today}; zona America/Argentina/Buenos_Aires. ${MCP_GUIDE}` });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allowed }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    if (!allowed.some((t) => t.name === name)) throw new McpError(ErrorCode.InvalidParams, 'Herramienta inexistente o fuera de los permisos de este acceso.');
    const checked = MCP_VALIDATORS.get(name)!(request.params.arguments ?? {});
    if (!checked.valid) throw new McpError(ErrorCode.InvalidParams, `Parámetros inválidos: ${checked.errorMessage}`);
    const p = checked.data;
    try {
      let output: Record<string, unknown>;
      if (Object.hasOwn(FUNCTION_TOOL_LABELS, name)) output = await ejecutarFuncionNutrikal(funciones, name, p, today);
      else switch (name) {
        case 'validar_propuesta': output = { ...await funciones.validarPropuesta(p.propuesta) }; break;
        case 'guardar_propuesta': {
          const saved = await propuestas.guardarPropuesta(p.propuesta, `mcp:${access.tokenId}:${p.requestId}`);
          output = { ...saved, calendarioModificado: false, enlaceBorrador: `${origin}/mcp?proposal=${saved.id}` }; break;
        }
        case 'leer_propuesta': output = { ...await propuestas.leerPropuesta(p.propuestaId as string) }; break;
        case 'previsualizar_cambios': output = { ...await propuestas.previsualizarCambios(p as unknown as ConsultaPrevisualizacion), calendarioModificado: false }; break;
        case 'aplicar_cambios': output = await requestMcpReview(access, 'apply', p.previsualizacionId as string, today, origin); break;
        case 'deshacer_operacion': output = await requestMcpReview(access, 'undo', p.operacionId as string, today, origin); break;
        case 'listar_propuestas': {
          const offset = Number(p.offset ?? 0), limite = Number(p.limite ?? 15);
          const rows = await db.from('nutrikal_proposals').select('id,content,created_at', { count: 'exact' }).eq('user_id', access.userId).order('created_at', { ascending: false }).order('id').range(offset, offset + limite - 1);
          if (rows.error) throw new Error('mcp_storage_error');
          output = { elementos: rows.data.map((r) => ({ id: r.id, titulo: r.content.titulo, creadaEn: r.created_at })), offset, limite, total: rows.count, hayMas: offset + rows.data.length < (rows.count ?? 0) }; break;
        }
        case 'consultar_operacion': {
          const own = await db.from('nutrikal_mcp_reviews').select('id').eq('user_id', access.userId).eq('token_id', access.tokenId).eq('id', p.solicitudId).maybeSingle();
          if (own.error) throw new Error('mcp_storage_error');
          exigir(own.data, 'No encontré esa solicitud para este acceso.');
          const review = await loadMcpReview(access.userId, p.solicitudId as string);
          output = { solicitudId: review.id, estado: review.undone ? 'deshecha' : review.applied ? 'aplicada' : Date.parse(review.expiresAt) <= Date.now() ? 'vencida' : 'pendiente',
            operacionId: review.applied ? review.kind === 'apply' ? review.targetId : review.id : null,
            calendarioModificado: review.applied && !review.undone, enlaceRevision: `${origin}/mcp?review=${review.id}` }; break;
        }
        default: throw new McpError(ErrorCode.InvalidParams, 'Herramienta desconocida.');
      }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
    } catch (e) {
      if (e instanceof McpError) throw e;
      console.error('[nutrikal-mcp-tool]', name, e instanceof Error ? e.name : 'tool_error');
      return { isError: true, content: [{ type: 'text', text: e instanceof ErrorFuncionesNutrikal ? e.message : 'No pude completar la operación. No afirmes que se aplicó ningún cambio.' }] };
    }
  });
  const resources = [
    { uri: 'nutrikal://guide', name: 'Guía de Nutrikal', mimeType: 'text/markdown', description: 'Contexto, uso de herramientas, porciones, borradores y confirmación.' },
    { uri: 'nutrikal://contracts', name: 'Contratos de herramientas', mimeType: 'application/json', description: 'Esquemas JSON de las herramientas autorizadas para este acceso.' },
  ];
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));
  server.setRequestHandler(ReadResourceRequestSchema, async ({ params }) => {
    const resource = resources.find((r) => r.uri === params.uri);
    if (!resource) throw new McpError(ErrorCode.InvalidParams, 'Recurso inexistente.');
    return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.uri === 'nutrikal://guide' ? MCP_GUIDE : JSON.stringify(allowed) }] };
  });
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [{ name: 'organizar_comidas', description: 'Organizar una receta o comidas usando contexto real y borradores revisables.', arguments: [{ name: 'pedido', description: 'Qué quiere organizar la persona.', required: true }] }] }));
  server.setRequestHandler(GetPromptRequestSchema, async ({ params }) => {
    if (params.name !== 'organizar_comidas' || !params.arguments?.pedido || params.arguments.pedido.length > 6000) throw new McpError(ErrorCode.InvalidParams, 'Indicá un pedido de hasta 6000 caracteres.');
    return { description: 'Planificación contextual con Nutrikal', messages: [{ role: 'user', content: { type: 'text', text: `Usá Nutrikal para resolver este pedido. Consultá sus datos y herramientas según necesidad; diseñá vos las recetas y guardá borradores revisables. No modifiques el calendario sin confirmación en Nutrikal.\n\nPedido de la persona:\n${params.arguments.pedido}` } }] };
  });
  return server;
}
