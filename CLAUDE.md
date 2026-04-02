# NutriKal — CLAUDE.md
# Context file for AI coding sessions. Single source of truth for this project.

## What is NutriKal

Personal nutrition assistant for families and small groups (10-20 people).
Deployed on **Vercel**. Backend: Vercel serverless functions + Supabase (Postgres) + Gemini AI.
Auth: custom JWT. Sync: Supabase JSONB column (`user_data` table).

**One sentence:** "Abrís la app, ya sabés qué comer."

**Core philosophy:** The app manages nutritional complexity silently.
Users never see calorie numbers. They see colors, suggestions, and human-language portions.
Zero effort. Zero anxiety. AI does the heavy lifting, UI stays simple.

---

## Product Vision

### The 5 Tabs
1. **Calendario** — opens to today, 4 meal slots per day, energy bar (color only, no numbers)
2. **Nutri (AI Chat)** — conversational nutritionist powered by Gemini; primary use: "Armame la semana"
3. **Historial** — everything eaten, ordered by frequency; favorites; semantic search
4. **Compras** — auto-generated shopping list from planned meals, by supermarket section
5. **Ajustes** — profile, dietary restrictions, theme, export/import

### AI Personality
- Warm, concise, Argentine Spanish (vos, dale, bárbaro)
- Never judges. Practical. Short answers, no lectures.
- Dialogue-first: asks 2-3 questions before generating any plan
- Never mentions calories — forbidden words: dieta, restricción, prohibido, malo, culpa

### Metabolic System (Hidden — Never Expose to UI)
```
TMB (Mifflin-St Jeor):
  Male:   (10 × kg) + (6.25 × cm) - (5 × age) + 5
  Female: (10 × kg) + (6.25 × cm) - (5 × age) - 161

TDEE = TMB × activityFactor
dailyBudget = max(1200, TDEE + goalAdjustment)
```

### DayEnergyBar Color States
```
consumed / budget < 0.70  → green       "Vas bien hoy"
consumed / budget < 0.90  → amber       "Casi completaste el día"
consumed / budget ≥ 0.90  → warm_orange "Hoy comiste un poco más..."
```
Three states only. Never red.

---

## Stack

- React 19 + TypeScript (strict)
- Vite 8 (bundler)
- Tailwind CSS 3 (styling — no inline styles, except dynamic width% for progress bars)
- Zustand 5 (state — with persist middleware)
- date-fns 4 (all date operations — never use native Date arithmetic directly)
- lucide-react (icons)
- clsx + tailwind-merge (className composition)
- @google/generative-ai (Gemini AI — ONLY in `api/_lib/gemini.ts` and `api/_lib/embeddings.ts`)
- pgvector (Supabase extension — dish embeddings for semantic search)
- Fonts: @fontsource/syne, @fontsource/plus-jakarta-sans, @fontsource/jetbrains-mono, @fontsource/inter

---

## Commands

```bash
npm run dev          # local dev server (Vite)
npm run build        # tsc -b && vite build → dist/
npm run lint         # ESLint check
npm run preview      # preview production build locally
npx tsc --noEmit     # type check without building (run before every commit)
```

---

## Project Structure

```
nutrikal/
├── CLAUDE.md                     ← you are here (single source of truth)
├── api/                          ← Vercel serverless functions
│   ├── _lib/
│   │   ├── supabase.ts           Supabase client singleton (uses SUPABASE_SERVICE_ROLE_KEY)
│   │   ├── jwt.ts                JWT sign/verify helpers
│   │   ├── gemini.ts             Gemini AI client + system prompt
│   │   ├── embeddings.ts         Gemini text-embedding-004 helper (768-dim)
│   │   └── rateLimit.ts          AI rate limiting (80 msgs/day per user, uses ai_usage table)
│   ├── auth/
│   │   ├── login.ts              POST — email/password login → JWT
│   │   └── register.ts           POST — create account
│   ├── ai/
│   │   ├── chat.ts               POST — AI chat endpoint (Gemini)
│   │   ├── embed.ts              POST — store dish embeddings async (fire-and-forget)
│   │   └── search.ts             POST — semantic dish search via pgvector RPC
│   └── data/
│       ├── load.ts               GET — load user data from Supabase
│       └── save.ts               PUT — save user data to Supabase
├── src/
│   ├── components/
│   │   ├── assistant/            ChatAssistant, ChatHeader, ChatMessageBubble,
│   │   │                         OptionChips, DishCard, DishSearch,
│   │   │                         DayEnergyBar, useChatEngine (hook)
│   │   ├── auth/                 LoginScreen, RegisterScreen, LoadingScreen, UserMenu
│   │   ├── calendar/             WeekView, MonthView, DayCard, DayView
│   │   ├── layout/               BottomNav, Sidebar
│   │   ├── meals/                MealSlot, MealForm, RecipeBank
│   │   ├── planner/              WeekPlanner, PlanReviewGrid, PlanMealCell, PlanAppliedView
│   │   ├── profile/              ProfileSetup, ActivityLevel, DietaryPrefs, ProfileRecalibrate
│   │   ├── shopping/             ShoppingList, ShoppingItem, ShoppingExport
│   │   └── ui/                   Button, Input, Badge, Modal, BottomSheet,
│   │                             SyncIndicator, ThemeToggle
│   ├── data/
│   │   ├── ingredients.ts        ~287 Argentine ingredients, per 100g macros
│   │   ├── dishes.ts             ~80 Argentine dishes with ingredients + instructions
│   │   └── ingredientPortions.ts human-readable portion lookup table
│   ├── hooks/
│   │   ├── useLocalStorage.ts    generic key-value with JSON parse safety
│   │   ├── useSwipe.ts           touch swipe detection, returns ref
│   │   └── useTheme.ts           system pref + localStorage persist
│   ├── services/
│   │   ├── apiService.ts         Auth + data load/save API calls
│   │   ├── aiService.ts          AI chat: buildContext, sendMessage, compressCatalog
│   │   ├── embeddingService.ts   Fire-and-forget dish embedding submission
│   │   ├── gistService.ts        LEGACY — migratePayload still used for data migration
│   │   ├── metabolicService.ts   TMB, TDEE, budget — pure functions
│   │   ├── dishMatchService.ts   fuzzy search + macro computation
│   │   └── shoppingService.ts    list generation + unit consolidation
│   ├── store/
│   │   ├── useAuthStore.ts       AppUser, AuthState, login/logout/restore
│   │   ├── useGistSyncStore.ts   sync lifecycle, push/pull/hydrate (no persist)
│   │   ├── useCalendarStore.ts   DayPlan CRUD, meals, notifications
│   │   ├── useCalculatorStore.ts entries, saved recipes
│   │   ├── useIngredientsStore.ts custom ingredients CRUD
│   │   ├── useProfileStore.ts    metabolic profile, TMB/TDEE (never shown)
│   │   ├── useRecipesStore.ts    custom dishes CRUD
│   │   ├── useShoppingStore.ts   shopping list management
│   │   └── useSettingsStore.ts   showCalories toggle, theme
│   ├── types/
│   │   └── index.ts              SINGLE source of truth — all types live here
│   └── utils/
│       ├── dateHelpers.ts        date-fns wrappers (getWeekDays, formatDateKey, etc.)
│       ├── portionHelpers.ts     gramsToHumanPortion, getDishHumanIngredients
│       └── macroHelpers.ts       computeMacros, formatMacro, percentages
├── vite.config.ts
└── tailwind.config.js            custom colors, fonts, animations
```

---

## Supabase — Tables & Security

### Tables
| Table | Purpose |
|---|---|
| `users` | Accounts: username, email, password_hash, display_name |
| `user_data` | JSON blob with all app data per user (calendar, profile, etc.) |
| `dish_embeddings` | pgvector table: 768-dim embeddings per dish per user |
| `ai_usage` | Rate limiting: requests per user per day |
| `app_config` | System config: max_users, etc. |

### Security
- All tables have RLS enabled (applied 2026-04-01)
- All access goes through the backend using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS by design)
- The anon key is NOT used anywhere — the frontend never calls Supabase directly

### Vector DB (pgvector)
The `dish_embeddings` table + `find_similar_dishes()` RPC power the semantic search:
- Every AI-generated dish is embedded asynchronously after being applied (fire-and-forget)
- Embedding model: `text-embedding-004` (768 dimensions)
- Index: HNSW with cosine similarity
- Dedup: exact dish name match per user before inserting
- `POST /api/ai/embed` — stores embeddings
- `POST /api/ai/search` — semantic search (ready, not yet wired to UI)

---

## Current Module Status

```
Module 0: Cleanup          ✅ 95%  — dead code removed
Module 2.5: Vector DB      ✅ 100% — pipeline live, SQL migration must run in Supabase
Module 7: Profile          ✅ 95%  — functional, needs final UX testing

Module 1: Nutri/Chat       ⚠️ 85%  — needs UX testing in browser
Module 2: Calendario       ⚠️ 95%  — missing global empty-state banner
Module 5: AI Dish Invent   ⚠️ 60%  — Gemini generates freely, needs ingredient matching

Module 3: Historial        ❌ 0%   ← NEXT (vector DB ready from day 1)
Module 4: Shopping Polish  ❌ ~0%
Module 6: Onboarding       ❌ ~0%
```

### Immediate next steps (in order):
1. Run SQL migration for `dish_embeddings` table in Supabase SQL Editor
2. Module 3: Historial — frequency tracking + favorites + semantic search
3. UX testing Module 1 (Nutri chat) in browser
4. Module 2: Global empty-state banner (2h task)
5. AI Personalization: inject dish history into Gemini context

---

## Vector DB Strategy — How to Use It

The vector DB gives **memory** to Gemini. Today Gemini generates meals from scratch every time.
With embeddings we inject personalized context so Gemini knows what the user actually likes.

### Phase 1 — Already Built
- Every AI-suggested dish gets embedded when applied to calendar
- `/api/ai/search` endpoint is ready for semantic search queries

### Phase 2 — Module 3 (Historial)
- Show dishes ordered by frequency (most eaten first)
- Wire `/api/ai/search` to the search bar in Historial
- "algo con verduras" → finds all vegetable dishes semantically

### Phase 3 — AI Personalization (after Historial has data)
Before calling Gemini for "Armame la semana":
1. Fetch last 20-30 dishes from `dish_embeddings` for this user
2. Group by frequency, inject into system prompt:
   ```
   HISTORIAL DE {NOMBRE}: Pollo al horno (8x), Milanesas (6x), Tarta de espinaca (3x)
   Preferencias detectadas: platos con pollo, cocina seguido, comidas rápidas.
   ```
3. Add variety detection: if a dish repeated >3x in 2 weeks → tell Gemini to suggest alternatives
4. Smart swaps: when user says "cambiame el almuerzo" → search similar dishes in their history

---

## Non-Negotiable Rules

### Code rules
1. **No `any`** — strict TypeScript always. No non-null assertions without a guard.
2. **No inline styles** — Tailwind classes only. Exception: dynamic `width: '…%'` for progress bars.
3. **No raw Date arithmetic** — always use date-fns (addDays, subDays, format, etc.)
4. **Named exports only** — every component: `export const Foo = ...` + props interface above it.
5. **All types in `src/types/index.ts`** — never define types inside component files.
6. **schedulePush debounced** — never call `push()` directly. Always `useGistSyncStore.getState().schedulePush()`. Debounce is 1500ms.
7. **Mobile-first** — write mobile styles first, add `md:` and `lg:` prefixes for desktop.
8. **No horizontal scroll** — ever, at any viewport width.
9. **48px minimum touch targets** — all interactive elements, no exceptions.
10. **API isolation** — Gemini only in `api/_lib/gemini.ts`. Supabase only in `api/_lib/supabase.ts`.

### Product rules (equally non-negotiable)
11. **Calories never shown to user** — no kcal numbers in any label, tooltip, message, or UI.
12. **No red in nutritional feedback** — the app never scolds. Use amber → warm orange.
13. **No blocking modals** — warnings are toasts, never modals. Always include "Dejalo así" option.
14. **Human portions only** — "2 papas medianas", never "300g de papa".
15. **No "diet" language** — never: dieta, restricción, prohibido, malo, culpa.
16. **Forward-only framing** — never reference past failures in any message copy.

---

## Design System

### Colors (CSS variables, set on `document.documentElement`)
```css
/* Applied via data-theme="dark" | "light" on <html> */
--bg:           #0c0c11  /  #f6f5f2
--surface:      #14141c  /  #ffffff
--surface2:     #1c1c28  /  #eeedf8
--border:       #252535  /  #dddcef
--text-primary: #f0f0f8  /  #1a1a2e
--text-muted:   #606080  /  #8080a8

/* Same in both themes */
--accent:  #7c6aff   /* electric violet — primary actions, active states */
--pink:    #ff6b9d   /* alerts, notifications */
--green:   #34d399   /* success, goals met */
--amber:   #fbbf24   /* warnings, snack slot, offline state */
```

### Tailwind class conventions
```
Background:      bg-[var(--bg)], bg-[var(--surface)], bg-[var(--surface2)]
Text:            text-[var(--text-primary)], text-[var(--text-muted)]
Border:          border-[var(--border)]
Accent:          text-[var(--accent)], bg-[var(--accent)], border-[var(--accent)]
Border radius:   rounded-2xl (cards), rounded-3xl (sheets), rounded-full (pills)
Padding mobile:  px-4 py-3 (standard), px-6 (generous)
```

### Typography
```
font-sans  = Syne              → headings, nav labels, badges, UI labels
font-body  = Plus Jakarta Sans → body text, descriptions, meal names, instructions
font-mono  = JetBrains Mono   → numbers in calculator ONLY (never elsewhere)
```

### Animation classes (defined in tailwind.config.js)
```
animate-slide-up   → BottomSheet entrance (280ms cubic-bezier(0.32,0.72,0,1))
animate-fade-in    → overlays, modals, messages (180ms ease-out)
animate-scale-tap  → button press feedback (120ms)
animate-shimmer    → loading skeleton (1500ms infinite)
```

---

## Component Patterns

### Standard component shape
```typescript
interface FooProps {
  // props here
}

export const Foo = ({ prop1, prop2 }: FooProps) => {
  return (...)
}
```

### Mobile vs Desktop UI
- Modals → only render on `md:` and above. Use `hidden md:block` wrapper.
- BottomSheets → only render below `md:`. Use `md:hidden` wrapper.

### Store mutation pattern
Every action that mutates user data must end with:
```typescript
useGistSyncStore.getState().schedulePush()
```
Exception: read-only selectors and navigation actions (setView, navigateWeek, etc.)

---

## Key Data Flows

### Write path (any user action)
```
Component calls store action
  → store updates Zustand state (synchronous)
  → Zustand persist writes to localStorage (automatic)
  → store calls schedulePush()
  → debounce 1500ms
  → useGistSyncStore.push() serializes all stores → PUT /api/data/save
```

### Read path (app mount)
```
App.tsx useEffect
  → useAuthStore.restoreSession()
    → reads localStorage('nutrikal-jwt')
    → if token: validate → GET /api/data/load
      → hydrateAllStores(payload)
```

### Embedding flow (fire-and-forget)
```
AI generates dish → user applies to calendar
  └─ embeddingService.ts → POST /api/ai/embed (async, non-blocking)
      ├─ Dedup check: skip if dish_name already exists for this user
      ├─ Generate embedding via text-embedding-004
      └─ INSERT into dish_embeddings
```

---

## Common Mistakes to Avoid

| Mistake | Correct approach |
|---|---|
| `style={{ color: '#7c6aff' }}` | `className="text-[var(--accent)]"` |
| `new Date() + 86400000` | `addDays(new Date(), 1)` from date-fns |
| Showing `meal.calories` to user | Only use internally for budget calculation |
| `push()` called directly | `schedulePush()` always |
| Type defined inside component file | Add to `src/types/index.ts` |
| `border-red-500` for nutrition warning | `border-amber-400` or warm orange |
| Modal on mobile | BottomSheet on mobile, Modal on desktop |
| `any` type | Proper type or `unknown` with guard |
| localStorage key without prefix | Always `'nutrikal-'` prefix |
| Changes across multiple modules | One module at a time |
| Calling Gemini from frontend | Only via `api/_lib/gemini.ts` |
| Calling Supabase from frontend | Only via backend API endpoints |

---

## Working Method

- **Module-by-module.** Complete one fully before starting the next.
- "Complete" = code written, types clean, build passes, pushed, tested in browser.
- Never make changes across multiple modules simultaneously.

---

## Before Every Commit

- [ ] `npx tsc --noEmit` → zero errors
- [ ] `npm run build` → success
- [ ] No horizontal scroll at 375px
- [ ] All touch targets >= 48px
- [ ] No calorie numbers visible in UI
- [ ] No inline styles
- [ ] All changed files staged (`git status`)
- [ ] Push after commit (Vercel auto-deploys from master)
