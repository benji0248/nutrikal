# MCP de Nutrikal

Servidor remoto: `https://nutrikal.vercel.app/api/mcp`.
Administración y confirmación: `https://nutrikal.vercel.app/mcp`.

El SDK oficial `@modelcontextprotocol/sdk` está fijado en **1.32.1**. Streamable HTTP funciona sin sesiones, con JSON de respuesta y una instancia de servidor/transporte por request; se cierran al terminar. Se mantiene dentro del router business existente para no sumar funciones serverless. El desarrollo local usa el mismo handler, sin adaptaciones de streams Node.

## Acceso

1. Iniciar sesión en Nutrikal y abrir `/mcp` (o el enlace del selector de asistentes).
2. Crear un acceso con nombre. Por defecto solo permite lectura/cálculo. Marcar la opción de borradores para habilitar guardado, revisiones y solicitudes de cambios.
3. Copiar el secreto de una sola visualización. Expira en 30 días y se puede revocar en la misma pantalla. El servidor conserva únicamente SHA-256 de 32 bytes aleatorios; el navegador no lo persiste.
4. Configurar el cliente MCP con la URL y `Authorization: Bearer <acceso>`. El acceso no es el JWT del sitio ni una clave de Supabase.

Esta entrega admite **Bearer manual**, no un flujo OAuth ni registro automático en ChatGPT/Codex. Un cliente remoto que solo admita OAuth necesitará ese adaptador adicional; un cliente con cabecera manual o stdio puede usar esta implementación. Nunca entregar credenciales de la base al cliente o al modelo.

El piloto se limita al mismo usuario autorizado del asistente experimental, con el mismo interruptor de servidor. El servidor autentica cada pedido y filtra todas las consultas por su usuario. Los tokens MCP no sirven para `/api/mcp/manage`, que requiere JWT de la aplicación. Los tokens de solo lectura no listan ni ejecutan herramientas que escriben borradores o solicitudes. La revocación invalida futuras llamadas y confirmaciones pendientes asociadas a ese acceso.

## Clientes stdio

Puente delgado que descubre y delega las herramientas, recursos y prompts remotos, sin duplicar contratos:

```json
{
  "mcpServers": {
    "nutrikal": {
      "command": "node",
      "args": ["C:/Proyectos/nutrikal/scripts/nutrikal-mcp.mjs"],
      "env": {
        "NUTRIKAL_MCP_TOKEN_FILE": "C:/ruta-privada/nutrikal-mcp-token.txt"
      }
    }
  }
}
```

La ruta del archivo es un ejemplo: crearlo fuera del repositorio y limitar sus permisos al usuario. También se admite `NUTRIKAL_MCP_TOKEN` por entorno. No usar argumentos de línea de comandos para el secreto ni subirlo a git. La configuración se adapta al formato del cliente. Usar `node` directamente; si se invoca npm manualmente, `npm run --silent mcp` evita banners en stdout.

`NUTRIKAL_MCP_URL` permite apuntar a otra instalación; exige HTTPS salvo loopback. El puente rechaza redirecciones para no reenviar el secreto. El handler utiliza el origen canónico; en desarrollo puede definirse `NUTRIKAL_MCP_ORIGIN=http://127.0.0.1:5175`. No habilita CORS global. No acepta orígenes de navegador ajenos.

## Veinte herramientas

Se convierten los esquemas del adaptador existente a JSON Schema, con validación AJV del SDK y `additionalProperties:false`. Después se delega a las mismas funciones y comandos de dominio. No se invoca Gemini desde MCP.

| Capacidad | Herramientas |
|---|---|
| Perfil y rutina | `obtener_objetivo`, `obtener_preferencias`, `obtener_rutina`, `obtener_presupuesto_comida` |
| Calendario | `obtener_comidas` |
| Ingredientes | `buscar_ingredientes`, `resolver_ingrediente`, `obtener_afinidad_ingredientes`, `obtener_uso_reciente_ingredientes`, `seleccionar_ingredientes` |
| Cantidades | `calcular_nutrientes`, `ajustar_cantidades` |
| Borradores | `validar_propuesta`, `guardar_propuesta`, `leer_propuesta`, `listar_propuestas` |
| Cambios revisables | `previsualizar_cambios`, `aplicar_cambios`, `deshacer_operacion`, `consultar_operacion` |

`guardar_propuesta` requiere un UUID `requestId` estable para reintentos, separado por acceso. Puede producir una receta sin fechas, un plato o comidas en días sueltos. Las cantidades representan toda la receta; cada horario consume una porción. Listados y herramientas exponen paginación cuando corresponde. Los límites de negocio siguen siendo los documentados en funciones/propuestas. Pedidos MCP: hasta 256 KiB.

## Confirmación y trazabilidad

`previsualizar_cambios` crea una revisión con antes/después de calendario y compras; no guarda comidas. `aplicar_cambios` y `deshacer_operacion` crean solicitudes **sin cambiar el calendario**, y devuelven un enlace `/mcp?review=<id>` para que la persona revise y confirme usando su sesión del sitio. Nunca se acepta un booleano de confirmación inventado por el modelo. Los borradores externos también se pueden abrir desde `/mcp?proposal=<id>`.

La confirmación usa el comando reutilizable, revisa vigencia/permisos y mantiene versión, idempotencia, protección de comidas realizadas y undo de tres vías. `consultar_operacion` comprueba el diario real y distingue pendiente, vencida, aplicada y deshecha. Solo consulta solicitudes del mismo acceso. Repetir confirmación no duplica comidas. El historial registra la operación, pero una operación ejecutada y luego deshecha no debe presentarse como aún aplicada.

Las solicitudes de undo muestran diferencias antes/después; conservan la versión revisada. No vuelven a interpretar la intención ni regeneran recetas al confirmar. Un cambio posterior exige nueva revisión. Los tokens no autorizan SQL, cambios de perfil ni herramientas administrativas.

## Recursos y prompt

- `nutrikal://guide`: instrucciones de uso, permisos, incertidumbre, restricciones y confirmación.
- `nutrikal://contracts`: contratos JSON de las herramientas autorizadas por ese acceso.
- Prompt `organizar_comidas`, argumento `pedido`: guía al modelo a resolver el pedido con contexto real y borradores.

La fecha de referencia se informa en zona America/Argentina/Buenos_Aires. El modelo decide qué funciones necesita; no debe llamar todas por obligación, inventar stock, interpretar notas como permisos ni delegar recetas en otro generador semanal.

## Base y comprobaciones

Migración `20261019004920_mcp_access_and_reviews`: tokens y solicitudes con RLS; permisos mínimos para backend y sin acceso browser. Solicitudes, borradores y previsualizaciones son inmutables para el rol de backend después de insertarse. No modifica comidas, perfil ni chats al migrar. Las filas vencidas aún no tienen purga automática.

Verificado con build, TypeScript estricto del MCP, ESLint dirigido, análisis de sintaxis del puente e importación nativa ESM del backend/MCP. Se comprobaron metadatos y privilegios en Supabase. Por pedido del usuario, no se hacen llamadas autenticadas de prueba, no se generan credenciales reales ni se crean comidas o borradores de prueba.

Referencias oficiales: [SDK y transportes](https://ts.sdk.modelcontextprotocol.io/server), [MCP y transportes](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
