# TASK-003 — Respetar la preferencia de evitar pescado

## Problema

El usuario informó que había seleccionado «Pescado» entre los alimentos que no le gustan y recibió merluza en el plan semanal. La UI almacenaba el grupo `pescado`, pero el filtro solo comparaba con la categoría de catálogo (`carnes` para merluza). Además, los generadores no cargaban los grupos excluidos ni sus excepciones desde el perfil.

## Cambios

- Regla compartida para identificar variedades y productos con pescado en las categorías de preferencias, la selección de excepciones y el filtro del inventario.
- Lectura de ingredientes excluidos, grupos y excepciones desde el perfil guardado para el plan semanal y las sugerencias individuales.
- Instrucciones explícitas para respetar las exclusiones y sus excepciones, sin limitar el listado a ocho ingredientes.
- Validación de los ingredientes generados: el plan semanal reintenta si contiene ingredientes excluidos y rechaza el resultado si continúa incumpliendo; una sugerencia individual incompatible no se entrega al usuario.
- Control al aplicar un plan antiguo al calendario, usando las preferencias actuales.
- Si falla la lectura del perfil, no se genera silenciosamente con preferencias vacías.

## Verificación y publicación

Revisión estática del código. No se ejecutan pruebas, compilación ni revisión visual local a pedido del usuario, que realizará las pruebas funcionales. Publicación mediante push a `master`, siguiendo el despliegue a producción solicitado durante esta sesión.

## Límites

No se consultaron ni modificaron los datos de la cuenta: el diagnóstico parte de la preferencia reportada por el usuario y del flujo de código. No se reemplaza el plan ya guardado. La detección por nombre depende de las denominaciones de ingredientes reconocidas y no constituye un clasificador universal de alimentos.
