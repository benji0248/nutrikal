import { describe, expect, it } from 'vitest';
import { buildWeekPlanOneShotPrompt, type WeekPlanningInput } from './weekPlanPrompts.js';

const baseWeekPlanning: WeekPlanningInput = {
  mealPattern: 'four',
  mealRhythmMode: 'carryover_dinner_to_lunch',
  flexMealsPerWeek: 1,
  flexMealScope: 'cena',
  activeSlots: ['desayuno', 'almuerzo', 'cena', 'snack'],
  cookingTime: 'normal',
  budget: 'normal',
};

describe('buildWeekPlanOneShotPrompt v3 criterio', () => {
  it('keeps structural contract and drops redundant culinary micro-rules', () => {
    const prompt = buildWeekPlanOneShotPrompt({
      profileName: 'Benja',
      nationality: 'Argentina',
      restrictions: ['sin gluten'],
      goal: 'lose',
      weekPlanning: baseWeekPlanning,
      weeklyPoolPrompt: 'CANASTA_TEST',
      weekDates: [
        '2026-08-10',
        '2026-08-11',
        '2026-08-12',
        '2026-08-13',
        '2026-08-14',
        '2026-08-15',
        '2026-08-16',
      ],
      dailyBudgetKcal: 2000,
      maintenanceBudgetKcal: 2400,
    });

    expect(prompt).toContain('prev.cena');
    expect(prompt).toContain('same:tX');
    expect(prompt).toContain('full_free');
    expect(prompt).toContain('templateId');
    expect(prompt).toContain('dayMode');
    expect(prompt).toContain('desayuno ~');
    expect(prompt).toContain('CANASTA_TEST');
    expect(prompt).toContain('sin gluten');
    expect(prompt).toContain('criterio culinario');
    expect(prompt).toContain('porciones humanas');
    expect(prompt).toContain('comidas caseras simples');

    expect(prompt).not.toMatch(/Patrones:/);
    expect(prompt).not.toMatch(/vos, dale, bárbaro/);
    expect(prompt).not.toMatch(/panizado casero/);
    expect(prompt).not.toMatch(/≤15 min/);
    expect(prompt).not.toMatch(/mínimo 2 opciones/);
  });
});
