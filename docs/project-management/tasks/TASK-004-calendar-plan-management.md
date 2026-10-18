# TASK-004 — Aplicación y administración de planes de calendario

Solicitud y criterio UX aprobados por el usuario en el chat del 18/10/2026.

- Detectar coincidencias por fecha y horario antes de aplicar un plan.
- Permitir completar vacíos, reemplazar comidas pendientes, guardar alternativas o elegir otra semana.
- Contabilizar únicamente la opción elegida en calorías y compras.
- Identificar las comidas de cada plan y permitir mover o retirar sus comidas futuras.
- Proteger fechas pasadas y comidas realizadas frente a cambios automáticos.
- Guardar calendario y compras en una operación atómica, con deshacer que preserve cambios posteriores.
- Ofrecer revisión explícita de comidas superpuestas anteriores, sin deducir automáticamente que son alternativas.
- Mantener las pruebas funcionales a cargo del usuario. La revisión estática de tipos es parte de la implementación.

El despliegue requiere aplicar primero `sql/011_calendar_plans.sql` en la misma base Supabase que utiliza producción.
