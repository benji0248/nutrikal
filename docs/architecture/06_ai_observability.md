# Observabilidad de generaciones de IA

La primera integración cubre `/api/ai/week-plan`. El núcleo es independiente del proveedor:

- `api/_lib/ai/types.ts`: contratos de generación de texto y embeddings.
- `api/_lib/ai/geminiTextGenerator.ts`: traducción del contrato canónico a Gemini.
- `api/_lib/observability/`: tracking, clasificación, costos, privacidad y persistencia.
- `sql/009_ai_observability.sql`: almacenamiento analítico en Supabase/PostgreSQL.
- `instrumentation.ts`: registro de OpenTelemetry en Vercel.

## Activación

1. Ejecutar `sql/009_ai_observability.sql`.
2. Cargar precios vigentes en `ai_model_prices`; no hay precios hardcodeados.
3. Configurar `AI_OBSERVABILITY_PERSISTENCE=true`.

Sin persistencia, las generaciones siguen produciendo logs JSON y spans. Un fallo de
telemetría nunca impide entregar un plan.

## Variables

| Variable | Valor | Comportamiento |
|---|---|---|
| `AI_OBSERVABILITY_PERSISTENCE` | `true` | Persiste generaciones, etapas, intentos y calidad. |
| `AI_OBSERVABILITY_CAPTURE` | `none`, `metadata`, `full` | Controla captura de prompts y respuestas. Default: `none`. |
| `AI_OBSERVABILITY_ALLOW_SENSITIVE` | `true` | Requerida para captura `full` en producción. |
| `AI_OBSERVABILITY_ENCRYPTION_KEY` | base64 de 32 bytes | Cifra payloads con AES-256-GCM. Sin clave se guarda solo metadata. |
| `AI_OBSERVABILITY_PAYLOAD_RETENTION_DAYS` | entero positivo | Retención indicada en `expires_at`. Default: 7. |

La eliminación de payloads vencidos debe programarse como tarea de mantenimiento:

```sql
DELETE FROM ai_generation_payloads
WHERE expires_at IS NOT NULL AND expires_at < now();
```

## Precios

Ejemplo deliberadamente sin valores:

```sql
INSERT INTO ai_model_prices (
  provider,
  model,
  input_usd_per_million,
  output_usd_per_million,
  valid_from
) VALUES (
  'gemini',
  'gemini-2.5-flash',
  :input_price,
  :output_price,
  now()
);
```

Los cambios de tarifa crean una fila nueva y cierran `valid_until` en la anterior.
Esto conserva el costo histórico. Los retries y regeneraciones por JSON inválido
también se facturan.

## Privacidad y cardinalidad

- PostgreSQL conserva `user_id` para reportes autorizados por usuario.
- Logs y spans no incluyen `user_id`, prompts ni respuestas.
- Prompts y respuestas completas requieren habilitación explícita y cifrado.
- IDs de usuario o generación no deben convertirse en labels de métricas.

## Versionado

Cada generación conserva una receta con versión/hash del prompt, modelo y parámetros,
reglas de negocio, algoritmo y deployment. Agregar versiones de dataset, memoria o
índice de embeddings cuando esas dependencias entren al flujo.

Las métricas de calidad incluyen evaluador, versión y fuente. Las validaciones
nutricionales que hoy ocurren en el cliente todavía no se consideran autoritativas;
deben enviarse a un endpoint autenticado o moverse al backend en una fase posterior.
