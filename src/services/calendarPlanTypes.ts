import type { Meal, MealType, ShoppingList, WeekPlan } from '../types';

export type CalendarMeal = Meal & { date: string; mealType: MealType };
export type OverlapPolicy = 'fill' | 'replace' | 'alternatives';
export interface CalendarPlan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  source: WeekPlan;
}
export interface CalendarPlanningState {
  meals: CalendarMeal[];
  plans: CalendarPlan[];
  shoppingLists: ShoppingList[];
}
export interface CalendarPlanningSnapshot extends CalendarPlanningState {
  version: string;
}
export type CalendarOperation =
  | { kind: 'apply'; plan: WeekPlan; planId: string; policy: OverlapPolicy; startDate: string }
  | { kind: 'move'; planId: string; startDate: string; policy: OverlapPolicy }
  | { kind: 'remove'; planId: string }
  | { kind: 'choose'; date: string; mealType: MealType; optionId: string }
  | { kind: 'organize'; date: string; mealType: MealType; selectedMealId: string }
  | { kind: 'editMeal'; meal: CalendarMeal }
  | { kind: 'deleteMeal'; mealId: string }
  | { kind: 'undo'; operationId: string };
export interface CalendarChangeSummary {
  added: number;
  replaced: number;
  preserved: number;
  alternatives: number;
  protected: number;
}
export interface CalendarOperationResult extends CalendarPlanningSnapshot {
  operationId: string;
  summary: CalendarChangeSummary;
}
