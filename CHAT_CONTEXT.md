# NutriKal — Chat Module (Nutri) — Full Context for Review

## What This File Is

This is the complete context for reviewing and perfecting the **Nutri** tab — the AI chat that acts as a personal nutritionist. This is the ENGINE of the entire app: it generates meal plans that feed the calendar and shopping list.

Read PRODUCT.md first for the full product vision. This file focuses specifically on the chat module.

---

## How the Chat Works Today

### Architecture

```
User types message or taps quickReply
  → useChatEngine.ts detecta intent, builds context
  → aiService.ts POST /api/ai/chat (message + context)
  → api/ai/chat.ts receives, builds Gemini prompt
  → api/_lib/gemini.ts has the system prompt
  → Gemini responds with JSON: { text, actions, quickReplies }
  → Frontend renders text as bubble, executes actions, shows quickReplies as chips
```

### Files Involved

| File | Role |
|---|---|
| `src/components/assistant/ChatAssistant.tsx` | Main chat UI — message list, input, scroll |
| `src/components/assistant/useChatEngine.ts` | Chat brain — state, message handling, action execution |
| `src/components/assistant/ChatMessageBubble.tsx` | Renders each message type (text, options, plan, summary) |
| `src/components/assistant/ChatHeader.tsx` | Top bar with "NutriKal - Tu asistente de nutrición" |
| `src/components/assistant/OptionChips.tsx` | Quick reply buttons |
| `src/components/assistant/DayEnergyBar.tsx` | Color-only energy bar (green/amber/orange) |
| `src/components/planner/WeekPlanner.tsx` | Week plan review (inline in chat) |
| `src/components/planner/PlanReviewGrid.tsx` | 7-day × 4-slot grid for reviewing generated plan |
| `src/components/planner/PlanMealCell.tsx` | Individual meal cell in the plan grid |
| `src/components/planner/PlanAppliedView.tsx` | Success confirmation after applying plan |
| `src/services/aiService.ts` | Client-side: buildContext, sendMessage, compressCatalog |
| `api/ai/chat.ts` | Server endpoint: auth, rate limit, Gemini call |
| `api/_lib/gemini.ts` | Gemini client + system prompt |
| `api/_lib/rateLimit.ts` | 80 messages/day per user |

### Message Types

| Type | What it shows |
|---|---|
| `assistant-text` | AI text bubble (left-aligned, gray bg) |
| `assistant-loading` | "Pensando..." with spinner |
| `assistant-options` | Quick reply chips (contextual buttons) |
| `assistant-dishes` | Dish suggestion cards with name + portion + reason |
| `assistant-plan` | WeekPlanner component inline (7-day plan review) |
| `assistant-applied` | Green confirmation after plan is applied |
| `assistant-summary` | Day summary with meal list + energy bar |
| `user-text` | User typed message (right-aligned, accent bg) |
| `user-choice` | User tapped a quick reply (same style as user-text) |

### Actions Gemini Can Return

```typescript
// Add a single meal to a specific day
{ type: 'add_meal', date: 'YYYY-MM-DD', mealType: 'almuerzo', dishId: 'dish_XXX', servings: 1 }

// Generate a full week plan (shows WeekPlanner for review)
{ type: 'week_plan', days: [{ date: 'YYYY-MM-DD', meals: { desayuno: { dishId, servings }, ... } }] }

// Replace a meal in the calendar
{ type: 'swap_meal', date: 'YYYY-MM-DD', mealType: 'cena', dishId: 'dish_XXX', servings: 1 }

// Suggest dishes (renders dish cards)
{ type: 'suggest_dishes', dishes: [{ dishId: 'dish_XXX', reason: 'razón corta' }] }

// Show today's summary with energy bar
{ type: 'show_summary' }
```

### Quick Replies

Gemini generates `quickReplies` per message — short contextual buttons the user can tap instead of typing. They must be direct responses to whatever the AI just asked. They are NOT generic navigation buttons.

---

## What the Chat Does Well

1. **Gemini responds in Argentine Spanish** — natural, warm tone
2. **Actions work** — adding meals, planning weeks, swapping meals
3. **Quick replies exist** — users don't have to type everything
4. **Rate limiting** — 80 msgs/day, friendly message when exceeded
5. **Loading state** — "Pensando..." bubble while waiting
6. **Week planner** — inline plan review with apply/regenerate

---

## Known Problems to Fix

### 1. No clear purpose on first open
When you open the Nutri tab for the first time (with a profile), you see:
> "¡Hola, [name]! Soy tu nutricionista. Contame, ¿qué necesitás?"

No quick replies, no guidance. The user stares at an empty chat with a text input.

**What should happen:** The welcome should immediately offer the most useful actions via quick replies. The user should never wonder "what do I do here?"

### 2. Quick replies sometimes generic
Despite prompt engineering, Gemini occasionally returns generic replies like "Planificar mi semana" instead of contextual ones tied to its question. The system prompt has explicit examples and prohibitions but the model (gemini-3.1-flash-lite-preview) sometimes ignores them.

### 3. No onboarding integration
When a new user logs in for the first time, there's no guided flow. They land on the calendar (which is empty) and have to discover they should go to Nutri → create profile → then plan. The path is unclear.

**Ideal flow:** Login → profile creation (automatic or prompted) → "¡Listo! ¿Armamos tu primera semana?" → dialogue → plan → apply → calendar now has data.

### 4. Chat doesn't remember across sessions
The conversation resets on page reload. There's no persistent chat history. This is intentional for now (simpler), but means the user can't reference previous conversations.

### 5. Dish suggestions are text-only
When Gemini suggests dishes, they show as simple text cards (name + portion + reason). There's no way to tap a suggestion and say "sí, ese" to add it directly. The user has to type it.

### 6. Week planner UX on mobile
The plan review grid works but could be tighter on small screens. Day tabs are small, meals don't show enough info at a glance.

### 7. No feedback after adding individual meals
When Gemini adds a meal via `add_meal`, the user sees the AI text but there's no visual confirmation that the meal was actually added to their calendar. No green checkmark, no "Agregado al miércoles" banner.

### 8. Energy bar context
The summary shows an energy bar but there's no explanation of what the colors mean for new users.

### 9. Missing "undo" for applied plans
Once a week plan is applied, there's no way to undo it. This is scary for users — "what if I don't like it?"

---

## System Prompt (Current)

The Gemini system prompt lives in `api/_lib/gemini.ts`. Key rules:

- **Personality:** Warm, concise, Argentine Spanish (vos, dale, bárbaro)
- **Dialogue-first:** Ask 2-3 questions before generating a plan
- **Short messages:** 1-3 sentences max
- **Never mention calories** — ever, in any form
- **Forbidden language:** dieta, restricción, prohibido, malo, culpa, exceso
- **Only use catalog dishes** — never invent dish IDs
- **Quick replies must be contextual** — direct responses to the AI's question
- **JSON response format** — `{ text, actions, quickReplies }`

---

## Context Sent to Gemini

The `aiService.ts` uses intent detection to send only relevant context:

| User mentions | Context included |
|---|---|
| Always | Profile (name, goal, restrictions, budget) |
| "semana", "plan", day names | Full dish catalog + week summary |
| "hoy", "ahora", meal names | Today's plan + catalog |
| "ansiedad", "antojo", "hambre" | Today's plan (to know what they ate) |
| General chat | Profile only |

The catalog is compressed to ~1,200 tokens for ~80 dishes:
```
dish_001:Tostadas con queso crema y palta|desayuno|rapido,vegetariano|350
```

---

## Dish Catalog

- ~80 Argentine dishes in `src/data/dishes.ts`
- ~270 Argentine ingredients in `src/data/ingredients.ts`
- Each dish has: name, category, tags, ingredients with grams, human portion, prep time
- Custom dishes can be created by users (stored in useRecipesStore)
- Future: Gemini will be able to invent new dishes (Module 5)

---

## What We Want the Chat to Become

### Core Use Cases (in priority order)

1. **"Armame la semana"** — The #1 use case. User asks for a weekly plan → AI dialogues (preferences, mood, constraints) → generates plan → user reviews → applies → calendar is full, shopping list is ready.

2. **"¿Qué como ahora?"** — Quick contextual suggestion. AI checks what you've eaten today, your budget, and suggests 2-3 options.

3. **"Tengo ansiedad/antojo"** — Emotional support + practical suggestion. AI is supportive, then offers a healthy option that satisfies the craving.

4. **"Cambiame la cena del jueves"** — Swap a specific meal from the plan for something else.

5. **"¿Cómo vengo hoy/esta semana?"** — Summary of what you've eaten, energy bar, encouragement.

### UX Principles for the Chat

- **2 taps to start:** Open Nutri → tap quickReply → conversation flows
- **Never blank:** Always show quick replies or guidance
- **Confirmations are visual:** Green checkmarks, "Agregado" badges, not just text
- **The AI is a partner, not a tool:** It remembers context within the session, follows up, cares
- **Mobile-first:** Everything works at 375px. No overflow, no tiny targets.

---

## Testing Checklist

When reviewing this module, test these flows:

- [ ] Open Nutri tab → see welcome + useful quick replies
- [ ] Tap a quick reply → conversation starts naturally
- [ ] Ask "Armame la semana" → AI asks preferences first (doesn't just dump a plan)
- [ ] After 2-3 exchanges → AI generates a week plan → WeekPlanner renders inline
- [ ] Review plan: tap days, see meals, tap "Aplicar" → success confirmation
- [ ] After applying: meals appear in calendar, items in shopping list
- [ ] Tap "Regenerar" → AI generates different options
- [ ] Swap a meal from the plan → AI replaces it
- [ ] Ask "¿Qué como hoy?" → contextual suggestion based on today's plan
- [ ] Send emotional message ("tengo ansiedad") → supportive response
- [ ] Ask "¿Cómo vengo hoy?" → summary with energy bar
- [ ] Quick replies are always contextual (never generic)
- [ ] Loading state shows "Pensando..." bubble
- [ ] Mobile: no horizontal scroll, all buttons ≥ 48px
- [ ] Rate limit: after 80 messages → friendly limit message
