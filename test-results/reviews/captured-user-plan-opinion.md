# Análisis offline — plan capturado (perspectiva usuario promedio)

Escenario: persona con vida promedio, sin conocimientos de cocina, Argentina.

Plan reconstruido desde capturas UI (13–19 jul 2026).

## Veredicto rápido

**El plan se entiende y se ve “comible”, pero le pega de más a milanesa/morcilla/bife.** Desayunos y snacks están perfectos para un novato; los platos principales se sienten más de “alguien que ya cocina argentino de toda la vida” que de “primera vez armando menú”.

## Día a día (cómo lo viviría)

| Día | Qué pienso |
|-----|------------|
| Lun | Arranque bueno: avena + carne/arroz + milanesa. El arroz salteado lo bancaría. La milanesa ya me genera duda si es casera. |
| Mar | Tostadas OK. **Morcilla** no es plato de todos los días para alguien promedio; mucha gente ni la compra. Cena otra milanesa. |
| Mié / Jue | **Misma milanesa almuerzo y cena, dos días seguidos.** Útil si meal-prepeás, pero como usuario común: “¿otra vez?” |
| Vie | Otra milanesa al mediodía + morcilla de noche. Semana muy carnivora/repetitiva. |
| Sáb (Edgy) | Bife con huevo y champiñones suena rico, pero “hacer un bife bien” intimida si no cocinás. |
| Dom | Libre — bien. |

## Qué está bien

- Desayunos (avena / tostadas) y snacks (yogur-maní / pera-pasta de maní): **cero fricción**.
- Calorías diarias ~1450–1520: coherentes y estables.
- Domingo libre + sábado “Edgy”: se entiende la lógica del producto.
- Repetir desayuno/snack (2 variantes) es correcto para no sobrecargar.

## Qué no bancaría un usuario promedio

1. **Milanesa de bondiola ~6–7 veces** en la semana (contando almuerzo+cena). Aunque en Argentina comprar milanesas listas es común, el plan no aclara eso y el nombre suena a “hacer desde cero” (apanar, freír, etc.).
2. **Morcilla 3 veces**: polarizante; no es “comida de oficina / martes cualquiera” para mucha gente.
3. **Poco pollo / pocas opciones “seguras”** (pollo al horno, fideos con salsa, tortilla, revuelto). El único principal “seguro” es carne y arroz del lunes.
4. Tiempos de 20–25 min para milanesa/morcilla son optimistas si no tenés práctica.

## Score (analizador automático)

**55/100 — `poco_realista_para_novato`**

- Fail: milanesa ×7 (sobreuso)
- Warn: prep 25 min en milanesa; milanesa/morcilla/bife intimidan
- OK: 4 principales únicos; desayunos/snacks fáciles

Correr de nuevo:

```bash
npm run test:scenarios:fixtures
# o
node scripts/scenario-week-plan.mjs --fixture test-results/fixtures/captured-user-plan-2026-07-13.json
```

El score prioriza: variedad de principales, no sobreusar un plato, tiempos de prep, y flags de “intimidación” (milanesa, morcilla, bife…).

## Mejoras sugeridas al motor (ya parcialmente cableadas)

- Pasar `cookingTime: rapido` al prompt del week-plan (antes se guardaba pero **no llegaba** a Gemini).
- Capear apariciones de un mismo principal (máx ~3/semana).
- Preferir técnicas básicas cuando el usuario es novato.
