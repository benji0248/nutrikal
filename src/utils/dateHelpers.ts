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
  isToday as isTodayFns,
  parseISO,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

export const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');
export const parseDate = (dateStr: string): Date => parseISO(dateStr);
export const todayKey = (): string => formatDateKey(new Date());
export const isToday = (date: Date): boolean => isTodayFns(date);
export const isSameDayCheck = (a: Date, b: Date): boolean => isSameDay(a, b);

export const getMonday = (date: Date): Date =>
  startOfWeek(date, { weekStartsOn: 1 });

export const getWeekDays = (date: Date): Date[] => {
  const start = getMonday(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const getWeekDayKeys = (dateStr: string): string[] =>
  getWeekDays(parseDate(dateStr)).map(formatDateKey);

export const getMonthGrid = (date: Date): (Date | null)[][] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  const firstDayOfWeek = getDay(start);
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  cells.push(...days);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
};

export const navigateDay = (dateStr: string, dir: 'prev' | 'next'): string => {
  const d = parseDate(dateStr);
  return formatDateKey(dir === 'next' ? addDays(d, 1) : addDays(d, -1));
};

export const navigateWeek = (dateStr: string, dir: 'prev' | 'next'): string => {
  const d = parseDate(dateStr);
  return formatDateKey(dir === 'next' ? addWeeks(d, 1) : subWeeks(d, 1));
};

export const navigateMonth = (dateStr: string, dir: 'prev' | 'next'): string => {
  const d = parseDate(dateStr);
  return formatDateKey(dir === 'next' ? addMonths(d, 1) : subMonths(d, 1));
};

export const getWeekRange = (dateStr: string): string => {
  const d = parseDate(dateStr);
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const end = endOfWeek(d, { weekStartsOn: 1 });
  return `${format(start, 'd', { locale: es })}–${format(end, "d MMM yyyy", { locale: es })}`;
};

export const getMonthLabel = (dateStr: string): string => {
  const d = parseDate(dateStr);
  return format(d, 'MMMM yyyy', { locale: es });
};

export const formatDayShort = (date: Date): string =>
  format(date, 'EEE d', { locale: es });

export const formatDayFull = (date: Date): string =>
  format(date, "EEEE d 'de' MMMM", { locale: es });

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
