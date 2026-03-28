# NutriKal — Product Vision & Business Rules

## What is NutriKal

A personal nutrition assistant for families and small groups (10-20 people).
The app handles the mental load of food: what to eat, what to buy, and how to eat better — without calorie anxiety.

**One sentence:** "Abrís la app, ya sabés qué comer."

---

## Target Users

- Small group: family + friends (10-20 people)
- People who find daily food decisions exhausting
- People who want to eat better without obsessing over numbers
- Argentine context: local ingredients, dishes, and habits

---

## Core Problem

Three daily problems, solved together:
1. **"¿Qué como?"** — Decision fatigue around every meal
2. **"Quiero comer mejor"** — Nutrition guidance without calorie obsession
3. **"¿Qué compro?"** — Knowing exactly what to buy at the supermarket

---

## Core Philosophy

- **Zero effort planning** — The app plans for you. You approve or tweak.
- **No calorie anxiety** — Users NEVER see calorie numbers. All nutrition is internal.
- **Human language** — "2 milanesas con ensalada", not "300g de carne + 150g de lechuga".
- **Forward-only framing** — Never scold, guilt, or reference past failures.
- **AI as engine, not gimmick** — The AI does the heavy lifting silently. The UI is simple.

---

## The 5 Tabs

### 1. Calendario (Home)
- **Opens to today's view** by default
- Shows: what you ate, what's planned, energy bar (color, not numbers)
- Quick-add: tap an empty slot → dish search → done in 2 taps
- Can switch to week/month view to see the bigger picture
- Each meal slot shows the dish name + human portion

### 2. Nutri (AI Chat)
- Conversational nutritionist powered by Gemini
- **Primary use:** "Armame la semana" → dialogue → generated plan → review → apply
- **Secondary use:** "¿Qué como ahora?" → contextual suggestion based on today's plan
- **Tertiary use:** Emotional support ("tengo ansiedad", "comí de más")
- Dialogue-first: AI asks before acting (preferences, mood, constraints)
- Quick reply chips: AI generates contextual response buttons per message
- Actions: add meal, plan week, swap meal, suggest dishes, show summary

### 3. Historial (History + Favorites)
- Everything you've eaten, ordered by frequency (most eaten on top)
- Manual favorites (heart icon on any dish)
- AI-invented dishes get saved here too
- Replaces the old "Recetas" tab
- Tap a dish → see ingredients, portions, mark as favorite

### 4. Compras (Shopping)
- Auto-generated from planned meals
- Organized by supermarket section (produce, meat, dairy, etc.)
- Checkable items for shopping
- Can merge multiple days into one list

### 5. Ajustes (Settings)
- Profile: name, age, sex, height, weight, activity level, goal
- Dietary restrictions and disliked ingredients
- Theme toggle (dark/light)
- Data export/import
- Account management (logout)

---

## AI System Rules

### Personality
- Warm, friendly, concise. Speaks in Argentine Spanish (vos, dale, bárbaro)
- Never judges. If someone overate or feels anxious, be supportive
- Practical: short answers, no lectures

### Dialogue-First Rule
- NEVER generate a full plan without asking at least 2-3 questions first
- One question at a time, max 2 sentences per message
- Quick replies must be CONTEXTUAL responses to the AI's question

### Nutrition Rules (Internal Only)
- Calories are calculated but NEVER shown or mentioned
- Metabolic budget guides suggestions silently
- Balance meals: protein spread across the day
- Variety: don't repeat the same dish more than 2x per week
- Respect dietary restrictions absolutely

### Dish Invention (Future Module)
- Gemini can invent new dishes beyond the catalog
- Dishes are built using ingredients from the DB (287+ ingredients with real macros)
- Gemini names the ingredients → backend matches against DB → calculates real macros
- If an ingredient isn't in the DB, fallback to estimation
- Invented dishes are saved to the user's history automatically

### Forbidden Language
- Never: calorías, kcal, dieta, restricción, prohibido, malo, culpa, exceso
- Never: red colors for nutrition feedback (use amber → warm orange)
- Never: blocking modals for warnings (use toasts, always include "Dejalo así")

---

## Data Model

### What Gets Tracked
- **Meals:** dish name, ingredients, portions, macros (internal), linked dish ID
- **Day plans:** 4 slots (desayuno, almuerzo, cena, snack) per day
- **Favorites:** manually marked dishes
- **History:** frequency count per dish (auto-calculated from meal history)
- **Shopping lists:** auto-generated, organized by section
- **Profile:** metabolic data for silent calorie budgeting

### What Gets Removed (v6)
- ~~Water tracking~~ — removed, was noise
- ~~Week templates~~ — removed, AI replaces this
- ~~Activity log~~ — removed, out of scope
- ~~Calculator tab~~ — removed, meals are added directly
- ~~Hardcoded chat flows~~ — replaced by Gemini AI

---

## Metabolic System (Hidden)

```
TMB (Mifflin-St Jeor):
  Male:   (10 × kg) + (6.25 × cm) - (5 × age) + 5
  Female: (10 × kg) + (6.25 × cm) - (5 × age) - 161

TDEE = TMB × activityFactor
dailyBudget = max(1200, TDEE + goalAdjustment)

Energy bar states (NEVER show numbers):
  < 70% budget → green  "Vas bien hoy"
  < 90% budget → amber  "Casi completaste el día"
  ≥ 90% budget → warm_orange "Hoy comiste un poco más..."
```

---

## Non-Negotiable UX Rules

1. **48px minimum touch targets** — all interactive elements
2. **No horizontal scroll** — ever, at any viewport
3. **Mobile-first** — design for 375px, then scale up
4. **2-tap meal registration** — tap empty slot → search dish → done
5. **Human portions only** — "2 papas medianas", never "300g"
6. **Open to today** — Calendar always starts on today's view
7. **Quick replies are contextual** — AI generates them per message, never generic
