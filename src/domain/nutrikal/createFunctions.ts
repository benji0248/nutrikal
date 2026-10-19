import { addDays, format, parseISO } from 'date-fns';
import type { CalculatorEntry, Ingredient } from '../../types/index.js';
import * as dominio from './functions.js';
import type { ConsultaComidas, CriteriosSeleccion, FiltrosIngredientes, Intervalo, RepositorioNutrikal } from './types.js';
import { ErrorFuncionesNutrikal, exigir, fechaValida, validarIds, validarIntervalo } from './validation.js';

/** Create one per authenticated request. No shared cache, provider, chat state or database writes. */
export function crearFuncionesNutrikal(deps: { usuarioId: string; repositorio: RepositorioNutrikal; catalogoBase: Ingredient[]; fechaReferencia: string }) {
  exigir(typeof deps.usuarioId === 'string' && deps.usuarioId.length > 0, 'Falta la identidad del usuario.');
  exigir(fechaValida(deps.fechaReferencia), 'La fecha de referencia es inválida.');
  const { usuarioId, repositorio, fechaReferencia } = deps;
  let perfil: ReturnType<RepositorioNutrikal['leerContexto']> | undefined;
  let catalogo: Promise<Ingredient[]> | undefined;
  let senales: ReturnType<RepositorioNutrikal['leerSenales']> | undefined;
  const comidas = new Map<string, ReturnType<RepositorioNutrikal['leerComidas']>>();
  const intervalo = (dias: number): Intervalo => ({ desde: format(addDays(parseISO(fechaReferencia), 1 - dias), 'yyyy-MM-dd'), hasta: fechaReferencia });
  const contexto = () => perfil ??= repositorio.leerContexto(usuarioId);
  const ingredientes = () => catalogo ??= repositorio.leerIngredientesPropios(usuarioId).then((propios) => {
    const todos = [...deps.catalogoBase, ...propios];
    if (new Set(todos.map((ing) => ing.id)).size !== todos.length) throw new ErrorFuncionesNutrikal('catalogo_ambiguo', 'El catálogo tiene identificadores duplicados. No puedo elegir valores nutricionales con seguridad.');
    return todos;
  });
  const leerSenales = () => senales ??= repositorio.leerSenales(usuarioId, intervalo(120));
  function leerComidas(rango: Intervalo) {
    validarIntervalo(rango);
    const key = `${rango.desde}:${rango.hasta}`;
    if (!comidas.has(key)) comidas.set(key, repositorio.leerComidas(usuarioId, rango));
    return comidas.get(key)!;
  }
  async function preferencias() {
    const perfil = await contexto();
    if (!perfil.preferencias) throw new ErrorFuncionesNutrikal('perfil_requerido', 'Completá tu perfil para aplicar preferencias y restricciones.');
    return perfil.preferencias;
  }
  async function uso(rango = intervalo(21)) {
    validarIntervalo(rango, 120);
    exigir(rango.hasta <= fechaReferencia, 'El uso reciente no puede incluir fechas futuras. Consultá el calendario para ver lo planificado a futuro.');
    const [catalogo, registros] = await Promise.all([ingredientes(), leerComidas(rango)]);
    return dominio.obtenerUsoRecienteIngredientes(catalogo, registros, rango);
  }
  return {
    obtenerObjetivo: async () => dominio.obtenerObjetivo(await contexto()),
    obtenerPreferencias: async () => dominio.obtenerPreferencias(await contexto()),
    obtenerRutina: async () => dominio.obtenerRutina(await contexto()),
    obtenerComidas: async (consulta: ConsultaComidas) => dominio.obtenerComidas(await leerComidas(consulta), consulta),
    buscarIngredientes: async (filtros: FiltrosIngredientes = {}) => dominio.buscarIngredientes(await ingredientes(), filtros),
    obtenerAfinidadIngredientes: async (ids: string[]) => {
      validarIds(ids);
      exigir(ids.length > 0, 'Indicá al menos un ingrediente para consultar su afinidad.');
      const [catalogo, prefs, eventos] = await Promise.all([ingredientes(), preferencias(), leerSenales()]);
      const candidatos = catalogo.filter((ing) => ids.includes(ing.id));
      return { ingredientes: dominio.obtenerAfinidadIngredientes(candidatos, prefs, eventos, fechaReferencia),
        idsDesconocidos: ids.filter((id) => !candidatos.some((ing) => ing.id === id)), fechaReferencia,
        interpretacion: 'La puntuación proviene de señales de uso; no demuestra un gusto declarado. Las exclusiones y restricciones son obligatorias.' };
    },
    obtenerUsoRecienteIngredientes: uso,
    seleccionarIngredientes: async (criterios: CriteriosSeleccion) => {
      const [catalogo, prefs, eventos, recientes, perfil] = await Promise.all([ingredientes(), preferencias(), leerSenales(), uso(), contexto()]);
      const afinidades = dominio.obtenerAfinidadIngredientes(catalogo, prefs, eventos, fechaReferencia);
      return dominio.seleccionarIngredientes(catalogo, prefs, afinidades, recientes, criterios, perfil.historialCanastas);
    },
    calcularNutrientes: async (entradas: CalculatorEntry[], porciones = 1) => dominio.calcularNutrientes(await ingredientes(), entradas, porciones),
  };
}

export type FuncionesNutrikal = ReturnType<typeof crearFuncionesNutrikal>;
