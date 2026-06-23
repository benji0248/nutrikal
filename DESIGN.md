# Design System Specification: The Living Journal
 
## 1. Overview & Creative North Star
The North Star for this design system is **"The Living Journal."** 
 
We are moving away from the "clinical spreadsheet" aesthetic that plagues health apps. Instead of rigid grids and data-dense tables, we treat the UI as a tactile, premium editorial experience. This design system prioritizes human conversation over raw metrics, using **intentional asymmetry, expansive whitespace, and organic layering** to create a sense of calm and competence. 
 
By utilizing oversized typography scales and soft, nested surfaces, we transform nutrition tracking from a chore into a reflective, high-end ritual. The interface doesn't just display data; it breathes with the user.
 
---
 
## 2. Colors & Surface Philosophy
 
Our palette is rooted in nature—earthy greens, citrus oranges, and warm stone grays—designed to stimulate appetite and instill trust.
 
### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are prohibited for sectioning. Structural boundaries must be defined exclusively through background color shifts or tonal transitions.
*   **Correct:** A `surface-container-low` card sitting on a `surface` background.
*   **Incorrect:** A card with a grey outline.
 
### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. Depth is achieved by "nesting" tokens:
1.  **Base Layer:** `surface` (The foundation).
2.  **Sectioning:** `surface-container-low` (Subtle grouping).
3.  **Interactive Elements:** `surface-container` or `surface-container-highest` (Prominent cards/modals).
 
### The "Glass & Gradient" Rule
To elevate the "Premium" feel, use **Glassmorphism** for floating headers or navigation bars. Use a 20px+ `backdrop-blur` with a semi-transparent `surface` color (e.g., 80% opacity). 
*   **Signature Textures:** Apply subtle linear gradients (e.g., `primary` to `primary_container` at a 135° angle) on hero progress indicators to provide a "liquid" organic feel.
 
---
 
## 3. Typography: Editorial Authority
 
We use a high-contrast scale to emphasize lifestyle over logistics. 
 
*   **Display & Headlines (Plus Jakarta Sans):** These are our "Voice." Large, rounded, and welcoming. Use `display-lg` for daily summaries (e.g., "Good morning, looks like a light breakfast.") to create an approachable, human dialogue.
*   **Body & Labels (Be Vietnam Pro):** These provide the "Content." Clean and highly legible. 
*   **The Ratio:** Maintain a significant gap between Headline and Body sizes. This "Editorial Gap" creates a premium, magazine-like feel that guides the eye naturally through the narrative of the day.
 
---
 
## 4. Elevation & Depth: Tonal Layering
 
We reject the "Material 1.0" shadow style. In this system, light is soft and ambient.
 
*   **The Layering Principle:** Stacking `surface-container-lowest` cards on a `surface-container-low` background provides a "natural lift." This should be the default method for hierarchy.
*   **Ambient Shadows:** When an element must "float" (e.g., a Bottom Sheet), use a shadow tinted with the `on-surface` color.
    *   *Spec:* `0px 20px 40px rgba(25, 28, 23, 0.06)`. 
    *   This mimics natural light hitting a matte surface rather than a digital drop shadow.
*   **The "Ghost Border" Fallback:** If a boundary is strictly required for accessibility, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
 
---
 
## 5. Components & Interaction
 
### Buttons: The "Soft-Touch" CTA
*   **Primary:** High-radius (`xl` - 3rem), using `primary` with `on_primary` text. No borders.
*   **Secondary:** `secondary_container` background. These should feel like "pills" of color.
*   **Motion:** On press, the button should scale slightly (98%) rather than just changing color, mimicking the tactile feedback of a physical button.
 
### Cards: The "Plate" Concept
*   **Design:** Use the `lg` (2rem) roundedness scale. 
*   **Content:** Forbid divider lines. Separate "Meal Name" from "Portion" using `title-md` and `body-sm` with a vertical 8px gap. 
*   **Backgrounds:** Use `surface-container-low` for secondary items and `surface-container-highest` for the current or "featured" meal.
 
### Inputs: Natural Language Fields
*   Instead of boxed inputs, use a "Sentence Style" input where the user types into a large `headline-sm` field that looks like a blank line in a journal.
*   **State:** Use `primary` for the cursor/accent and `error` for validation, but keep the "Ghost Border" logic for the container.
 
### Visual Progress: "The Glow"
*   Avoid "loading bars." Use organic, thick-stroke rings with `rounded` caps. 
*   Use `tertiary` (soft orange) for "Energy" and `primary` (green) for "Vitals."
 
---
 
## 6. Do’s and Don’ts
 
### Do:
*   **Do** use asymmetrical layouts for hero sections (e.g., text left-aligned, organic image or chart overlapping the right-edge).
*   **Do** use human-centric units. Instead of "450kcal," use "Hearty Portion" as the primary label, with the raw number as a small `label-md` subtitle.
*   **Do** leverage Dark Mode (`inverse_surface`) as a "Night Journal" mode, ensuring gradients shift from deep greens to soft muted forest tones.
 
### Don’t:
*   **Don’t** use pure black (#000) or pure white (#FFF). Always use the warm-gray neutrals (`surface` / `on_surface`) to maintain the "organic" feel.
*   **Don’t** use 90-degree corners. Everything in nature has a radius; everything in this design system does too.
*   **Don’t** use "Clinical Icons." Avoid sharp, thin-line iconography. Use "Duotone" or "Rounded Fill" icons that feel friendly and tactile.
 
---
 
## 7. Token Reference Summary
 
| Token Role | Light Mode Value | Purpose |
| :--- | :--- | :--- |
| **Foundation** | `surface` (#f8faf1) | The canvas of the app. |
| **Grouping** | `surface_container_low` (#f3f5eb) | Background for sections/large modules. |
| **Prominence** | `primary` (#226046) | Deep forest green for authority and growth. |
| **Accent** | `secondary` (#895100) | Soft orange for appetite and energy. |
| **Contrast** | `on_surface` (#191c17) | Warm charcoal for high-end legibility. |
| **Radius** | `lg` (2rem) | The standard for all cards and containers. |