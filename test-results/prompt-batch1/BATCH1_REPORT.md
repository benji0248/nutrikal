# Batch 1 — Resultados de verificación pre-merge

## Cambios implementados

| Item | Estado |
|------|--------|
| 1A — prep/tip fuera de schema y contrato | ✓ |
| 3A+3B — bloque calórico simplificado | ✓ |
| V2 — identidad culinaria | ✓ |
| 4A — fusión planificación + salida | ✓ |
| WEEK_PLAN_PROMPT_VERSION → week-plan-oneshot-v2 | ✓ |

## Diff textual del prompt (perfil ar-promedio-sin-cocina)

Generado con `npx tsx scripts/compare-week-plan-prompt-v1-v2.mjs`.

| Métrica | v1 | v2 | Delta |
|---------|----|----|-------|
| Caracteres | 6.496 | 4.602 | −1.894 |
| Tokens (~÷4) | ~1.624 | ~1.151 | **~−473 input** |

### Reglas críticas presentes en v2

| Regla | Presente |
|-------|----------|
| `same:tX` | ✓ (ritmo + desayuno/snack + JSON) |
| `prev.cena` | ✓ (JSON link) |
| `full_free` | ✓ (calorías + weekdayRules + JSON) |
| `templateId` / Máx 8 | ✓ (`Máx 8 templateId únicos`) |
| Canasta con kcal/100g | ✓ (sin cambio) |

### Secciones eliminadas / acortadas

- Bloque identidad: 6 sub-secciones → 1 bloque V2 (~−313 tokens)
- Bloque ⚠️ CRÍTICO — CALORÍAS: 6 reglas → 3 líneas Porciones (~−128 tokens)
- Duplicación planificación + formato salida → `# Planificación y salida` único (~−80 tokens)
- Contrato dishes: sin preparacion/tip

Archivos completos: `prompt-v1.txt`, `prompt-v2.txt` en este directorio.

## Escenarios Gemini (API en vivo)

**No ejecutados en este entorno:** `GEMINI_API_KEY` no configurada.

Para comparar contra baseline (~1670 input / ~1183 output / ~51s) después del merge:

```bash
# Terminal 1
npm run dev:api   # o scripts/dev-api-server.ts en :3000

# Terminal 2 — escenario acordado (2 corridas)
node scripts/scenario-week-plan.mjs --scenario ar-promedio-sin-cocina
node scripts/scenario-week-plan.mjs --scenario ar-promedio-sin-cocina

# Revisar en test-results/runs/<timestamp>/:
# - observability.inputTokens / outputTokens (si API expone debug)
# - analysis.metrics: minUniqueMains, maxMainDishAppearances, maxPrepMinutes
```

Variables de entorno: `AI_OBSERVABILITY_EXPOSE_DEBUG=true` para tokens en respuesta HTTP.

## Build

`npm run build` — OK tras ajuste `dishMatchService.ts` (prep/tip opcionales → `?? ''`).

## Investigación forbidden

Ver `diagnostico_forbidden_dish_names.txt` en raíz del repo.
