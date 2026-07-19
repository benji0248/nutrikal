# SP-10 — Memoria de progreso

| Campo | Valor |
|-------|-------|
| **Estado** | [ ] pendiente · [ ] en progreso · [x] hecho |
| **Dependencias** | SP-4 (onboarding/peso), SP-2 (chat home) |
| **Próximo** | — |
| **Entrega** | Spec + implementación de código |

---

## Contexto

**Norte star global:** NutriKal = un presupuesto energético personal que habla en platos.

Plan general: [`docs/PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)

Hoy el peso vive como un único campo en `user_profiles` (`weightKg`). El check-in mensual ([`ProfileRecalibrate.tsx`](../../src/components/profile/ProfileRecalibrate.tsx)) lo pisa y avanza `lastRecalibration`. No hay historial, ni interpretación, ni presencia en el chat.

---

## Norte del módulo

> NutriKal no enseña nutrición ni trackea peso: **reemplaza la carga cognitiva de hacer dieta**. El módulo no responde “cuánto pesás”; responde **“¿voy bien?”**.

- El peso es **input**
- La tendencia / confianza / estado son **procesamiento local** (no LLM inventando conclusiones)
- El producto entregado es **tranquilidad** (copy humano)
- Si se saca el módulo, la app de platos sigue completa — es capa de confianza, no el centro

### Regla de piedra

> Cada nueva funcionalidad de progreso debe responder al menos una de dos preguntas: **mejora el próximo plan de comidas** o **ayuda al usuario a responder "¿voy bien?"**. Si no hace ninguna de las dos, probablemente no pertenece a NutriKal.

---

## Objetivo

Especificar (y más adelante implementar) una **memoria inteligente del proceso**: check-ins con historial, motor local de interpretación, lectura sin números por defecto, y presencia ocasional en el chat — sin convertir NutriKal en un tracker.

---

## Conceptos internos

```
CheckIn → ProgressEngine (local) → ProgressState + Freshness + Confidence → Reading → (opt-in) Details
                              ↘ actualiza profile.weightKg (motor metabólico)
```

| Concepto | Rol |
|----------|-----|
| **Check-in** | Evento: `weightKg` + `PeriodExperience` opcional + `source` + fecha |
| **Peso activo** | Último check-in → `user_profiles.weight_kg` (motor metabólico) |
| **Confidence** | `low` / `medium` / `high` — **interna, nunca visible como label**; modula cuánto afirma el copy |
| **ProgressState** | Interpretación del proceso: `on_track` / `stable` / `off_track` / `goal_reached` / `insufficient_data` |
| **Freshness** | Actualización de datos: `fresh` / `aging` / `stale` — **dimensión separada**; puede coexistir con cualquier `ProgressState` |
| **Reading** | Frase de tranquilidad; **sin kg ni deltas** por defecto |
| **Details** | Solo al tocar “Ver detalles”: kg actual, delta desde inicio, etc. |

### ProgressState ≠ Freshness

No mezclar en un solo enum. Ejemplo: `goal_reached` + `stale` pueden coexistir (alcanzó el objetivo, pero hace tiempo que no hay check-in). El copy combina ambas dimensiones.

### Confidence → certeza del lenguaje (no UI)

| Confidence | Voz (ejemplos) |
|------------|----------------|
| `low` | “Parece que…” / “Aún es pronto…” |
| `medium` | “Todo indica que…” |
| `high` | “Vemos una tendencia consistente…” |

### PeriodExperience (no “Effort”)

Experiencia subjetiva del período — **no** esfuerzo físico de entrenamiento.

- UI: *¿Cómo sentiste este período?* → Fácil / Normal / Difícil
- Valores: `easy` / `normal` / `hard` (opcional en el check-in)
- Alimenta el reading (p.ej. `hard` + poco cambio → tono de sostenibilidad, no culpa)

---

## Experiencia (captura ≠ lectura)

**Invariante UX:** la captura nunca muestra lectura rica (ni gráfico, ni IMC, ni deltas).

```
Captura → Motor local → Lectura → (opt-in) Detalles
```

### Captura (liviana)

Extender el check-in actual (`ProfileRecalibrate`):

1. Peso (kg)
2. Chips opcionales de `PeriodExperience` (Fácil / Normal / Difícil)
3. Acciones: actualizar / “Nada cambió” / editar perfil completo

Sin gráficos ni métricas clínicas en ese momento.

**“Nada cambió”:** crea un check-in de confirmación con el mismo `weightKg` activo (refresca freshness y deja rastro temporal). No es solo un timestamp silencioso: el historial debe reflejar que el usuario confirmó estabilidad.

### Lectura (default)

Copy según `ProgressState` + `Freshness` + `Confidence` (+ `PeriodExperience` si hubo). **Cero kg/deltas** hasta que el usuario elija ver detalles.

Ejemplos:

- `insufficient_data` + `low`: *“Aún es pronto para sacar conclusiones, pero parece que el plan va en buena dirección.”*
- `on_track` + `medium`: *“Todo indica que el plan está funcionando.”*
- `on_track` + `high`: *“Vemos una tendencia consistente alineada con tu objetivo.”*
- poco cambio + `PeriodExperience: hard`: *“Aunque el cambio fue chico, considerando lo difícil que sentiste el período, hay señales para ajustar hacia algo más sostenible.”*

### Detalles (opt-in local)

Reveal local (“Ver detalles”) en la lectura o en el mensaje del chat — **no** un setting global tipo Modo Pro. Ejemplo tras expandir:

```
95,4 kg
-1,8 kg desde el inicio
```

### Presencia sin entrar al módulo

Al abrir el chat, inyección ocasional de `assistant-text` (+ option “Ver detalles”) cuando:

- haya un reading digno de mostrarse
- `Freshness` lo permita (no spamear si `stale` sin contexto útil, o sí invitar a check-in según reglas de frecuencia)
- no se haya mostrado el mismo insight recientemente (dedupe por id estable + `seenAt`)

Patrón previsto: `useChatEngine` → `addMessages`; copy centralizado tipo `personalizationCopy.ts` / `journalTokens.ts`.

**Motor local, no Gemini** — la interpretación del progreso es determinística.

### Frecuencia de prompts de captura

Comportamiento parametrizado (valores concretos viven en código/config, no en la doctrina del producto):

| Parámetro | Comportamiento |
|-----------|----------------|
| `soft_threshold_days` | Prompt suave: “Si sentís que hubo cambios importantes, podés registrar un nuevo peso cuando quieras.” |
| `hard_threshold_days` | Prompt más claro (evolución del check-in mensual actual) |
| Manual | Siempre disponible desde perfil |

Valores iniciales sugeridos al implementar: 14 / 30 — ajustables sin reescribir el SP.

---

## En scope

- Tabla/historial de check-ins + API append
- Migración: onboarding / peso actual → check-in #0
- Engine local: `ProgressState` + `Freshness` + `Confidence` + copy
- Check-in rico (peso + `PeriodExperience`)
- Lectura sin números + “Ver detalles”
- Mensaje espontáneo en chat con dedupe
- Entrada secundaria “Progreso” desde perfil (**no** tab principal)

---

## NO hacer

- Tracker diario / gráfica como home
- IMC, % grasa, peso ideal, predicciones, rachas, badges, comparativas
- Pregunta de adherencia (queda fuera; `PeriodExperience` es la única subjetiva)
- Conclusiones generadas por LLM
- Tab principal de métricas
- B2B / nutricionista
- Mostrar el label “Confidence” (ni “Freshness”) al usuario
- Mezclar captura y lectura en la misma pantalla

---

## Archivos implementados

```
sql/00x_body_check_ins.sql
src/types/index.ts          (BodyCheckIn, ProgressState, Freshness, Confidence, PeriodExperience)
src/services/progressEngine.ts
src/services/progressCopy.ts
src/store/useProgressStore.ts
src/components/profile/ProfileRecalibrate.tsx
src/components/assistant/useChatEngine.ts
api/business/[...route].ts
src/services/apiService.ts
```

Referencias de patrones existentes:

- Check-in actual: `src/components/profile/ProfileRecalibrate.tsx`
- Copy cualitativo: `src/services/personalizationCopy.ts`, `src/components/assistant/journalTokens.ts`
- Persistencia perfil: `user_profiles.weight_kg`, `last_recalibration`

---

## Criterios de aceptación (esta pasada — spec)

- [x] Producto formulado como respuesta a “¿voy bien?”, no como tracker
- [x] Regla de piedra escrita en el SP
- [x] Default: cero kg/deltas visibles sin “Ver detalles”
- [x] Confidence interna altera la certeza del lenguaje; nunca se muestra como métrica
- [x] `ProgressState` y `Freshness` definidos como dimensiones separadas
- [x] Check-in incluye `PeriodExperience` opcional (Fácil/Normal/Difícil) — no llamado Effort
- [x] Captura y lectura están separadas como invariante UX
- [x] Spec de mensaje espontáneo en chat + dedupe
- [x] Frecuencia descrita como `soft_threshold_days` / `hard_threshold_days`
- [x] Sección **Principios que NO deben romperse**
- [x] Principio de no-centralidad: platos siguen siendo el producto
- [x] Sección “Archivos previstos” para implementación futura
- [x] `PRODUCT_PLAN.md` y `docs/sp/README.md` enlazan SP-10

---

## Criterios de aceptación (código)

- [x] Historial de check-ins persistido; peso activo = último check-in
- [x] Onboarding / perfil actual migra a check-in #0
- [x] Engine local produce `ProgressState`, `Freshness`, `Confidence` y reading
- [x] Captura: peso + `PeriodExperience` opcional; sin números de progreso en esa UI
- [x] Lectura default sin kg; “Ver detalles” revela números
- [x] Chat puede inyectar reading espontáneo con dedupe
- [x] Prompts soft/hard según umbrales configurables
- [x] “Nada cambió” crea check-in de confirmación
- [x] `npm run build` pasa

---

## Principios que NO deben romperse

- Nunca mostrar culpa.
- Nunca decir “fracasaste” (ni equivalentes).
- Nunca recomendar cambios de plan usando un único check-in.
- El peso siempre es contexto, nunca protagonista.
- Si hay incertidumbre, comunicar incertidumbre (`Confidence` low).
- La interpretación debe ser conservadora.
- No agregar IMC, peso ideal, % grasa, predicciones, rachas, badges o comparativas “porque ya hay historial” — aplicar la regla de piedra.
- Captura ≠ lectura: no “ya que estamos” meter el gráfico al registrar peso.

---

## Al terminar

1. Ejecutar `sql/006_progress_check_ins.sql` en Supabase
2. Smoke manual de captura → lectura → detalles → mensaje en chat
3. Commit sugerido: `feat(progress): SP-10 check-ins and local progress reading`
4. Push

---

## Handoff

| Campo | Valor |
|-------|-------|
| **Commit** | — |
| **Qué quedó hecho** | Historial/API/store; motor local State ⊥ Freshness + Confidence; PeriodExperience; captura≠lectura; lectura opt-in; chat espontáneo con dedupe; umbrales soft/hard |
| **Desviaciones** | `goal_reached` queda reservado: el perfil todavía no define un peso objetivo, por lo que el motor no lo infiere |
| **Deuda técnica** | Ejecutar `sql/006_progress_check_ins.sql` en cada entorno antes del deploy |
| **Smoke / build** | `npm run build` OK; `npm run lint` OK (warnings preexistentes de hooks); smoke engine OK |
| **Siguiente** | Aplicar migración SQL y smoke manual E2E |

---

## Prompt para ventana nueva (validación)

```
Leé docs/sp/SP-10-memoria-progreso.md. Aplicá sql/006_progress_check_ins.sql
y ejecutá el smoke manual E2E de captura, lectura, detalles y chat.
No cambies los principios de producto.
```
