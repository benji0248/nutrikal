# TASK-006 — Reparar arranque del backend en producción

El usuario informó errores 500 en perfil, carga de datos, migración de datos locales e historial después de publicar el asistente. Autoriza corregir y publicar directamente sin volver a la versión anterior. Se conserva la preferencia de que el usuario realice las pruebas de uso.

Objetivo: corregir la resolución de imports del código compartido que carga el backend nativo ESM, comprobar el arranque de módulos y publicar la reparación. No modificar datos del usuario ni recrear el perfil.
