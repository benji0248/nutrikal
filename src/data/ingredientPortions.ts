import type { IngredientPortion, IngredientCategory } from '../types';

/**
 * Lookup table: ingredientId → human-readable portion info.
 * Covers the ~120 ingredients used across DISHES_DB.
 */
export const INGREDIENT_PORTIONS: Record<string, IngredientPortion> = {
  // ── CARNES ──
  ing_001: { unit: 'pechuga', unitPlural: 'pechugas', gramsPerUnit: 180 },
  ing_005: { unit: 'bife', unitPlural: 'bifes', gramsPerUnit: 200 },
  ing_006: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 150 },
  ing_008: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 150 },
  ing_013: { unit: 'filet', unitPlural: 'filets', gramsPerUnit: 200 },
  ing_014: { unit: 'filet', unitPlural: 'filets', gramsPerUnit: 150 },
  ing_022: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 20 },
  ing_032: { unit: 'huevo', unitPlural: 'huevos', gramsPerUnit: 60 },
  ing_033: { unit: 'clara', unitPlural: 'claras', gramsPerUnit: 33 },

  // ── VERDURAS ──
  ing_036: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 60 },
  ing_037: { unit: 'tomate', unitPlural: 'tomates', gramsPerUnit: 120 },
  ing_038: { unit: 'cebolla', unitPlural: 'cebollas', gramsPerUnit: 150 },
  ing_039: { unit: 'zanahoria', unitPlural: 'zanahorias', gramsPerUnit: 80 },
  ing_040: { unit: 'papa', unitPlural: 'papas', gramsPerUnit: 150 },
  ing_041: { unit: 'batata', unitPlural: 'batatas', gramsPerUnit: 200 },
  ing_042: { unit: 'choclo', unitPlural: 'choclos', gramsPerUnit: 80 },
  ing_044: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 150 },
  ing_045: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 60 },
  ing_046: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 80 },
  ing_050: { unit: 'morrón', unitPlural: 'morrones', gramsPerUnit: 120 },
  ing_052: { unit: 'pepino', unitPlural: 'pepinos', gramsPerUnit: 120 },
  ing_064: { unit: 'ramito', unitPlural: 'ramitos', gramsPerUnit: 10 },
  ing_066: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 80 },

  // ── FRUTAS ──
  ing_076: { unit: 'banana', unitPlural: 'bananas', gramsPerUnit: 120 },
  ing_077: { unit: 'manzana', unitPlural: 'manzanas', gramsPerUnit: 180 },
  ing_078: { unit: 'naranja', unitPlural: 'naranjas', gramsPerUnit: 180 },
  ing_082: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 150 },
  ing_083: { unit: 'puñado', unitPlural: 'puñados', gramsPerUnit: 30 },
  ing_087: { unit: 'kiwi', unitPlural: 'kiwis', gramsPerUnit: 75 },
  ing_095: { unit: 'limón', unitPlural: 'limones', gramsPerUnit: 60 },
  ing_099: { unit: 'palta', unitPlural: 'paltas', gramsPerUnit: 150 },

  // ── LÁCTEOS ──
  ing_101: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 200 },
  ing_102: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 200 },
  ing_103: { unit: 'pote', unitPlural: 'potes', gramsPerUnit: 170 },
  ing_104: { unit: 'pote', unitPlural: 'potes', gramsPerUnit: 170 },
  ing_105: { unit: 'pote', unitPlural: 'potes', gramsPerUnit: 170 },
  ing_106: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_107: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  ing_108: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 10 },
  ing_109: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 30 },
  ing_111: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 30 },
  ing_112: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 25 },
  ing_114: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 30 },
  ing_115: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_116: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  ing_117: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 5 },

  // ── CEREALES ──
  ing_121: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 160 },
  ing_122: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 160 },
  ing_123: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 160 },
  ing_124: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 85 },
  ing_125: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 85 },
  ing_126: { unit: 'rebanada', unitPlural: 'rebanadas', gramsPerUnit: 30 },
  ing_127: { unit: 'rebanada', unitPlural: 'rebanadas', gramsPerUnit: 30 },
  ing_128: { unit: 'rebanada', unitPlural: 'rebanadas', gramsPerUnit: 28 },
  ing_130: { unit: 'tortilla', unitPlural: 'tortillas', gramsPerUnit: 40 },
  ing_132: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 10 },
  ing_133: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_134: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 160 },
  ing_135: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 160 },
  ing_137: { unit: 'galletita', unitPlural: 'galletitas', gramsPerUnit: 7 },
  ing_138: { unit: 'galletita', unitPlural: 'galletitas', gramsPerUnit: 8 },
  ing_139: { unit: 'tostada', unitPlural: 'tostadas', gramsPerUnit: 10 },

  // ── LEGUMBRES ──
  ing_146: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 180 },
  ing_147: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 180 },
  ing_155: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 100 },

  // ── GRASAS ──
  ing_156: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 14 },
  ing_157: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 14 },
  ing_159: { unit: 'puñado', unitPlural: 'puñados', gramsPerUnit: 30 },
  ing_160: { unit: 'puñado', unitPlural: 'puñados', gramsPerUnit: 30 },
  ing_161: { unit: 'puñado', unitPlural: 'puñados', gramsPerUnit: 30 },
  ing_163: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 12 },
  ing_167: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },

  // ── BEBIDAS ──
  ing_182: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 250 },

  // ── ULTRAPROCESADOS ──
  ing_189: { unit: 'alfajor', unitPlural: 'alfajores', gramsPerUnit: 50 },
  ing_191: { unit: 'cuadradito', unitPlural: 'cuadraditos', gramsPerUnit: 12 },
  ing_196: { unit: 'barrita', unitPlural: 'barritas', gramsPerUnit: 25 },
  ing_198: { unit: 'medialuna', unitPlural: 'medialunas', gramsPerUnit: 50 },
  ing_206: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_210: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  ing_211: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 50 },

  // ── COMIDAS PREPARADAS (porción única) ──
  ing_228: { unit: 'milanesa', unitPlural: 'milanesas', gramsPerUnit: 200 },
  ing_229: { unit: 'milanesa', unitPlural: 'milanesas', gramsPerUnit: 200 },
  ing_230: { unit: 'empanada', unitPlural: 'empanadas', gramsPerUnit: 120 },
  ing_233: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 150 },
  ing_236: { unit: 'tira', unitPlural: 'tiras', gramsPerUnit: 100 },
  ing_238: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 200 },
  ing_239: { unit: 'choripán', unitPlural: 'choripanes', gramsPerUnit: 250 },
  ing_240: { unit: 'rodaja', unitPlural: 'rodajas', gramsPerUnit: 100 },
  ing_241: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 400 },
  ing_242: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 400 },
  ing_243: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 350 },
  ing_244: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 350 },
  ing_245: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 350 },
  ing_246: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 250 },
  ing_247: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 250 },
  ing_248: { unit: 'canelón', unitPlural: 'canelones', gramsPerUnit: 120 },
  ing_249: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 300 },
  ing_250: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 300 },
  ing_251: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 350 },
  ing_252: { unit: 'pieza', unitPlural: 'piezas', gramsPerUnit: 30 },
  ing_253: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 350 },
  ing_254: { unit: 'presa', unitPlural: 'presas', gramsPerUnit: 250 },
  ing_255: { unit: 'ensaladera', unitPlural: 'ensaladeras', gramsPerUnit: 300 },
  ing_256: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 300 },
  ing_257: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 250 },
  ing_258: { unit: 'plato', unitPlural: 'platos', gramsPerUnit: 300 },
  ing_259: { unit: 'flan', unitPlural: 'flanes', gramsPerUnit: 150 },
  ing_260: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 120 },
  ing_261: { unit: 'bowl', unitPlural: 'bowls', gramsPerUnit: 200 },
  ing_262: { unit: 'panqueque', unitPlural: 'panqueques', gramsPerUnit: 65 },

  // ── OTROS ──
  ing_264: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  ing_266: { unit: 'scoop', unitPlural: 'scoops', gramsPerUnit: 30 },
  ing_270: { unit: 'pizca', unitPlural: 'pizcas', gramsPerUnit: 1 },
  ing_272: { unit: 'vasito', unitPlural: 'vasitos', gramsPerUnit: 200 },

  // ── ESPECIAS / CONDIMENTOS ──
  ing_273: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 2 },
  ing_274: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 2 },
  ing_275: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 2 },
  ing_276: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 2 },
  ing_277: { unit: 'trozo', unitPlural: 'trozos', gramsPerUnit: 15 },
  ing_278: { unit: 'ramita', unitPlural: 'ramitas', gramsPerUnit: 5 },
  ing_279: { unit: 'ramita', unitPlural: 'ramitas', gramsPerUnit: 5 },
  ing_283: { unit: 'hoja', unitPlural: 'hojas', gramsPerUnit: 2 },
  ing_284: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 3 },
  ing_287: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },

  // ── ASIÁTICOS ──
  ing_288: { unit: 'trozo', unitPlural: 'trozos', gramsPerUnit: 100 },
  ing_289: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 18 },
  ing_290: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_291: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 5 },
  ing_292: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 100 },
  ing_294: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 240 },
  ing_295: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 70 },
  ing_296: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 20 },
  ing_297: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_298: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 30 },
  ing_299: { unit: 'hoja', unitPlural: 'hojas', gramsPerUnit: 3 },
  ing_302: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 155 },

  // ── MEDITERRÁNEOS ──
  ing_303: { unit: 'cubo', unitPlural: 'cubos', gramsPerUnit: 30 },
  ing_304: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 30 },
  ing_305: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_306: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 4 },
  ing_307: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 9 },
  ing_308: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_310: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 10 },
  ing_311: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 60 },
  ing_312: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 30 },
  ing_313: { unit: 'pote', unitPlural: 'potes', gramsPerUnit: 170 },
  ing_314: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 90 },
  ing_315: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 4 },
  ing_316: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 25 },
  ing_317: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 90 },

  // ── LATINOS ──
  ing_318: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 3 },
  ing_319: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
  ing_320: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 40 },
  ing_321: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 120 },
  ing_322: { unit: 'feta', unitPlural: 'fetas', gramsPerUnit: 30 },
  ing_323: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 80 },
  ing_324: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 60 },
  ing_325: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 100 },
  ing_326: { unit: 'rodaja', unitPlural: 'rodajas', gramsPerUnit: 80 },
  ing_327: { unit: 'empanada', unitPlural: 'empanadas', gramsPerUnit: 120 },

  // ── OTROS VERSÁTILES ──
  ing_328: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 10 },
  ing_329: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 16 },
  ing_330: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 17 },
  ing_331: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  ing_332: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 12 },
  ing_333: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 80 },
  ing_334: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 10 },
  ing_335: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  ing_336: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 240 },
  ing_337: { unit: 'cucharadita', unitPlural: 'cucharaditas', gramsPerUnit: 4 },
};

/**
 * Default portions by ingredient category (fallback when no specific entry exists).
 */
export const CATEGORY_DEFAULTS: Partial<Record<IngredientCategory, IngredientPortion>> = {
  carnes: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 150 },
  verduras: { unit: 'taza', unitPlural: 'tazas', gramsPerUnit: 80 },
  frutas: { unit: 'unidad', unitPlural: 'unidades', gramsPerUnit: 130 },
  lacteos: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 20 },
  cereales: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 80 },
  legumbres: { unit: 'taza cocida', unitPlural: 'tazas cocidas', gramsPerUnit: 180 },
  grasas: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 14 },
  bebidas: { unit: 'vaso', unitPlural: 'vasos', gramsPerUnit: 200 },
  ultraprocesados: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 50 },
  comidas_preparadas: { unit: 'porción', unitPlural: 'porciones', gramsPerUnit: 250 },
  otros: { unit: 'cucharada', unitPlural: 'cucharadas', gramsPerUnit: 15 },
};
