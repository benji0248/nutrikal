# NutriKal — Roadmap v6 (Module-by-Module)

Each module is self-contained. We complete one fully before starting the next.
"Complete" means: code written, types clean, build passes, pushed, tested in browser.

**Order rationale:** The chat (Nutri) is the engine of everything — without it, the calendar
is empty and shopping has nothing. So we clean up first, then perfect the chat, then the
calendar (which now has data to show), then everything else.

**Claude Web reviews UX** starting from Module 1 (Nutri). Each module gets reviewed
in the browser before moving to the next.

---

## Module 0: Cleanup (Claude Code only)
**Goal:** Remove dead code and features that are out of scope. Start clean.

### Remove:
- [ ] Water tracking — remove from DayPlan type, calendar UI, stores, sync
- [ ] Week templates — remove WeekTemplate type, store actions, UI references
- [ ] Activity log — remove ActivityEntry type, ActivityLog component, store data
- [ ] Calculator tab — remove 'calculator' from AppTab, remove CalorieCalculator standalone usage
- [ ] WhatShouldIEat.tsx — delete (orphaned, replaced by AI chat)
- [ ] PlanPreferencesForm.tsx — delete (never used)
- [ ] Dead ChatMessageTypes — remove 'assistant-recipe', 'assistant-water', 'assistant-energy'
- [ ] Dead assistant components — RecipeCard, PortionAdjuster (if orphaned)

### Fix:
- [ ] migratePayload() — add customDishes handling
- [ ] Clean up unused imports across all modified files

### Verify:
- [ ] `npx tsc --noEmit` → zero errors
- [ ] `npm run build` → success
- [ ] All 5 tabs still work
- [ ] Sync still works (push + pull)

---

## Module 1: Nutri (AI Chat) — Claude Web reviews first
**Goal:** The AI chat is the heart of the app. It must feel natural, contextual, and useful.
This is the FIRST module Claude Web reviews in the browser.

### Why first:
- The chat generates plans → fills the calendar → generates shopping lists
- If the chat doesn't work well, everything downstream is useless
- UX polish here has the highest impact on the whole app

### Changes:
- [ ] Welcome message with 2-3 contextual quick replies (not generic)
- [ ] Quick replies are ALWAYS contextual to the AI's question
- [ ] Dialogue-first: AI asks 2-3 questions before generating a plan
- [ ] Short responses: 1-3 sentences max
- [ ] Week plan review (WeekPlanner) renders correctly inline
- [ ] Apply plan → meals appear in calendar + shopping list generated
- [ ] Swap meal from plan works
- [ ] Error states are friendly (offline, rate limit, API error)
- [ ] Rate limit message is friendly
- [ ] Chat scroll behavior is smooth (auto-scroll to latest)
- [ ] Input UX: clear after send, disable while loading
- [ ] Loading state: "Pensando..." bubble

### Claude Web reviews:
- [ ] Full conversation flow: open → ask for plan → dialogue → plan generated → apply
- [ ] Mobile layout (375px): no overflow, touch targets OK
- [ ] Quick replies look and feel right
- [ ] WeekPlanner inline rendering
- [ ] Error states

---

## Module 2: Calendario (Home + Empty State)
**Goal:** Calendar opens to today. Empty days nudge you to plan.

### Changes:
- [ ] Calendar defaults to day view (today) on app open
- [ ] Today's view shows 4 meal slots (desayuno/almuerzo/cena/snack)
- [ ] Each slot: empty state with "+" or filled with dish name + human portion
- [ ] Energy bar always visible at top (color state, no numbers)
- [ ] **Empty state detection:** if today/week has no meals → friendly banner:
  "No tenés nada planificado. ¿Armamos la semana?" → taps to Nutri tab
- [ ] Quick-add: tap "+" on slot → dish search → select → done (2 taps)
- [ ] Week/month views accessible via toggle
- [ ] Remove calculator integration from meal slots

### Claude Web reviews:
- [ ] Opening app → today's view with meals or empty state
- [ ] Empty state message + CTA to Nutri
- [ ] Adding a meal in 2 taps
- [ ] Energy bar correct color
- [ ] Week/month still work

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

### Claude Web reviews:
- [ ] Tab shows dishes sorted by frequency
- [ ] Favoriting works and persists
- [ ] Dish detail view looks good
- [ ] Empty state for new users

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

### Claude Web reviews:
- [ ] Apply week plan → shopping list appears
- [ ] Sections are logical
- [ ] Check/uncheck UX
- [ ] Mobile layout

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

### Claude Web reviews:
- [ ] AI suggests a novel dish
- [ ] Dish appears in Historial
- [ ] Macros look reasonable

---

## Module 6: Onboarding
**Goal:** New users have a smooth first experience.

### Changes:
- [ ] First-time flow: profile creation → "Armemos tu primera semana"
- [ ] Guided chat: AI walks through preferences (what you like, cooking time, etc.)
- [ ] Generates first week plan
- [ ] Shows how to use the app (brief, not a tutorial)

### Claude Web reviews:
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

### Claude Web reviews:
- [ ] Changing weight recalculates budget
- [ ] Restrictions affect AI suggestions
- [ ] Export/import works

---

## Parking Lot (Not Planned, Maybe Later)
- Notifications/reminders for meals
- Multi-user family sharing (shared shopping list)
- Water tracking (removed but could return)
- Meal photos
- Integration with delivery apps
- PWA install prompt
- Companion/streak system
