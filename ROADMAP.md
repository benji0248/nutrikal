# NutriKal — Roadmap v6 (Module-by-Module)

**LAST UPDATED:** 2026-03-31

Each module is self-contained. We complete one fully before starting the next.
"Complete" means: code written, types clean, build passes, pushed, tested in browser.

**Order rationale:** The chat (Nutri) is the engine of everything — without it, the calendar
is empty and shopping has nothing. So we clean up first, then perfect the chat, then the
calendar (which now has data to show), then everything else.

**Claude Web reviews UX** starting from Module 1 (Nutri). Each module gets reviewed
in the browser before moving to the next.

**CURRENT STATUS:** Between Module 1 (85%) and Module 2 (95%). Ready for UX testing and vector DB setup.

---

## Module 0: Cleanup ✅ (95% Complete)
**Goal:** Remove dead code and features that are out of scope. Start clean.

### Remove:
- [x] Water tracking — removed from DayPlan type, calendar UI, stores, sync
- [x] Week templates — removed WeekTemplate type, store actions, UI references
- [x] Activity log — removed ActivityEntry type, ActivityLog component, store data
- [x] Calculator tab — **Kept but hidden**: CalorieCalculator integrated in MealSlot (only visible with "Mostrar calorías" toggle in Settings)
- [x] WhatShouldIEat.tsx — deleted (orphaned, replaced by AI chat)
- [x] PlanPreferencesForm.tsx — deleted (never used)
- [x] Dead ChatMessageTypes — removed 'assistant-recipe', 'assistant-water', 'assistant-energy'
- [x] Dead assistant components — RecipeCard, PortionAdjuster deleted

### Fix:
- [x] migratePayload() — customDishes handling added
- [x] Clean up unused imports across all modified files

### Verify:
- [x] `npx tsc --noEmit` → zero errors
- [x] `npm run build` → success
- [x] All 5 tabs still work
- [x] Sync still works (push + pull)

**Note:** CalorieCalculator exists but is intentionally hidden behind settings toggle. This is acceptable.

---

## Module 1: Nutri (AI Chat) ⚠️ (85% Complete) — NEEDS UX TESTING
**Goal:** The AI chat is the heart of the app. It must feel natural, contextual, and useful.
This is the FIRST module Claude Web reviews in the browser.

### Why first:
- The chat generates plans → fills the calendar → generates shopping lists
- If the chat doesn't work well, everything downstream is useless
- UX polish here has the highest impact on the whole app

### Changes:
- [x] Welcome message with 2-3 contextual quick replies (not generic)
- [x] Quick replies are ALWAYS contextual to the AI's question
- [x] Dialogue-first: AI asks 2-3 questions before generating a plan
- [x] Short responses: 1-3 sentences max
- [x] Week plan review (WeekPlanner) renders correctly inline
- [x] Apply plan → meals appear in calendar + shopping list generated
- [x] Swap meal from plan works
- [ ] **Error states are friendly** (offline, rate limit, API error) — code exists, needs testing
- [ ] **Rate limit message is friendly** — verify backend returns friendly message
- [x] Chat scroll behavior is smooth (auto-scroll to latest)
- [x] Input UX: clear after send, disable while loading
- [x] Loading state: "Pensando..." bubble

### Additional features implemented:
- [x] Sunday cheat day (higher calorie budget)
- [x] Variety modes: "Variado", "Un poco de cada", "Repetir"
- [x] Disliked ingredients sent to AI
- [x] Disliked food categories with exceptions
- [x] Top 100 quick picks for faster suggestions

### Claude Web reviews (PENDING):
- [ ] Full conversation flow: open → ask for plan → dialogue → plan generated → apply
- [ ] Mobile layout (375px): no overflow, touch targets OK
- [ ] Quick replies look and feel right
- [ ] WeekPlanner inline rendering
- [ ] Error states (offline, rate limit)

**Next:** Browser testing session with Claude Web to verify UX flows end-to-end.

---

## Module 2: Calendario (Home + Empty State) ⚠️ (95% Complete)
**Goal:** Calendar opens to today. Empty days nudge you to plan.

### Changes:
- [x] Calendar defaults to day view (today) on app open
- [x] Today's view shows 4 meal slots (desayuno/almuerzo/cena/snack)
- [x] Each slot: empty state with "+" or filled with dish name + human portion
- [x] Energy bar always visible at top (color state, no numbers)
- [ ] **Empty state detection:** if today/week has no meals → friendly banner:
  "No tenés nada planificado. ¿Armamos la semana?" → taps to Nutri tab
  **MISSING:** Global empty state banner with CTA to Nutri. Currently only individual "+" buttons per slot.
- [x] Quick-add: tap "+" on slot → dish search → select → done (2 taps)
- [x] Week/month views accessible via toggle
- [x] Remove calculator integration from meal slots (kept but hidden behind settings toggle)

### Claude Web reviews (PENDING):
- [ ] Opening app → today's view with meals or empty state
- [ ] Empty state message + CTA to Nutri
- [ ] Adding a meal in 2 taps
- [ ] Energy bar correct color
- [ ] Week/month still work

**Remaining work:** Implement global empty state banner (est. 2 hours).

---

## Module 2.5: Vector Database Setup (RECOMMENDED BEFORE MODULE 3)
**Goal:** Set up pgvector infrastructure for semantic search and personalization BEFORE starting to track meal history.

**Why now:** Module 3 will start tracking meal frequency/favorites. If we implement embeddings now, every dish gets its embedding from day 1. This makes future personalization trivial (no refactor needed).

**Why NOT later:** If we wait until after Module 3, we'll need to:
- Regenerate embeddings for all historical dishes
- Refactor recommendation logic
- Deal with migration complexity
- Estimated refactor cost: 2-3 weeks

**Investment now:** ~1 day of work
**Savings later:** 2-3 weeks of refactoring

### Backend Setup (Supabase):
- [ ] Activate pgvector extension in Supabase
- [ ] Create `dish_embeddings` table:
  ```sql
  create table dish_embeddings (
    id text primary key,
    user_id uuid references auth.users,
    dish_name text,
    embedding vector(768),  -- Gemini embedding-001 dimension
    ingredients jsonb,
    created_at timestamptz default now()
  );
  create index on dish_embeddings using ivfflat (embedding vector_cosine_ops);
  ```
- [ ] Create `user_dish_interactions` table (for future personalization):
  ```sql
  create table user_dish_interactions (
    user_id uuid,
    dish_id text,
    interaction_type text,  -- 'planned', 'completed', 'liked', 'disliked'
    created_at timestamptz default now()
  );
  ```

### Script: Generate Embeddings (one-time for existing dishes):
- [ ] Create `scripts/generateEmbeddings.ts`
- [ ] For each custom dish in `customDishes`: generate embedding and insert
- [ ] Run script to populate initial embeddings

### API Endpoints:
- [ ] `api/search/semantic.ts` — semantic search endpoint
  - Takes query string
  - Generates embedding via Gemini
  - Returns similar dishes via cosine similarity
- [ ] Modify `api/ai/chat.ts` to auto-generate embeddings when Gemini creates new dishes

### Integration:
- [ ] When AI generates a meal → auto-generate embedding → save to `dish_embeddings`
- [ ] When user adds custom dish → auto-generate embedding
- [ ] Test: verify embeddings are generated and stored

### Future-ready (don't implement yet, just prepare):
- Document how to use embeddings for:
  - Personalized recommendations (query user's favorite dishes embeddings)
  - Variety detection (ensure weekly plans have diverse embeddings)
  - Substitutions (find similar dishes with different macros)
  - Search in history (semantic search instead of string matching)

**Estimated time:** 4-6 hours (setup + testing)

**Success criteria:**
- [ ] pgvector tables exist and indexed
- [ ] AI-generated dishes automatically get embeddings
- [ ] Semantic search endpoint works (test query returns relevant dishes)
- [ ] Zero impact on current UX (runs in background)

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

## Module 5: AI Dish Invention ⚠️ (60% Complete)
**Goal:** Gemini can create new dishes beyond the catalog, with real macro calculation.

### Changes:
- [x] Gemini can suggest dishes not in catalog
- [x] Response format includes ingredient list with estimated grams + kcal
- [x] System prompt updated: "Creás comidas libremente. NO dependés de un catálogo fijo."
- [x] New dishes auto-saved to user's `customDishes` collection
- [ ] **Backend matches ingredient names against DB** (fuzzy matching) — currently Gemini estimates all macros
- [ ] **Calculates real macros from matched ingredients** — needs dishMatchService integration
- [ ] **Unmatched ingredients: use Gemini estimation as fallback**
- [ ] Saved dishes appear in Historial tab (Module 3 dependency)

### Current behavior:
- ✅ Gemini generates dishes with ingredients + grams + kcal per ingredient
- ✅ Total kcal calculated correctly from ingredients
- ⚠️ Macros are Gemini's estimation, not matched against real ingredient DB

### Next steps:
- Improve accuracy by matching ingredient names against `src/data/ingredients.ts` (287 items)
- Use real macros when match found, fall back to Gemini when not
- Add fuzzy matching for typos/variations

### Claude Web reviews (PENDING):
- [ ] AI suggests a novel dish
- [ ] Dish appears in Historial
- [ ] Macros look reasonable (verify against real ingredients)

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

## Module 7: Profile & Settings Polish ✅ (95% Complete)
**Goal:** Settings are clean and useful.

### Changes:
- [x] Profile editing (weight updates for recalibration)
- [x] Dietary restrictions clearly displayed
- [x] Disliked ingredients management (with categories + exceptions)
- [x] Theme toggle
- [x] Data export/import (JSON backup)
- [x] Account management (logout, user info display)
- [x] Remove any dead settings UI
- [x] "Mostrar calorías" toggle

### Claude Web reviews (PENDING):
- [ ] Changing weight recalculates budget
- [ ] Restrictions affect AI suggestions
- [ ] Export/import works

**Status:** Functionally complete. Needs final UX testing.

---

## Parking Lot (Not Planned, Maybe Later)
- Notifications/reminders for meals
- Multi-user family sharing (shared shopping list)
- Water tracking (removed but could return)
- Meal photos
- Integration with delivery apps
- PWA install prompt
- Companion/streak system

---

## CURRENT STATUS & NEXT STEPS

### ✅ Completed Modules:
- **Module 0: Cleanup** (95%) — all dead code removed
- **Module 7: Profile & Settings** (95%) — fully functional

### ⚠️ In Progress:
- **Module 1: Nutri (AI Chat)** (85%) — needs UX testing in browser
- **Module 2: Calendario** (95%) — missing global empty state banner
- **Module 5: AI Dish Invention** (60%) — Gemini generates freely, needs ingredient matching

### ❌ Not Started:
- **Module 2.5: Vector Database** (0%) — RECOMMENDED before Module 3
- **Module 3: Historial** (0%) — depends on Module 2.5 for optimal architecture
- **Module 4: Shopping Polish** (70% estimated) — basic features work
- **Module 6: Onboarding** (50% estimated) — ProfileSetup exists, needs guided flow

---

## RECOMMENDED PATH FORWARD

### Option A: Complete Current Modules (Conservative)
1. **Module 1 UX Testing** (1-2 days) — test with Claude Web, fix issues
2. **Module 2 Empty State** (2 hours) — add global banner
3. **Module 3 Historial** (2-3 days) — add frequency tracking + favorites
4. Continue with remaining modules

**Pros:** Finish what's started, less risk
**Cons:** Refactoring needed later when adding personalization

---

### Option B: Invest in Vectors Now (Strategic)
1. **Module 2.5 Vector DB Setup** (1 day) — pgvector + embeddings
2. **Module 1 UX Testing** (1-2 days)
3. **Module 2 Empty State** (2 hours)
4. **Module 3 Historial** (2-3 days) — now with embeddings from day 1
5. Continue with personalization features (already have infrastructure)

**Pros:** Future-proof architecture, personalization is trivial later
**Cons:** 1 day investment upfront

**Recommendation:** **Option B** — investing 1 day now saves 2-3 weeks of refactoring later.

---

## TECHNICAL DEBT & KNOWN ISSUES

1. **CalorieCalculator** — exists but hidden. Decision: keep or remove completely?
2. **Ingredient matching** — Gemini estimates macros, should match against real DB (287 ingredients)
3. **Empty state banner** — missing global CTA to Nutri when calendar is empty
4. **Error state testing** — offline/rate limit flows need browser testing
5. **Shopping sections** — basic but could be more intelligent (supermarket layout)

---

## METRICS TO TRACK (Post-Launch)

- Weekly active users
- Plan generation rate (% users who use "Armame la semana")
- Plan application rate (% generated plans that get applied)
- Average meal logging frequency
- Shopping list usage rate
- AI chat engagement (messages per session)
- Retention: D1, D7, D30
