# TASK-009 — Entrega

Implementado MCP remoto sin sesiones en `/api/mcp`, SDK oficial 1.32.1 fijado, veinte herramientas reutilizando funciones existentes. Recursos de guía y contratos, y prompt de organización. No llama un segundo modelo ni requiere claves de base en el cliente.

La pantalla `/mcp` permite crear accesos de lectura o lectura+borradores, copiar el secreto una vez, revocar y revisar borradores/solicitudes. Los accesos duran 30 días y se guardan solo como hash. El MCP crea solicitudes de aplicación/undo; la persona confirma con su sesión del sitio. Los tokens MCP no son aceptados para esa confirmación. Hay puente stdio sin lógica de negocio ni banners por stdout.

Archivos: `api/_lib/mcp/`, router business, `scripts/nutrikal-mcp.mjs`, portal/servicio frontend y entrada lazy en App/selector. Migración aditiva `20261019004920_mcp_access_and_reviews` aplicada y metadatos verificados: RLS, ausencia de accesos browser, backend con permisos mínimos y borradores/revisiones sin UPDATE/DELETE. No se migraron ni alteraron comidas para esta tarea.

Verificación: build; TypeScript estricto; ESLint dirigido; `node --check` del puente; compilación y carga nativa ESM del backend y handler MCP. No hubo llamadas autenticadas funcionales, emisión de accesos de prueba ni modificaciones de la dieta. Pruebas de uso a cargo del usuario.

Límites y conexión: Bearer manual/stdio; OAuth y alta automática en un cliente externo no están implementados. Revisiones vencen a los 30 minutos; tokens y solicitudes vencidos conservan metadatos sin purga automática. La documentación completa y ejemplos están en `docs/architecture/10_mcp.md`.
