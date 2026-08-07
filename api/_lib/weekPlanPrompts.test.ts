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

describe('buildWeekPlanOneShotPrompt v3.1 inventory', () => {
  it('puts menu decisions before inventory and drops non-decision noise', () => {
    const prompt = buildWeekPlanOneShotPrompt({
      profileName: 'Benja',
      nationality: 'Argentina',
      restrictions: ['sin gluten'],
      goal: 'lose',
      weekPlanning: baseWeekPlanning,
      weeklyPoolPrompt: 'POOL_TEST',
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
    expect(prompt).toContain('POOL_TEST');
    expect(prompt).toContain('sin gluten');
    expect(prompt).toContain('criterio culinario');
    expect(prompt).toContain('porciones humanas');
    expect(prompt).toContain('comidas caseras simples');
    expect(prompt).toContain('# Inventario (despensa disponible)');
    expect(prompt).toContain('Pensá primero el plato');
    expect(prompt).toContain('Nunca diseñes un plato para aprovechar ingredientes disponibles');
    expect(prompt).toContain('Objetivo: bajar de peso');
    expect(prompt).toContain('Cocina cotidiana de Argentina');

    // profileName is unused noise for menu decisions
    expect(prompt).not.toContain('Benja');
    expect(prompt).not.toMatch(/hablá en el español local/);
    expect(prompt).not.toMatch(/Usuario de Argentina/);
    expect(prompt).not.toMatch(/# Canasta/);
    expect(prompt).not.toMatch(/Patrones:/);
    expect(prompt).not.toMatch(/vos, dale, bárbaro/);
    expect(prompt).not.toMatch(/panizado casero/);
    expect(prompt).not.toMatch(/mínimo 2 opciones/);

    // Inventory after plan structure
    const planIdx = prompt.indexOf('# Plan y salida');
    const inventoryIdx = prompt.indexOf('# Inventario');
    expect(planIdx).toBeGreaterThan(-1);
    expect(inventoryIdx).toBeGreaterThan(planIdx);

    // Goal before inventory
    const goalIdx = prompt.indexOf('Objetivo: bajar de peso');
    expect(goalIdx).toBeGreaterThan(-1);
    expect(goalIdx).toBeLessThan(inventoryIdx);
  });
});
