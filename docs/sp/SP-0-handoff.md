# SP-0 — Documento de handoff

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [x] en progreso · [ ] hecho |
| **Dependencias** | ninguna |
| **Estimación** | doc only |

---

## Contexto (leer primero)

**Norte star:** NutriKal = un presupuesto energético personal que habla en platos.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

---

## Objetivo

Crear la infraestructura de documentación para ejecutar el producto por fases, con un archivo por sub-plan, de modo que cada ventana nueva de contexto lea **solo el SP que toca**.

---

## En scope

- [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md) — índice + handoff global
- [`docs/sp/`](../sp/) — un archivo por SP (SP-0 … SP-9)
- Referencia cruzada breve en `AI_MODULE.md` (opcional, 1 párrafo)

---

## NO hacer

- Cambios de código de producto
- Implementar SP-1 en adelante en esta sesión

---

## Entregables

| Archivo | Rol |
|---------|-----|
| `docs/PRODUCT_PLAN.md` | Índice, principios, handoff global |
| `docs/sp/SP-*.md` | Spec autocontenida por sub-plan |

---

## Criterios de aceptación

- [ ] Existe un archivo por SP (0–9)
- [ ] Cada SP tiene: objetivo, dependencias, scope, NO hacer, archivos, criterios, handoff
- [ ] `PRODUCT_PLAN.md` enlaza a cada SP (no duplica todo el detalle)
- [ ] Cualquier ventana nueva puede arrancar leyendo **solo** el SP asignado

---

## Al terminar esta sesión

1. Marcar SP-0 como `[x] hecho` en `PRODUCT_PLAN.md`
2. Commit + push
3. Completar handoff abajo

---

## Handoff (completar al cerrar)

| Campo | Valor |
|-------|-------|
| **Commit** | — |
| **Qué quedó hecho** | — |
| **Desviaciones** | — |
| **Deuda técnica** | — |
| **Siguiente SP** | SP-1 |

---

## Prompt para ventana nueva

```
Leé docs/sp/SP-0-handoff.md y ejecutalo. Al terminar, actualizá PRODUCT_PLAN.md y el handoff del SP.
```
