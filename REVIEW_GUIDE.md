# NutriKal — Review Guide for Claude Web

## Your Role

You are reviewing NutriKal as if you were a user, a nutritionist, a UX designer, and a psychologist — all at once. Your job is to identify what feels wrong, what's confusing, what's missing, and what could be better in the user experience.

We work module by module. Right now you're reviewing **Module 1: Nutri (the AI chat)**. But first, test the full "from zero" experience to understand the onboarding problems.

---

## How to Test

### The App
- URL: https://nutrikal.vercel.app (or wherever deployed)
- You can create an account or use an existing one
- In Settings, there's a "Resetear perfil" button to go back to the "no profile" state

### Test Order

#### Phase 1: The "From Zero" Experience
1. Open the app (logged out or new account)
2. Notice: what's the first thing you see? Is it clear what to do?
3. After logging in: where do you land? Is it useful?
4. Try to figure out how to set up your profile without anyone telling you
5. **The problem:** Right now, new users land on an empty calendar with no guidance. They have to discover on their own that they should go to "Nutri" → create a profile → then plan meals. This path is invisible.

#### Phase 2: The Chat (Nutri Tab)
1. Open the Nutri tab
2. If no profile: you see "Creá tu perfil para empezar" — good, but you had to navigate here yourself
3. Create profile (4 steps: data, activity, goal, preferences)
4. After profile: the chat says "¡Hola! Soy tu nutricionista. ¿Qué necesitás?" — **with no quick replies**
5. Now test the flows:
   - Type "Armame la semana" → does it ask questions first?
   - Type "¿Qué como hoy?" → does it give contextual suggestions?
   - Type "Tengo ansiedad" → is the response supportive?
   - Does the week planner render correctly?
   - Can you apply a plan and see it in the calendar?

---

## Known Problems (We Already Know These)

### P1: The path for new users is invisible
- **What happens:** Login → empty calendar → no idea what to do
- **What should happen:** Login → guided to create profile → AI offers to plan first week → calendar gets filled
- **Why it matters:** If users don't know the first step, they won't discover the value

### P2: Welcome message has no quick replies
- **What happens:** After creating profile, the chat says hello but offers no buttons
- **What should happen:** Welcome should have 2-3 useful quick replies like "Armame la semana" or "¿Qué como hoy?"
- **Why it matters:** Users shouldn't have to think about what to type

### P3: Quick replies are sometimes generic
- **What happens:** AI occasionally returns same replies regardless of context
- **What should happen:** Replies should always be direct answers to the AI's question
- **Why it matters:** Generic replies defeat the purpose of zero-effort interaction

### P4: No visual confirmation for added meals
- **What happens:** AI adds a meal, says "Listo, te agregué X" as text
- **What should happen:** Visual confirmation — green badge, checkmark animation
- **Why it matters:** Users need to FEEL that something happened, not just read it

### P5: Chat resets on page reload
- **What happens:** Refresh the page, chat starts over
- **What should happen:** At minimum, the last session context should persist
- **Why it matters:** Losing context is frustrating

### P6: Dish suggestions aren't tappable
- **What happens:** AI suggests dishes as text cards, user has to type to accept
- **What should happen:** Tap a suggestion → "Dale, ese" → meal added
- **Why it matters:** Every extra step reduces the chance users will use the feature

### P7: No undo after applying a plan
- **What happens:** Apply plan → it's permanent
- **What should happen:** "Deshacer" option for a few seconds, or confirmation before applying
- **Why it matters:** Irreversible actions create anxiety

---

## What We Want You to Tell Us

For each thing you test, tell us:

1. **What you see** — describe the current state factually
2. **What feels wrong** — from a UX/psychology perspective, what's off?
3. **What should happen instead** — your recommendation
4. **Priority** — is this critical (blocks the core flow), important (hurts UX), or nice-to-have?

### Specific Questions We Want Answered

- Is the chat flow natural? Does it feel like talking to a nutritionist?
- Are the AI responses too long, too short, or just right?
- Is the week planner review useful? Can you understand the plan at a glance?
- After applying a plan, is the transition to the calendar smooth?
- Does the chat feel safe? Would someone with food anxiety feel comfortable?
- Is there anything that feels broken, confusing, or unnecessarily complex?
- What's the SINGLE most impactful change you'd make to this module?

---

## What NOT to Review (Yet)

These are future modules — don't spend time on them now:
- Calendar layout/design (Module 2)
- Shopping list functionality (Module 4)
- Dish invention by AI (Module 5)
- Onboarding flow design (Module 6) — but DO note onboarding problems you encounter
- Settings design (Module 7)

Focus on: **the chat experience, from opening it to having a full week planned.**

---

## Tech Context (If Needed)

- AI: Gemini 3.1 Flash Lite (fast, cheap, sometimes ignores complex instructions)
- Rate limit: 80 messages/day per user
- Dish catalog: ~80 Argentine dishes, ~270 ingredients
- No persistent chat history (resets on reload)
- Mobile-first: designed for 375px width
- Dark/light theme
