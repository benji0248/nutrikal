import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

export const formatISO = (date: Date): string => format(date, 'yyyy-MM-dd');

export const parseDate = (dateStr: string): Date => parseISO(dateStr);

export const todayISO = (): string => formatISO(new Date());

export const getWeekDays = (dateStr: string): string[] => {
  const date = parseDate(dateStr);
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => formatISO(addDays(start, i)));
};

export const getMonthDays = (dateStr: string): string[] => {
  const date = parseDate(dateStr);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end }).map(formatISO);
};

export const getMonthCalendarGrid = (dateStr: string): (string | null)[] => {
  const date = parseDate(dateStr);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end }).map(formatISO);

  const firstDayOfWeek = getDay(start);
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const grid: (string | null)[] = Array.from({ length: offset }, () => null);
  grid.push(...days);

  while (grid.length % 7 !== 0) {
    grid.push(null);
  }

  return grid;
};

export const navigateWeek = (dateStr: string, direction: 'prev' | 'next'): string => {
  const date = parseDate(dateStr);
  return formatISO(direction === 'next' ? addWeeks(date, 1) : subWeeks(date, 1));
};

export const navigateMonth = (dateStr: string, direction: 'prev' | 'next'): string => {
  const date = parseDate(dateStr);
  return formatISO(direction === 'next' ? addMonths(date, 1) : subMonths(date, 1));
};

export const isDateToday = (dateStr: string): boolean => isToday(parseDate(dateStr));

export const isSameDate = (a: string, b: string): boolean =>
  isSameDay(parseDate(a), parseDate(b));

export const formatDayLabel = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return format(date, 'EEE d', { locale: es });
};

export const formatDayFull = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return format(date, "EEEE d 'de' MMMM", { locale: es });
};

export const formatMonthYear = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return format(date, 'MMMM yyyy', { locale: es });
};

export const formatWeekRange = (dateStr: string): string => {
  const date = parseDate(dateStr);
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`;
};

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const getWeekStart = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return formatISO(startOfWeek(date, { weekStartsOn: 1 }));
};
