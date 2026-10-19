import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Intervalo } from './types.js';

export class ErrorFuncionesNutrikal extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensaje: string) { super(mensaje); this.name = 'ErrorFuncionesNutrikal'; this.codigo = codigo; }
}
export function exigir(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new ErrorFuncionesNutrikal('parametros_invalidos', mensaje);
}
export function fechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const date = parseISO(fecha);
  return !Number.isNaN(date.getTime()) && format(date, 'yyyy-MM-dd') === fecha;
}
export function validarIntervalo(intervalo: Intervalo, maximoDias = 366): void {
  exigir(intervalo && fechaValida(intervalo.desde) && fechaValida(intervalo.hasta), 'Indicá fechas válidas YYYY-MM-DD.');
  const dias = differenceInCalendarDays(parseISO(intervalo.hasta), parseISO(intervalo.desde));
  exigir(dias >= 0 && dias < maximoDias, `El intervalo debe cubrir entre 1 y ${maximoDias} días.`);
}
export function validarIds(ids: unknown, maximo = 200): asserts ids is string[] {
  exigir(Array.isArray(ids) && ids.length <= maximo && ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 150), `Los identificadores deben ser una lista de hasta ${maximo} textos válidos.`);
}
export const normalizarNombre = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
