# TASK-004 — Entrega de administración de planes

## Comportamiento

Se revisa el calendario actualizado antes de aplicar. Sin coincidencias se guarda directamente; con coincidencias se muestran cantidades por horario y se elige completar vacíos, reemplazar o guardar alternativas. La propuesta puede trasladarse por semanas completas para conservar sus reglas por día de la semana. Para empezar otro día se genera una propuesta nueva desde el selector existente.

Las alternativas se guardan separadas de las comidas elegidas y no intervienen en calorías ni compras. Se pueden intercambiar desde cada horario. Los registros anteriores con varias comidas ofrecen convertirlas explícitamente en opciones, sin modificar automáticamente el historial ni inferir pertenencia a un plan.

«Administrar planes» permite mover o retirar comidas futuras, conservando las realizadas, las fechas pasadas y las comidas ajenas al plan. Editar o eliminar individualmente una comida vinculada también actualiza sus compras. Las listas automáticas de los planes se mantienen separadas de las listas manuales y de las listas antiguas sin procedencia.

## Persistencia

La migración 011 agrega procedencia y alternativas a `meals`, metadatos de planes e historial de operaciones. Las funciones SQL están limitadas al rol de servicio; los endpoints toman el usuario de la sesión autenticada. Los cambios se guardan en una transacción con comparación del estado previo. Si otro dispositivo modificó el calendario, se recarga y se solicita revisar de nuevo. Las rutas anteriores de comidas/compras participan del bloqueo por usuario.

Deshacer revierte entidades de la operación original conservando cambios ajenos. Si se modificó posteriormente un horario afectado, una entidad de compras afectada, o hay comidas realizadas/fechas pasadas, rechaza la reversión en lugar de sobrescribirlas. El botón de deshacer se conserva durante la sesión; el historial está guardado en servidor.

## Revisión realizada

- TypeScript de la app (`tsc -b`): correcto.
- TypeScript del backend y del router de negocio: correcto.
- Revisión de espacios y conflictos de diff: correcta.
- No se ejecutaron suites de tests, pruebas funcionales ni revisión visual de la aplicación, por instrucción del usuario.
- La migración SQL todavía no se ejecutó: no hay conexión PostgreSQL ni acceso administrativo a Supabase configurados. El panel requiere iniciar sesión.
- Revisión con el complemento Supabase instalado: sus herramientas SQL todavía no están expuestas en esta sesión. Las funciones se ejecutan con privilegios del rol llamador (`SECURITY INVOKER`), limitadas al rol de servicio. Se desambiguaron los `INSERT ... SELECT ... ON CONFLICT` con `WHERE true`.

## Publicación pendiente

1. Iniciar sesión en el proyecto Supabase `zwpmhqzziljhwjgplpwf`.
2. Ejecutar el archivo completo `sql/011_calendar_plans.sql` en SQL Editor. Es una migración aditiva: no elimina las comidas existentes al instalarse.
3. Publicar esta rama en `master`, que activa el despliegue automático de Vercel.
4. El usuario realiza las pruebas funcionales del flujo.

No se publica el código a producción antes de instalar la migración. El endpoint devuelve un error claro si falta la configuración; nunca informa éxito de una operación parcial.

## Límites

- Los planes guardados antes de este cambio no se pueden identificar retroactivamente con seguridad; sus comidas siguen editándose por separado.
- Las listas anteriores no tienen trazabilidad, por lo que no se descuentan automáticamente.
- Mover conserva la distribución por días de la semana y no regenera recetas.
- El historial de operaciones conserva snapshots completos; conviene definir retención según uso real antes de un crecimiento significativo.
