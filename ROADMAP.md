# NutriKal — Roadmap v6 (Module-by-Module)

Each module is self-contained. We complete one fully before starting the next.
"Complete" means: code written, types clean, build passes, pushed, tested in browser.

---

## Module 0: Cleanup
**Goal:** Remove dead code and features that are out of scope. Start clean.

### Remove:
- [ ] Water tracking — remove from DayPlan type, calendar UI, stores, sync
- [ ] Week templates — remove WeekTemplate type, store actions, UI references
- [ ] Activity log — remove ActivityEntry type, ActivityLog component, store data
- [ ] Calculator tab — remove 'calculator' from AppTab, remove CalorieCalculator standalone usage
- [ ] WhatShouldIEat.tsx — delete (orphaned, replaced by AI chat)
- [ ] PlanPreferencesForm.tsx — delete (never used)
- [ ] Dead ChatMessageTypes — remove 'assistant-recipe', 'assistant-water', 'assistant-energy'

### Fix:
- [ ] migratePayload() — add customDishes handling
- [ ] Clean up unused imports across all modified files

### Verify:
- [ ] `npx tsc --noEmit` → zero errors
- [ ] `npm run build` → success
- [ ] All 5 tabs still work
- [ ] Sync still works (push + pull)

---

## Module 1: Calendar → "Hoy" (Home Experience)
**Goal:** Calendar opens to today. Today's view is the home screen of the app.

### Changes:
- [ ] Calendar defaults to day view (today) on app open
- [ ] Today's view redesign:
  - 4 meal slots clearly visible (desayuno/almuerzo/cena/snack)
  - Each slot: empty state with "+" or filled with dish name + human portion
  - Energy bar always visible at the top (color state, no numbers)
  - Tap empty slot → dish search → select → done (2 taps)
- [ ] Quick-add flow: tap "+" on slot → inline search → pick dish → saved
- [ ] Remove calculator integration from meal slots (was CalorieCalculator)
- [ ] Week/month views accessible via toggle, not tabs
- [ ] Rename tab label from "Calendario" to "Hoy" (or keep "Calendario" — decide during implementation)

### Verify:
- [ ] Opening app lands on today's meal view
- [ ] Adding a meal takes max 2 taps
- [ ] Energy bar shows correct color state
- [ ] Week/month views still accessible
- [ ] Meals sync properly

---

## Module 2: Nutri (AI Chat) Polish
**Goal:** The AI chat is conversational, contextual, and reliable.

### Changes:
- [ ] Quick replies are always contextual (verify with testing)
- [ ] Welcome message includes 2-3 initial quick replies
- [ ] Error states are friendly (offline, rate limit, API error)
- [ ] Conversation history persists during session (already works)
- [ ] Week plan review (WeekPlanner) renders correctly inline
- [ ] Apply plan → meals appear in calendar + shopping list generated
- [ ] Swap meal from plan works
- [ ] Rate limit message is friendly

### Verify:
- [ ] 5+ conversation flows tested end-to-end
- [ ] Quick replies change with every message
- [ ] Plan generation → review → apply → calendar has meals
- [ ] No generic quick replies appear

---

## Module 3: Historial (History + Favorites)
**Goal:** Replace "Recetas" tab with meal history + favorites.

### Changes:
- [ ] New tab: "Historial" replaces "Recetas"
- [ ] Track meal frequency: count how many times each dish is eaten
- [ ] Display: dishes sorted by frequency (most eaten first)
- [ ] Favorite toggle: heart icon on any dish
- [ ] Favorites section at top, then frequent dishes below
- [ ] Tap dish → detail view (ingredients, human portions)
- [ ] Keep custom dish CRUD (create/edit/delete) — accessed from dish detail
- [ ] AI-suggested dishes that get applied to calendar auto-appear in history

### Data changes:
- [ ] Add `dishFrequency: Record<string, number>` to synced data
- [ ] Add `favoriteDishIds: string[]` to synced data
- [ ] Update frequency count whenever a meal is added to calendar
- [ ] Migrate existing meal data to populate initial frequency counts

### Verify:
- [ ] Tab shows dishes sorted by frequency
- [ ] Favoriting works and persists
- [ ] Custom dish CRUD still works
- [ ] New meals increment frequency counter
- [ ] Data syncs properly

---

## Module 4: Compras (Shopping) Polish
**Goal:** Shopping list is reliable and useful.

### Changes:
- [ ] Auto-generation from weekly plan works end-to-end
- [ ] Items organized by supermarket section
- [ ] Check/uncheck items
- [ ] Clear completed items
- [ ] Manual add item option
- [ ] Consolidation: if plan has "pollo" twice, show combined amount

### Verify:
- [ ] Apply week plan → shopping list auto-generated
- [ ] Add single meal → items added to list
- [ ] Sections are correct
- [ ] Checked items persist

---

## Module 5: AI Dish Invention
**Goal:** Gemini can create new dishes beyond the catalog, with real macro calculation.

### Changes:
- [ ] Gemini can suggest dishes not in catalog
- [ ] Response format includes ingredient list with estimated grams
- [ ] Backend matches ingredient names against DB (fuzzy matching)
- [ ] Calculates real macros from matched ingredients
- [ ] Unmatched ingredients: use Gemini estimation as fallback
- [ ] New dishes auto-saved to user's dish collection
- [ ] Saved dishes appear in Historial tab
- [ ] System prompt updated to allow invention beyond catalog

### Verify:
- [ ] AI suggests a dish not in catalog
- [ ] Dish gets saved with calculated macros
- [ ] Dish appears in Historial
- [ ] Macros are reasonable (spot-check against known values)

---

## Module 6: Onboarding
**Goal:** New users have a smooth first experience.

### Changes:
- [ ] First-time flow: profile creation → "Armemos tu primera semana"
- [ ] Guided chat: AI walks through preferences (what you like, cooking time, etc.)
- [ ] Generates first week plan
- [ ] Shows how to use the app (brief, not a tutorial)

### Verify:
- [ ] New user → profile → first plan → calendar populated
- [ ] Feels natural, not like a tutorial

---

## Module 7: Profile & Settings Polish
**Goal:** Settings are clean and useful.

### Changes:
- [ ] Profile editing (weight updates for recalibration)
- [ ] Dietary restrictions clearly displayed
- [ ] Disliked ingredients management
- [ ] Theme toggle
- [ ] Data export/import
- [ ] Account management
- [ ] Remove any dead settings UI

### Verify:
- [ ] Changing weight recalculates budget
- [ ] Restrictions affect AI suggestions
- [ ] Export/import works end-to-end

---

## Parking Lot (Not Planned, Maybe Later)
- Notifications/reminders for meals
- Multi-user family sharing (shared shopping list)
- Water tracking (removed but could return)
- Meal photos
- Integration with delivery apps
- PWA install prompt
- Companion/streak system
