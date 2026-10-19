# TASK-014 — Corrección local

## Causa comprobada en el código

`toolEvidenceContext` producía el encabezado que aparece en la captura. `handler.ts` lo concatenaba al texto de cada respuesta histórica con rol `model`. El modelo recibía así registros de diagnóstico como si fueran parte de sus propias respuestas visibles y podía imitar ese formato. La interfaz muestra `message.text` sin un modo de diagnóstico de administrador. El acceso al piloto está restringido por usuario, pero eso no habilita texto técnico en las respuestas.

## Cambio

- `api/_lib/assistantBeta/handler.ts`: retirar la evidencia técnica del texto de las respuestas históricas y enviarla en un bloque separado del contexto interno del modelo. Incluir instrucciones explícitas de explicar resultados y fallas en lenguaje natural, sin reproducir bloques de diagnóstico, incluso cuando un mensaje anterior los haya incluido por error.
- `api/_lib/assistantBeta/runTurn.ts`: serializar la evidencia como datos con posición del mensaje y fecha. La posición corresponde al historial recortado que efectivamente recibe el modelo, evitando confundir turnos. Se conservan estados, errores y consultas de calendario para no perder la distinción entre error, ausencia de consulta y calendario vacío.
- Se conserva el diagnóstico almacenado y el detalle funcional de «Consultas y cálculos». No se modifican mensajes ya persistidos ni datos de la cuenta. No se añaden filtros de palabras sobre las respuestas.

## Verificación y publicación

Build, comprobación de imports ESM, TypeScript estricto y ESLint dirigidos. Sin pruebas funcionales ni generaciones del modelo, según indicación del usuario. La prevención incluye separación del historial e instrucciones al modelo; no es una garantía determinista sobre texto generado.

La entrega inicial se conservó local por pedido expreso del usuario. El 19/10/2026 autoriza subir los cambios pendientes junto con TASK-015 y TASK-016. No se modifican respuestas ya guardadas. Sin migraciones ni cambios de dependencias.
