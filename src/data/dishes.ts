import type { Dish } from '../types';

/**
 * ~80 platos argentinos. Los macros se calculan dinámicamente
 * usando los IDs de INGREDIENTS_DB.
 */
export const DISHES_DB: Dish[] = [
  // ── DESAYUNO (15) ──
  {
    id: 'dish_001',
    name: 'Tostadas con queso crema y palta',
    category: 'desayuno',
    tags: ['rapido', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_127', grams: 60 },  // Pan integral
      { ingredientId: 'ing_106', grams: 30 },  // Queso crema
      { ingredientId: 'ing_099', grams: 50 },  // Palta
    ],
    defaultServings: 1,
    prepMinutes: 5,
    humanPortion: '2 tostadas',
  },
  {
    id: 'dish_002',
    name: 'Avena con banana y miel',
    category: 'desayuno',
    tags: ['rapido', 'economico', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_132', grams: 50 },  // Avena
      { ingredientId: 'ing_101', grams: 200 }, // Leche entera
      { ingredientId: 'ing_076', grams: 100 }, // Banana
      { ingredientId: 'ing_264', grams: 15 },  // Miel
    ],
    defaultServings: 1,
    prepMinutes: 5,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_003',
    name: 'Yogur con granola y frutas',
    category: 'desayuno',
    tags: ['rapido', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_105', grams: 170 }, // Yogur griego
      { ingredientId: 'ing_133', grams: 40 },  // Granola
      { ingredientId: 'ing_082', grams: 80 },  // Frutilla
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_004',
    name: 'Huevos revueltos con tostada',
    category: 'desayuno',
    tags: ['rapido', 'alto_proteina'],
    ingredients: [
      { ingredientId: 'ing_032', grams: 120 }, // 2 huevos
      { ingredientId: 'ing_117', grams: 10 },  // Manteca
      { ingredientId: 'ing_126', grams: 50 },  // Pan blanco
    ],
    defaultServings: 1,
    prepMinutes: 8,
    humanPortion: '2 huevos + 1 tostada',
  },
  {
    id: 'dish_005',
    name: 'Tostadas con mermelada',
    category: 'desayuno',
    tags: ['rapido', 'economico', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_128', grams: 60 },  // Pan lactal
      { ingredientId: 'ing_117', grams: 10 },  // Manteca
      { ingredientId: 'ing_210', grams: 25 },  // Mermelada
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '2 tostadas',
  },
  {
    id: 'dish_006',
    name: 'Licuado de banana',
    category: 'desayuno',
    tags: ['rapido', 'economico', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_076', grams: 150 }, // Banana
      { ingredientId: 'ing_101', grams: 250 }, // Leche entera
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 vaso grande',
  },
  {
    id: 'dish_007',
    name: 'Medialunas con café con leche',
    category: 'desayuno',
    tags: ['rapido', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_198', grams: 100 }, // 2 medialunas
      { ingredientId: 'ing_182', grams: 250 }, // Café con leche
    ],
    defaultServings: 1,
    prepMinutes: 2,
    humanPortion: '2 medialunas + 1 taza',
  },
  {
    id: 'dish_008',
    name: 'Overnight oats con chía',
    category: 'desayuno',
    tags: ['alto_proteina', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_132', grams: 50 },  // Avena
      { ingredientId: 'ing_163', grams: 15 },  // Chía
      { ingredientId: 'ing_104', grams: 150 }, // Yogur descremado
      { ingredientId: 'ing_083', grams: 50 },  // Arándanos
    ],
    defaultServings: 1,
    prepMinutes: 5,
    humanPortion: '1 frasco',
  },
  {
    id: 'dish_009',
    name: 'Tostada con manteca de maní y banana',
    category: 'desayuno',
    tags: ['rapido', 'alto_proteina', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_127', grams: 40 },  // Pan integral
      { ingredientId: 'ing_167', grams: 20 },  // Manteca de maní
      { ingredientId: 'ing_076', grams: 60 },  // Banana
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 tostada',
  },
  {
    id: 'dish_010',
    name: 'Panqueques con dulce de leche',
    category: 'desayuno',
    tags: ['comfort', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_262', grams: 200 }, // Panqueques con DDL
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '3 panqueques',
  },
  {
    id: 'dish_011',
    name: 'Omelette de queso',
    category: 'desayuno',
    tags: ['rapido', 'alto_proteina', 'bajo_carb', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_032', grams: 180 }, // 3 huevos
      { ingredientId: 'ing_111', grams: 40 },  // Mozzarella
      { ingredientId: 'ing_117', grams: 5 },   // Manteca
    ],
    defaultServings: 1,
    prepMinutes: 8,
    humanPortion: '1 omelette',
  },
  {
    id: 'dish_012',
    name: 'Smoothie proteico',
    category: 'desayuno',
    tags: ['rapido', 'alto_proteina'],
    ingredients: [
      { ingredientId: 'ing_266', grams: 30 },  // Whey
      { ingredientId: 'ing_076', grams: 100 }, // Banana
      { ingredientId: 'ing_101', grams: 200 }, // Leche
      { ingredientId: 'ing_132', grams: 20 },  // Avena
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 vaso grande',
  },
  {
    id: 'dish_013',
    name: 'Tostadas de arroz con queso untable',
    category: 'desayuno',
    tags: ['rapido', 'liviano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_139', grams: 30 },  // Tostadas de arroz
      { ingredientId: 'ing_107', grams: 40 },  // Queso untable light
    ],
    defaultServings: 1,
    prepMinutes: 2,
    humanPortion: '3 tostadas',
  },
  {
    id: 'dish_014',
    name: 'Frutas con yogur',
    category: 'desayuno',
    tags: ['rapido', 'liviano', 'vegetariano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_103', grams: 200 }, // Yogur natural
      { ingredientId: 'ing_077', grams: 100 }, // Manzana
      { ingredientId: 'ing_076', grams: 80 },  // Banana
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_015',
    name: 'Café con leche y galletitas',
    category: 'desayuno',
    tags: ['rapido', 'economico'],
    ingredients: [
      { ingredientId: 'ing_182', grams: 250 }, // Café con leche
      { ingredientId: 'ing_137', grams: 30 },  // Galletitas de agua
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 taza + 4 galletitas',
  },

  // ── ALMUERZO (25) ──
  {
    id: 'dish_016',
    name: 'Milanesa de pollo con ensalada',
    category: 'almuerzo',
    tags: ['alto_proteina', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_228', grams: 200 }, // Milanesa de pollo
      { ingredientId: 'ing_036', grams: 80 },  // Lechuga
      { ingredientId: 'ing_037', grams: 100 }, // Tomate
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
    ],
    defaultServings: 1,
    prepMinutes: 20,
    humanPortion: '1 milanesa + ensalada',
  },
  {
    id: 'dish_017',
    name: 'Milanesa napolitana con puré',
    category: 'almuerzo',
    tags: ['alto_proteina', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_229', grams: 200 }, // Milanesa de carne
      { ingredientId: 'ing_037', grams: 80 },  // Tomate (salsa)
      { ingredientId: 'ing_111', grams: 50 },  // Mozzarella
      { ingredientId: 'ing_040', grams: 200 }, // Papa (puré)
      { ingredientId: 'ing_101', grams: 50 },  // Leche
      { ingredientId: 'ing_117', grams: 15 },  // Manteca
    ],
    defaultServings: 1,
    prepMinutes: 30,
    humanPortion: '1 milanesa + puré',
  },
  {
    id: 'dish_018',
    name: 'Pollo al horno con papas',
    category: 'almuerzo',
    tags: ['alto_proteina', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_254', grams: 250 }, // Pollo al horno
      { ingredientId: 'ing_040', grams: 200 }, // Papa
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
    ],
    defaultServings: 1,
    prepMinutes: 45,
    humanPortion: '1 presa + papas',
  },
  {
    id: 'dish_019',
    name: 'Guiso de lentejas',
    category: 'almuerzo',
    tags: ['economico', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_241', grams: 400 }, // Guiso de lentejas
    ],
    defaultServings: 1,
    prepMinutes: 40,
    humanPortion: '1 plato hondo',
  },
  {
    id: 'dish_020',
    name: 'Fideos con salsa bolognesa',
    category: 'almuerzo',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_124', grams: 100 }, // Fideos secos
      { ingredientId: 'ing_008', grams: 100 }, // Carne picada magra
      { ingredientId: 'ing_037', grams: 100 }, // Tomate
      { ingredientId: 'ing_038', grams: 50 },  // Cebolla
      { ingredientId: 'ing_108', grams: 10 },  // Queso rallado
    ],
    defaultServings: 1,
    prepMinutes: 25,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_021',
    name: 'Empanadas de carne (3 unidades)',
    category: 'almuerzo',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_230', grams: 360 }, // 3 empanadas
    ],
    defaultServings: 1,
    prepMinutes: 30,
    humanPortion: '3 empanadas',
  },
  {
    id: 'dish_022',
    name: 'Ensalada completa de pollo',
    category: 'almuerzo',
    tags: ['alto_proteina', 'liviano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_001', grams: 150 }, // Pechuga
      { ingredientId: 'ing_036', grams: 100 }, // Lechuga
      { ingredientId: 'ing_037', grams: 100 }, // Tomate
      { ingredientId: 'ing_099', grams: 50 },  // Palta
      { ingredientId: 'ing_042', grams: 80 },  // Choclo
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 ensaladera',
  },
  {
    id: 'dish_023',
    name: 'Arroz con pollo',
    category: 'almuerzo',
    tags: ['economico', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_253', grams: 350 }, // Arroz con pollo
    ],
    defaultServings: 1,
    prepMinutes: 35,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_024',
    name: 'Tarta de jamón y queso',
    category: 'almuerzo',
    tags: ['comfort', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_246', grams: 250 }, // Porción de tarta
    ],
    defaultServings: 1,
    prepMinutes: 40,
    humanPortion: '1 porción',
  },
  {
    id: 'dish_025',
    name: 'Tarta de verdura',
    category: 'almuerzo',
    tags: ['vegetariano', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_247', grams: 250 }, // Porción tarta verdura
    ],
    defaultServings: 1,
    prepMinutes: 40,
    humanPortion: '1 porción',
  },
  {
    id: 'dish_026',
    name: 'Bife de chorizo con ensalada',
    category: 'almuerzo',
    tags: ['alto_proteina', 'bajo_carb', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_005', grams: 200 }, // Bife de chorizo
      { ingredientId: 'ing_036', grams: 80 },  // Lechuga
      { ingredientId: 'ing_037', grams: 80 },  // Tomate
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 bife + ensalada',
  },
  {
    id: 'dish_027',
    name: 'Ravioles con tuco',
    category: 'almuerzo',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_249', grams: 300 }, // Ravioles
      { ingredientId: 'ing_037', grams: 100 }, // Tomate (tuco)
      { ingredientId: 'ing_108', grams: 10 },  // Queso rallado
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_028',
    name: 'Ñoquis con salsa',
    category: 'almuerzo',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_250', grams: 300 }, // Ñoquis
      { ingredientId: 'ing_037', grams: 100 }, // Tomate
      { ingredientId: 'ing_108', grams: 15 },  // Queso rallado
    ],
    defaultServings: 1,
    prepMinutes: 20,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_029',
    name: 'Hamburguesa casera completa',
    category: 'almuerzo',
    tags: ['comfort', 'alto_proteina'],
    ingredients: [
      { ingredientId: 'ing_008', grams: 150 }, // Carne picada
      { ingredientId: 'ing_126', grams: 80 },  // Pan
      { ingredientId: 'ing_036', grams: 30 },  // Lechuga
      { ingredientId: 'ing_037', grams: 40 },  // Tomate
      { ingredientId: 'ing_112', grams: 25 },  // Cheddar
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 hamburguesa',
  },
  {
    id: 'dish_030',
    name: 'Salmón con arroz yamaní',
    category: 'almuerzo',
    tags: ['alto_proteina', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_014', grams: 150 }, // Salmón
      { ingredientId: 'ing_123', grams: 200 }, // Arroz yamaní cocido
      { ingredientId: 'ing_095', grams: 15 },  // Limón
    ],
    defaultServings: 1,
    prepMinutes: 20,
    humanPortion: '1 filet + arroz',
  },
  {
    id: 'dish_031',
    name: 'Pastel de papa',
    category: 'almuerzo',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_245', grams: 350 }, // Pastel de papa
    ],
    defaultServings: 1,
    prepMinutes: 40,
    humanPortion: '1 porción generosa',
  },
  {
    id: 'dish_032',
    name: 'Wok de pollo con verduras',
    category: 'almuerzo',
    tags: ['rapido', 'alto_proteina', 'liviano'],
    ingredients: [
      { ingredientId: 'ing_001', grams: 150 }, // Pechuga
      { ingredientId: 'ing_050', grams: 80 },  // Morrón
      { ingredientId: 'ing_038', grams: 50 },  // Cebolla
      { ingredientId: 'ing_046', grams: 80 },  // Brócoli
      { ingredientId: 'ing_206', grams: 15 },  // Salsa de soja
      { ingredientId: 'ing_121', grams: 150 }, // Arroz blanco
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 plato hondo',
  },
  {
    id: 'dish_033',
    name: 'Lasaña de carne',
    category: 'almuerzo',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_251', grams: 350 }, // Lasaña
    ],
    defaultServings: 1,
    prepMinutes: 50,
    humanPortion: '1 porción',
  },
  {
    id: 'dish_034',
    name: 'Ensalada de quinoa',
    category: 'almuerzo',
    tags: ['liviano', 'vegetariano', 'sin_gluten', 'vegano'],
    ingredients: [
      { ingredientId: 'ing_134', grams: 200 }, // Quinoa cocida
      { ingredientId: 'ing_037', grams: 80 },  // Tomate
      { ingredientId: 'ing_052', grams: 60 },  // Pepino
      { ingredientId: 'ing_099', grams: 50 },  // Palta
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
      { ingredientId: 'ing_095', grams: 10 },  // Limón
    ],
    defaultServings: 1,
    prepMinutes: 10,
    humanPortion: '1 ensaladera',
  },
  {
    id: 'dish_035',
    name: 'Merluza al horno con verduras',
    category: 'almuerzo',
    tags: ['liviano', 'alto_proteina', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_013', grams: 200 }, // Merluza
      { ingredientId: 'ing_040', grams: 150 }, // Papa
      { ingredientId: 'ing_039', grams: 80 },  // Zanahoria
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
      { ingredientId: 'ing_095', grams: 10 },  // Limón
    ],
    defaultServings: 1,
    prepMinutes: 30,
    humanPortion: '1 filet + verduras',
  },
  {
    id: 'dish_036',
    name: 'Canelones de verdura',
    category: 'almuerzo',
    tags: ['comfort', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_248', grams: 350 }, // Canelones
    ],
    defaultServings: 1,
    prepMinutes: 45,
    humanPortion: '3 canelones',
  },
  {
    id: 'dish_037',
    name: 'Locro',
    category: 'almuerzo',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_242', grams: 400 }, // Locro
    ],
    defaultServings: 1,
    prepMinutes: 90,
    humanPortion: '1 plato hondo',
  },
  {
    id: 'dish_038',
    name: 'Polenta con salsa',
    category: 'almuerzo',
    tags: ['economico', 'comfort', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_135', grams: 300 }, // Polenta cocida
      { ingredientId: 'ing_037', grams: 100 }, // Tomate
      { ingredientId: 'ing_108', grams: 15 },  // Queso rallado
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_039',
    name: 'Tortilla de papa',
    category: 'almuerzo',
    tags: ['economico', 'comfort', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_257', grams: 250 }, // Tortilla de papa
    ],
    defaultServings: 1,
    prepMinutes: 20,
    humanPortion: '1 porción',
  },
  {
    id: 'dish_040',
    name: 'Ensalada César',
    category: 'almuerzo',
    tags: ['liviano'],
    ingredients: [
      { ingredientId: 'ing_255', grams: 300 }, // Ensalada César
    ],
    defaultServings: 1,
    prepMinutes: 10,
    humanPortion: '1 ensaladera',
  },

  // ── CENA (20) ──
  {
    id: 'dish_041',
    name: 'Pechuga grillada con ensalada mixta',
    category: 'cena',
    tags: ['alto_proteina', 'liviano', 'bajo_carb', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_001', grams: 180 }, // Pechuga
      { ingredientId: 'ing_036', grams: 80 },  // Lechuga
      { ingredientId: 'ing_037', grams: 80 },  // Tomate
      { ingredientId: 'ing_052', grams: 60 },  // Pepino
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 pechuga + ensalada',
  },
  {
    id: 'dish_042',
    name: 'Pizza casera de muzzarella',
    category: 'cena',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_233', grams: 300 }, // Pizza muzzarella
    ],
    defaultServings: 1,
    prepMinutes: 25,
    humanPortion: '2 porciones',
  },
  {
    id: 'dish_043',
    name: 'Sándwich de lomo completo',
    category: 'cena',
    tags: ['comfort', 'alto_proteina'],
    ingredients: [
      { ingredientId: 'ing_006', grams: 150 }, // Lomo
      { ingredientId: 'ing_126', grams: 100 }, // Pan
      { ingredientId: 'ing_036', grams: 30 },  // Lechuga
      { ingredientId: 'ing_037', grams: 50 },  // Tomate
      { ingredientId: 'ing_032', grams: 60 },  // 1 huevo
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 sándwich',
  },
  {
    id: 'dish_044',
    name: 'Suprema de pollo con puré',
    category: 'cena',
    tags: ['comfort', 'alto_proteina'],
    ingredients: [
      { ingredientId: 'ing_228', grams: 200 }, // Milanesa de pollo
      { ingredientId: 'ing_040', grams: 200 }, // Papa
      { ingredientId: 'ing_101', grams: 50 },  // Leche
      { ingredientId: 'ing_117', grams: 10 },  // Manteca
    ],
    defaultServings: 1,
    prepMinutes: 25,
    humanPortion: '1 suprema + puré',
  },
  {
    id: 'dish_045',
    name: 'Estofado de carne',
    category: 'cena',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_244', grams: 350 }, // Estofado
    ],
    defaultServings: 1,
    prepMinutes: 50,
    humanPortion: '1 plato hondo',
  },
  {
    id: 'dish_046',
    name: 'Revuelto gramajo',
    category: 'cena',
    tags: ['rapido', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_258', grams: 300 }, // Revuelto gramajo
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_047',
    name: 'Sopa de calabaza',
    category: 'cena',
    tags: ['liviano', 'vegetariano', 'economico', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_044', grams: 300 }, // Calabaza
      { ingredientId: 'ing_038', grams: 50 },  // Cebolla
      { ingredientId: 'ing_115', grams: 30 },  // Crema
      { ingredientId: 'ing_126', grams: 30 },  // Pan (croutons)
    ],
    defaultServings: 1,
    prepMinutes: 25,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_048',
    name: 'Bondiola al horno con batata',
    category: 'cena',
    tags: ['alto_proteina', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_240', grams: 200 }, // Bondiola al horno
      { ingredientId: 'ing_041', grams: 200 }, // Batata
    ],
    defaultServings: 1,
    prepMinutes: 50,
    humanPortion: '2 rodajas + batata',
  },
  {
    id: 'dish_049',
    name: 'Fideos integrales con pesto',
    category: 'cena',
    tags: ['rapido', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_125', grams: 90 },  // Fideos integrales
      { ingredientId: 'ing_064', grams: 20 },  // Albahaca
      { ingredientId: 'ing_156', grams: 15 },  // Aceite oliva
      { ingredientId: 'ing_108', grams: 15 },  // Queso rallado
      { ingredientId: 'ing_159', grams: 15 },  // Almendras
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_050',
    name: 'Wrap de pollo',
    category: 'cena',
    tags: ['rapido', 'alto_proteina'],
    ingredients: [
      { ingredientId: 'ing_001', grams: 120 }, // Pechuga
      { ingredientId: 'ing_130', grams: 40 },  // Tortilla/wrap (harina)
      { ingredientId: 'ing_036', grams: 30 },  // Lechuga
      { ingredientId: 'ing_037', grams: 40 },  // Tomate
      { ingredientId: 'ing_107', grams: 20 },  // Queso untable
    ],
    defaultServings: 1,
    prepMinutes: 10,
    humanPortion: '1 wrap',
  },
  {
    id: 'dish_051',
    name: 'Omelette de verduras',
    category: 'cena',
    tags: ['rapido', 'liviano', 'vegetariano', 'bajo_carb', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_032', grams: 120 }, // 2 huevos
      { ingredientId: 'ing_045', grams: 60 },  // Espinaca
      { ingredientId: 'ing_066', grams: 50 },  // Champiñones
      { ingredientId: 'ing_111', grams: 30 },  // Mozzarella
    ],
    defaultServings: 1,
    prepMinutes: 10,
    humanPortion: '1 omelette',
  },
  {
    id: 'dish_052',
    name: 'Carbonada',
    category: 'cena',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_243', grams: 350 }, // Carbonada
    ],
    defaultServings: 1,
    prepMinutes: 45,
    humanPortion: '1 plato hondo',
  },
  {
    id: 'dish_053',
    name: 'Asado con ensalada',
    category: 'cena',
    tags: ['alto_proteina', 'comfort', 'bajo_carb', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_236', grams: 200 }, // Asado de tira
      { ingredientId: 'ing_036', grams: 60 },  // Lechuga
      { ingredientId: 'ing_037', grams: 60 },  // Tomate
      { ingredientId: 'ing_038', grams: 30 },  // Cebolla
    ],
    defaultServings: 1,
    prepMinutes: 60,
    humanPortion: '2 tiras + ensalada',
  },
  {
    id: 'dish_054',
    name: 'Ensalada tibia de lentejas',
    category: 'cena',
    tags: ['liviano', 'economico', 'vegetariano', 'vegano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_146', grams: 200 }, // Lentejas cocidas
      { ingredientId: 'ing_050', grams: 60 },  // Morrón
      { ingredientId: 'ing_038', grams: 40 },  // Cebolla
      { ingredientId: 'ing_156', grams: 10 },  // Aceite oliva
      { ingredientId: 'ing_095', grams: 10 },  // Limón
    ],
    defaultServings: 1,
    prepMinutes: 10,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_055',
    name: 'Matambre a la pizza',
    category: 'cena',
    tags: ['alto_proteina', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_238', grams: 200 }, // Matambre
      { ingredientId: 'ing_037', grams: 80 },  // Tomate
      { ingredientId: 'ing_111', grams: 50 },  // Mozzarella
      { ingredientId: 'ing_270', grams: 2 },   // Orégano
    ],
    defaultServings: 1,
    prepMinutes: 20,
    humanPortion: '1 porción generosa',
  },
  {
    id: 'dish_056',
    name: 'Sushi de salmón (8 piezas)',
    category: 'cena',
    tags: ['liviano'],
    ingredients: [
      { ingredientId: 'ing_252', grams: 240 }, // Sushi maki ~8pzas
      { ingredientId: 'ing_014', grams: 60 },  // Salmón extra
      { ingredientId: 'ing_206', grams: 10 },  // Salsa de soja
    ],
    defaultServings: 1,
    prepMinutes: 30,
    humanPortion: '8 piezas',
  },
  {
    id: 'dish_057',
    name: 'Choripán',
    category: 'cena',
    tags: ['comfort', 'rapido'],
    ingredients: [
      { ingredientId: 'ing_239', grams: 250 }, // Choripán
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 choripán',
  },
  {
    id: 'dish_058',
    name: 'Tostado de jamón y queso',
    category: 'cena',
    tags: ['rapido', 'economico'],
    ingredients: [
      { ingredientId: 'ing_128', grams: 60 },  // Pan lactal
      { ingredientId: 'ing_022', grams: 40 },  // Jamón cocido
      { ingredientId: 'ing_109', grams: 30 },  // Queso pategras
    ],
    defaultServings: 1,
    prepMinutes: 5,
    humanPortion: '1 tostado',
  },
  {
    id: 'dish_059',
    name: 'Fideos con crema y champiñones',
    category: 'cena',
    tags: ['rapido', 'vegetariano', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_124', grams: 90 },  // Fideos
      { ingredientId: 'ing_066', grams: 100 }, // Champiñones
      { ingredientId: 'ing_115', grams: 50 },  // Crema
      { ingredientId: 'ing_108', grams: 10 },  // Queso rallado
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '1 plato',
  },
  {
    id: 'dish_060',
    name: 'Ensalada rusa',
    category: 'cena',
    tags: ['liviano', 'vegetariano', 'economico'],
    ingredients: [
      { ingredientId: 'ing_256', grams: 300 }, // Ensalada rusa
    ],
    defaultServings: 1,
    prepMinutes: 20,
    humanPortion: '1 plato',
  },

  // ── SNACK (12) ──
  {
    id: 'dish_061',
    name: 'Frutas de estación',
    category: 'snack',
    tags: ['rapido', 'liviano', 'vegetariano', 'vegano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_077', grams: 150 }, // Manzana
    ],
    defaultServings: 1,
    prepMinutes: 1,
    humanPortion: '1 fruta',
  },
  {
    id: 'dish_062',
    name: 'Mix de frutos secos',
    category: 'snack',
    tags: ['rapido', 'alto_proteina', 'vegano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_159', grams: 15 },  // Almendras
      { ingredientId: 'ing_160', grams: 15 },  // Nueces
      { ingredientId: 'ing_161', grams: 10 },  // Castañas de cajú
    ],
    defaultServings: 1,
    prepMinutes: 1,
    humanPortion: '1 puñado',
  },
  {
    id: 'dish_063',
    name: 'Yogur con granola',
    category: 'snack',
    tags: ['rapido', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_104', grams: 170 }, // Yogur descremado
      { ingredientId: 'ing_133', grams: 30 },  // Granola
    ],
    defaultServings: 1,
    prepMinutes: 2,
    humanPortion: '1 vasito',
  },
  {
    id: 'dish_064',
    name: 'Barrita de cereal',
    category: 'snack',
    tags: ['rapido', 'economico'],
    ingredients: [
      { ingredientId: 'ing_196', grams: 25 },  // Barrita
    ],
    defaultServings: 1,
    prepMinutes: 0,
    humanPortion: '1 barrita',
  },
  {
    id: 'dish_065',
    name: 'Banana con manteca de maní',
    category: 'snack',
    tags: ['rapido', 'alto_proteina', 'vegetariano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_076', grams: 100 }, // Banana
      { ingredientId: 'ing_167', grams: 15 },  // Manteca de maní
    ],
    defaultServings: 1,
    prepMinutes: 1,
    humanPortion: '1 banana + 1 cda',
  },
  {
    id: 'dish_066',
    name: 'Tostadas de arroz con palta',
    category: 'snack',
    tags: ['rapido', 'liviano', 'vegano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_139', grams: 20 },  // Tostadas de arroz
      { ingredientId: 'ing_099', grams: 50 },  // Palta
    ],
    defaultServings: 1,
    prepMinutes: 2,
    humanPortion: '2 tostadas',
  },
  {
    id: 'dish_067',
    name: 'Gelatina light',
    category: 'snack',
    tags: ['rapido', 'liviano', 'sin_gluten', 'sin_lactosa'],
    ingredients: [
      { ingredientId: 'ing_272', grams: 200 }, // Gelatina light
    ],
    defaultServings: 1,
    prepMinutes: 0,
    humanPortion: '1 vasito',
  },
  {
    id: 'dish_068',
    name: 'Alfajor de maicena',
    category: 'snack',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_189', grams: 50 },  // Alfajor
    ],
    defaultServings: 1,
    prepMinutes: 0,
    humanPortion: '1 alfajor',
  },
  {
    id: 'dish_069',
    name: 'Chocolate negro',
    category: 'snack',
    tags: ['rapido', 'vegetariano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_191', grams: 25 },  // Chocolate negro
    ],
    defaultServings: 1,
    prepMinutes: 0,
    humanPortion: '2 cuadraditos',
  },
  {
    id: 'dish_070',
    name: 'Huevo duro',
    category: 'snack',
    tags: ['rapido', 'alto_proteina', 'bajo_carb', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_032', grams: 60 },  // 1 huevo
    ],
    defaultServings: 1,
    prepMinutes: 10,
    humanPortion: '1 huevo',
  },
  {
    id: 'dish_071',
    name: 'Galletitas integrales con queso',
    category: 'snack',
    tags: ['rapido'],
    ingredients: [
      { ingredientId: 'ing_138', grams: 30 },  // Galletitas integrales
      { ingredientId: 'ing_107', grams: 30 },  // Queso untable light
    ],
    defaultServings: 1,
    prepMinutes: 2,
    humanPortion: '4 galletitas',
  },
  {
    id: 'dish_072',
    name: 'Edamame',
    category: 'snack',
    tags: ['alto_proteina', 'vegano', 'sin_gluten', 'liviano'],
    ingredients: [
      { ingredientId: 'ing_155', grams: 100 }, // Edamame
    ],
    defaultServings: 1,
    prepMinutes: 5,
    humanPortion: '1 bowl chico',
  },

  // ── POSTRE (8) ──
  {
    id: 'dish_073',
    name: 'Flan con dulce de leche',
    category: 'postre',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_259', grams: 150 }, // Flan
      { ingredientId: 'ing_116', grams: 30 },  // Dulce de leche
    ],
    defaultServings: 1,
    prepMinutes: 0,
    humanPortion: '1 flan',
  },
  {
    id: 'dish_074',
    name: 'Arroz con leche',
    category: 'postre',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_261', grams: 200 }, // Arroz con leche
    ],
    defaultServings: 1,
    prepMinutes: 25,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_075',
    name: 'Budín de pan',
    category: 'postre',
    tags: ['comfort', 'economico'],
    ingredients: [
      { ingredientId: 'ing_260', grams: 120 }, // Budín de pan
    ],
    defaultServings: 1,
    prepMinutes: 40,
    humanPortion: '1 porción',
  },
  {
    id: 'dish_076',
    name: 'Helado de crema (2 bochas)',
    category: 'postre',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_202', grams: 120 }, // Helado
    ],
    defaultServings: 1,
    prepMinutes: 0,
    humanPortion: '2 bochas',
  },
  {
    id: 'dish_077',
    name: 'Ensalada de frutas',
    category: 'postre',
    tags: ['liviano', 'vegetariano', 'vegano', 'sin_gluten'],
    ingredients: [
      { ingredientId: 'ing_076', grams: 60 },  // Banana
      { ingredientId: 'ing_082', grams: 60 },  // Frutilla
      { ingredientId: 'ing_087', grams: 60 },  // Kiwi
      { ingredientId: 'ing_078', grams: 80 },  // Naranja
    ],
    defaultServings: 1,
    prepMinutes: 5,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_078',
    name: 'Yogur helado con berries',
    category: 'postre',
    tags: ['liviano', 'vegetariano'],
    ingredients: [
      { ingredientId: 'ing_104', grams: 200 }, // Yogur descremado
      { ingredientId: 'ing_082', grams: 50 },  // Frutilla
      { ingredientId: 'ing_083', grams: 30 },  // Arándanos
    ],
    defaultServings: 1,
    prepMinutes: 3,
    humanPortion: '1 bowl',
  },
  {
    id: 'dish_079',
    name: 'Panqueques con dulce de leche',
    category: 'postre',
    tags: ['comfort'],
    ingredients: [
      { ingredientId: 'ing_262', grams: 200 }, // Panqueques con DDL
    ],
    defaultServings: 1,
    prepMinutes: 15,
    humanPortion: '3 panqueques',
  },
  {
    id: 'dish_080',
    name: 'Dulce de membrillo con queso',
    category: 'postre',
    tags: ['rapido', 'comfort'],
    ingredients: [
      { ingredientId: 'ing_211', grams: 50 },  // Dulce de membrillo
      { ingredientId: 'ing_109', grams: 40 },  // Queso pategras
    ],
    defaultServings: 1,
    prepMinutes: 1,
    humanPortion: '1 porción',
  },
];
