# Fase 4 & 5: Motor Creador y Ajuste de Porciones (Desacople)

## 1. Objetivos
- Separar estrictamente la "Creatividad Narrativa" (Gemini) de la "Precisión Matemática" (NutriKal). 
- Eliminar la necesidad de que el LLM calcule calorías, garantizando un índice de acierto del 100% respecto a los objetivos calóricos y macronutricionales del usuario.
- Fusionar la fase de coincidencia de base de datos (Ingredient Matching) directamente dentro del algoritmo resolutor de backend/algoritmo interno.

## 2. Cambios en el Modelo de Datos
- **Middleware de Selección (Generación Temprana):**
  - Se pre-filtra nuestra `INGREDIENTS_DB` según preferencias de usuario. Gemini recibe una lista de IDs e "Ingredientes Base" permitidos.
- **Contrato de Datos (Respuesta de Gemini):**
  - Gemini **solamente** devuelve metadata creativa: nombre del plato, y array de IDs de ingredientes (sin números, gramos, ni calorías).
    ```json
    { "name": "Bife con Papa", "ingredientIds": ["ing_005", "ing_040"] }
    ```
- **El Motor de Ajuste (Rehidratación Matemática):**
  - Nuevo módulo lógico (`portionEngine`). Recibe los IDs. 
  - Clasifica roles de ingredientes (Grupo Proteínas, Grupo Energía/Carbos, Grupo Grasa, Grupo Volumen/Verduras).
  - Prorratea el Presupuesto Calórico (ej: 600 kcal del almuerzo) sobre esos grupos aplicando porcentajes macros pre-estimados.
  - Resuelve algebraicamente: `Gramos = (Kcal_Target / Kcal_Base_db) * 100`.
  - Rehidrata la comida con datos listos para el Frontend.

## 3. Criterios de Aceptación
- La salida cruda de Gemini (antes del post-proceso) carece temporalmente de toda unidad métrica, calórica o de masa.
- El Motor de Ajuste calcula gramos matemáticamente perfectos. Cada comida de cada día clava estadísticamente el target exacto o el proporcional del requerimiento calórico del usuario (con margen < 5%).
- La disminución de tokens devueltos por Gemini es notable (al prescindir del objeto complejo con gramos y calorías manuales iteradas por 28 comidas), acelerando los tiempos de respuesta radicalmente.
- Los ingredientes en la UI coinciden en un 100% con nuestra DB, posibilitando una lista del súper completamente limpia.
