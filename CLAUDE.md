# NutriKal — CLAUDE.md
# Context file for Claude Code terminal sessions.
# This file is read automatically at the start of every session.

## What is NutriKal
Personal nutrition assistant for families and small groups (10-20 people).
Deployed on **Vercel**. Backend: Vercel serverless functions + Supabase (Postgres) + Gemini AI.
Auth: custom JWT. Sync: Supabase JSONB column.

Core philosophy: the app manages nutritional complexity silently.
Users never see calorie numbers. They see colors, suggestions, and human-language portions.

**Read PRODUCT.md** for full product vision, business rules, and UX principles.
**Read ROADMAP.md** for the module-by-module implementation plan.

---

## Stack
- React 19 + TypeScript (strict)
- Vite 8 (bundler)
- Tailwind CSS 3 (styling — no inline styles, except dynamic width% for progress bars)
- Zustand 5 (state — with persist middleware)
- date-fns 4 (all date operations — never use native Date arithmetic directly)
- lucide-react (icons)
- clsx + tailwind-merge (className composition)
- @google/generative-ai (Gemini AI — ONLY imported in api/_lib/gemini.ts and api/_lib/embeddings.ts)
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
~/Proyectos/nutrikal/
├── CLAUDE.md                     ← you are here
├── PRODUCT.md                    ← product vision, business rules, UX principles
├── ROADMAP.md                    ← module-by-module implementation plan
├── api/                          ← Vercel serverless functions
│   ├── _lib/
│   │   ├── supabase.ts           Supabase client singleton
│   │   ├── jwt.ts                JWT sign/verify helpers
│   │   ├── gemini.ts             Gemini AI client + system prompt
│   │   ├── embeddings.ts         Gemini text-embedding-004 helper
│   │   └── rateLimit.ts          AI rate limiting (80 msgs/day per user)
│   ├── auth/
│   │   ├── login.ts              POST — email/password login → JWT
│   │   └── register.ts           POST — create account
│   ├── ai/
│   │   ├── chat.ts               POST — AI chat endpoint (Gemini)
│   │   ├── embed.ts              POST — store dish embeddings (async)
│   │   └── search.ts             POST — semantic dish search (pgvector)
│   └── data/
│       ├── load.ts               GET — load user data from Supabase
│       └── save.ts               POST — save user data to Supabase
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
│   │   ├── profile/              ProfileSetup, ActivityLevel,
│   │   │                         DietaryPrefs, ProfileRecalibrate
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

## Non-Negotiable Rules

### Code rules
1. **No `any`** — strict TypeScript always. No non-null assertions without a guard.
2. **No inline styles** — Tailwind classes only. No `style={{}}` props.
   Exception: dynamic `style={{ width: '…%' }}` for progress bars is acceptable.
3. **No raw Date arithmetic** — always use date-fns (addDays, subDays, format, etc.)
4. **Named exports only** — every component: `export const Foo = ...` + props interface above it.
5. **All types in `src/types/index.ts`** — never define types inside component files.
6. **schedulePush debounced** — never call `push()` directly from stores.
   Always `useGistSyncStore.getState().schedulePush()`. Debounce is 1500ms.
7. **Mobile-first** — write mobile styles first, add `md:` and `lg:` prefixes for desktop.
8. **No horizontal scroll** — ever, at any viewport width.
9. **48px minimum touch targets** — all interactive elements, no exceptions.
10. **API isolation** — Gemini only in `api/_lib/gemini.ts`. Supabase only in `api/_lib/supabase.ts`.

### Product rules (equally non-negotiable)
11. **Calories never shown to user** — no kcal numbers in any label, tooltip, message, or UI.
12. **No red in nutritional feedback** — the app never scolds. Use amber → warm orange.
13. **No blocking** — warnings are toasts, never modals. Always include "Dejalo así" option.
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
font-sans  = Syne            → headings, nav labels, badges, UI labels
font-body  = Plus Jakarta Sans → body text, descriptions, meal names, instructions
font-mono  = JetBrains Mono  → numbers in calculator ONLY (never elsewhere)
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

### Mobile vs Desktop UI pattern
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
  → useGistSyncStore.push() serializes all stores → POST /api/data/save
```

### Read path (app mount)
```
App.tsx useEffect
  → useAuthStore.restoreSession()
    → reads localStorage('nutrikal-jwt')
    → if token: validate → GET /api/data/load
      → hydrateAllStores(payload)
```

---

## Metabolic System — Never Expose to UI

```
TMB (Mifflin-St Jeor):
  Male:   (10 × kg) + (6.25 × cm) - (5 × age) + 5
  Female: (10 × kg) + (6.25 × cm) - (5 × age) - 161

TDEE = TMB × activityFactor
dailyBudget = max(1200, TDEE + goalAdjustment)
```

**None of these numbers ever appear in the UI.**

---

## DayEnergyBar Color States

```
consumed / budget < 0.70  → green        "Vas bien hoy"
consumed / budget < 0.90  → amber        "Casi completaste el día"
consumed / budget ≥ 0.90  → warm_orange  "Hoy comiste un poco más..."
```

Three states only. Never red.

---

## Working Method

**Module-by-module.** See ROADMAP.md for the current plan.
- Complete one module fully before starting the next
- "Complete" = code written, types clean, build passes, pushed, tested
- Never make changes across multiple modules simultaneously
- When starting work: check ROADMAP.md for the current module

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
| Changes across multiple modules | One module at a time (see ROADMAP.md) |

---

## Before Every Commit

- [ ] `npx tsc --noEmit` → zero errors
- [ ] `npm run build` → success
- [ ] No horizontal scroll at 375px
- [ ] All touch targets >= 48px
- [ ] No calorie numbers visible in UI
- [ ] No inline styles
- [ ] All changed files are staged (check `git status`)
- [ ] Push after commit (Vercel auto-deploys from master)
