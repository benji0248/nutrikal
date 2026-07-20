# Análisis de plan — Plan capturado del usuario (semana 13–19 jul)

- **Score usuario promedio:** 55/100
- **Veredicto:** `poco_realista_para_novato`
- **Generado:** 2026-07-19T10:01:35.356Z

> Usuario argentino promedio probando el plan semanal generado en la app.

## Notas (perspectiva usuario común)
- Como usuario promedio me cansaría ver "Milanesa de Bondiola con Ensalada" tantas veces (7x). Aunque cocinar una vez y repetir ayuda, 4+ veces en la semana ya se siente monótono.
- Platos que me harían dudar al leer el nombre: Milanesa de Bondiola con Ensalada, Morcilla con Puré Rústico, Bife con Huevo y Champiñones. Si no sé cocinar, "milanesa casera", "morcilla" o "bife a punto" suenan a restaurante, no a martes a la noche.
- Lo que sí me cierra: Carne y Arroz Salteado. Eso lo armo sin mirar tutorial.
- Tiempos de prep razonables (~15 min promedio).
- 2 días con el mismo plato en almuerzo y cena: práctico para meal-prep, pero psicológicamente pesado si el plato no es súper simple/rico.
- Este escenario pide cocina rápida: cualquier plato >20 min o con técnica especial debería bajarse.

## Checks
- ✅ **unique_mains**: 4 platos principales únicos (mín 3): Carne y Arroz Salteado · Milanesa de Bondiola con Ensalada · Morcilla con Puré Rústico · Bife con Huevo y Champiñones
- ❌ **main_overuse**: Sobreuso (>3x): Milanesa de Bondiola con Ensalada×7
- ⚠️ **prep_time**: Fuera de 20 min: Milanesa de Bondiola con Ensalada (25m)
- ⚠️ **intimidation**: Pueden intimidar a un novato: Milanesa de Bondiola con Ensalada · Morcilla con Puré Rústico · Bife con Huevo y Champiñones
- ⚠️ **beginner_signal**: Platos con señal "fácil": 1/4

## Stats
```json
{
  "days": 7,
  "totalSlots": 24,
  "linkedSlots": 0,
  "flexSlots": 1,
  "uniqueMains": 4,
  "uniqueTemplates": 8,
  "appearanceByName": {
    "Carne y Arroz Salteado": 1,
    "Milanesa de Bondiola con Ensalada": 7,
    "Morcilla con Puré Rústico": 3,
    "Bife con Huevo y Champiñones": 1
  },
  "avgPrepMinutes": 15,
  "maxPrepMinutes": 25,
  "minPrepMinutes": 2
}
```

## Menú día a día

### 2026-07-13 (normal)
- **desayuno**: Avena con Leche y Naranja (10 min) · 👍 fácil
- **almuerzo**: Carne y Arroz Salteado (20 min) · 👍 fácil
- **cena**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **snack**: Yogur con Maní (2 min) · 👍 fácil

### 2026-07-14 (normal)
- **desayuno**: Tostadas con Huevo y Queso (10 min) · 👍 fácil
- **almuerzo**: Morcilla con Puré Rústico (20 min) · ⚠️ intimida
- **cena**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **snack**: Pera con Pasta de Maní (5 min) · 👍 fácil

### 2026-07-15 (normal)
- **desayuno**: Avena con Leche y Naranja (10 min) · 👍 fácil
- **almuerzo**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **cena**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **snack**: Yogur con Maní (2 min) · 👍 fácil

### 2026-07-16 (normal)
- **desayuno**: Tostadas con Huevo y Queso (10 min) · 👍 fácil
- **almuerzo**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **cena**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **snack**: Pera con Pasta de Maní (5 min) · 👍 fácil

### 2026-07-17 (normal)
- **desayuno**: Avena con Leche y Naranja (10 min) · 👍 fácil
- **almuerzo**: Milanesa de Bondiola con Ensalada (25 min) · ⚠️ intimida
- **cena**: Morcilla con Puré Rústico (20 min) · ⚠️ intimida
- **snack**: Yogur con Maní (2 min) · 👍 fácil

### 2026-07-18 (maintenance)
- **desayuno**: Avena con Leche y Naranja (10 min) · 👍 fácil
- **almuerzo**: Bife con Huevo y Champiñones (15 min) · ⚠️ intimida
- **cena**: Morcilla con Puré Rústico (20 min) · ⚠️ intimida
- **snack**: Yogur con Maní (2 min) · 👍 fácil

### 2026-07-19 (full_free)
_Sin menú (día libre)_

## Platos (templates)

### t_avena — Avena con Leche y Naranja
- Prep: 10 min
- Ingredientes: Avena (60g), Leche (200g), Naranja (100g)
- Tip: Desayuno rápido

### t_tostadas — Tostadas con Huevo y Queso
- Prep: 10 min
- Ingredientes: Pan (60g), Huevo (100g), Queso (30g)
- Tip: Clásico fácil

### t_carne_arroz — Carne y Arroz Salteado
- Prep: 20 min
- Ingredientes: Carne (150g), Arroz (150g), Cebolla (50g)
- Tip: Casero cotidiano

### t_milanesa — Milanesa de Bondiola con Ensalada
- Prep: 25 min
- Ingredientes: Bondiola (150g), Pan rallado (40g), Huevo (50g), Lechuga (80g), Tomate (80g)
- Tip: Clásico argentino

### t_morcilla — Morcilla con Puré Rústico
- Prep: 20 min
- Ingredientes: Morcilla (120g), Papa (200g), Manteca (10g)
- Tip: Sábado/cena

### t_bife — Bife con Huevo y Champiñones
- Prep: 15 min
- Ingredientes: Bife (150g), Huevo (50g), Champiñones (80g)
- Tip: Flex / Edgy

### t_yogur — Yogur con Maní
- Prep: 2 min
- Ingredientes: Yogur (150g), Maní (20g)
- Tip: Snack cero esfuerzo

### t_pera — Pera con Pasta de Maní
- Prep: 5 min
- Ingredientes: Pera (150g), Pasta de maní (20g)
- Tip: Snack fácil
