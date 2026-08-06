import { describe, expect, it } from 'vitest';
import { buildCalendarSlotIntro, buildCalendarSlotOptions } from './calendarMealChat';

describe('buildCalendarSlotOptions', () => {
  it('includes generate and constraint chips for an empty slot', () => {
    const options = buildCalendarSlotOptions('desayuno', false);
    const labels = options.map((o) => o.label);

    expect(labels).toContain('Generame un desayuno.');
    expect(labels).toContain('Quiero algo rápido.');
    expect(labels).toContain('Algo con pollo.');
    expect(labels).toContain('Que sea económico.');
    expect(labels).not.toContain('Cambiame esta comida.');
    expect(options[0]?.action).toBe('generate_for_slot');
  });

  it('adds change suggestion when the slot already has a meal', () => {
    const options = buildCalendarSlotOptions('cena', true);
    expect(options[0]).toMatchObject({
      label: 'Cambiame esta comida.',
      action: 'generate_for_slot',
      payload: 'change',
    });
  });

  it('uses merienda label for snack', () => {
    const options = buildCalendarSlotOptions('snack', false);
    expect(options.some((o) => o.label === 'Generame una merienda.')).toBe(true);
  });
});

describe('buildCalendarSlotIntro', () => {
  it('mentions the meal and date for an empty slot', () => {
    expect(buildCalendarSlotIntro('almuerzo', 'hoy')).toContain('almuerzo');
    expect(buildCalendarSlotIntro('almuerzo', 'hoy')).toContain('hoy');
  });

  it('mentions the existing dish when present', () => {
    const text = buildCalendarSlotIntro('cena', 'hoy', 'Pollo al horno');
    expect(text).toContain('Pollo al horno');
    expect(text).toContain('cambiar');
  });
});
