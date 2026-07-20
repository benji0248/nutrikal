# Escenarios de plan semanal

Automatiza generación + análisis de planes para distintos perfiles (nacionalidad, objetivo, cocina, presupuesto).

## Uso rápido (sin API)

Analiza el plan capturado del usuario:

```bash
node scripts/scenario-week-plan.mjs --fixture test-results/fixtures/captured-user-plan-2026-07-13.json
```

Analiza todos los fixtures:

```bash
node scripts/scenario-week-plan.mjs --analyze-fixtures
```

## Uso con API (genera planes nuevos)

1. `npm run dev:api` (con `.env.local` y Gemini configurado)
2. Corré un escenario:

```bash
node scripts/scenario-week-plan.mjs --list
node scripts/scenario-week-plan.mjs --scenario ar-promedio-sin-cocina
node scripts/scenario-week-plan.mjs --all
```

## Salida

Cada corrida escribe en `test-results/runs/<timestamp>/`:

| Archivo | Contenido |
|---------|-----------|
| `index.md` | Resumen de scores |
| `<id>.analysis.md` | Reporte humano (menú + checks + notas de usuario promedio) |
| `<id>.analysis.json` | Mismo análisis en JSON |
| `<id>.raw.json` | Respuesta cruda / fixture |

## Agregar un perfil

Editá `scripts/scenarios/profiles.mjs` y sumá un objeto a `SCENARIOS` con `user`, `weekPlanning` y `expectations`.
