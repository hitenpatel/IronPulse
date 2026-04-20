# Handoff: IronPulse Mobile Redesign

## Overview
IronPulse is a strength + conditioning tracker for Android. This handoff covers a full v4 redesign of the mobile app: **13 screens spanning the whole user loop** — from onboarding through daily workout execution, tracking, nutrition/sleep, and program management.

The direction is **"acid sport"** — ink surfaces, electric-lime primary, cobalt accents, warm white (not pure white) type. It is visually distinct from Strava, Nike, Whoop, and similar fitness apps; do not pull cues from them during implementation.

## About the Design Files
The files in `reference/` are **design references created in HTML+React+Babel**. They are a static prototype meant to show intended look, behavior, hierarchy, and motion cues. They are **not production code to copy** — React is loaded via a Babel script tag in the browser, there is no build pipeline, and all "screens" are rendered side-by-side inside a scaled gallery for review.

Your task is to **recreate these designs inside the target codebase's existing environment** (React Native, Jetpack Compose, Flutter — whatever the IronPulse mobile app actually uses) using its established patterns, component library, navigation, and state management. If no mobile environment exists yet, pick the most appropriate framework for the product and scaffold there.

The HTML reference is most useful as:
- A visual spec (pixel positions, color, type, spacing)
- A behavioral spec (what each screen does, how rows/cards are structured)
- A source for exact token values (see Design Tokens section below)

## Fidelity
**High-fidelity.** Final colors, typography scale, spacing, iconography style, and interaction states are all finalized. Implementers should recreate pixel-perfectly, substituting icons from the codebase's icon library where it has equivalents (the reference uses inline SVGs).

## Screens / Views

The 13 screens split into three groups:

### Onboarding & daily loop (screens-primary.jsx)
1. **Login** — email/password + Google/Apple. Full-bleed logo, primary lime CTA.
2. **Dashboard (Home)** — "Morning, Alex" greeting, next-up workout card (large), streak card, 3 stat tiles (Sessions / Volume / Time), recent activity list, lime FAB in tab bar.
3. **Active Workout** — timer hero (`22:54`), rest timer card, current exercise (Bench Press) with set-by-set logging table, next-up superset preview. "A1 · ACTIVE" label on the active exercise.

### Tracking & history (screens-secondary.jsx + screens-tertiary.jsx)
4. **Stats** — Back Squat 1RM trend (hero), training status (ATL/CTL/TSB), weekly volume bars, muscle-group distribution, records list with sparklines.
5. **Exercises Library** — search + filter pills (All/Chest/Back/Legs/Shoulders), recent with 1RM + ring progress, alphabetical all list.
6. **Profile** — avatar + name + level/streak chips, 3 career stats (Workouts/PRs/Hours), Training/Recovery/Social row groups.
7. **Nutrition** — circular calorie ring (2,340 / 2,600), macro bars (Protein/Carbs/Fat), meal list, Scan barcode CTA.
8. **Sleep** — last-night hero (7:42), hypnogram, resting HR + HRV cards, 7-day sleep bars.
9. **Goals** — active goal with progress ring (84%), sub-goals, suggested goals.
10. **Progress Photos** — current vs. 8-weeks-ago silhouette comparison, body-stat deltas, 14-photo timeline grid.
11. **Connected Apps** — connected device (Apple Watch), active integrations with toggles, available connections.
12. **Templates** — quick-start workout templates (Push A Heavy / Pull A Heavy / Legs Volume), archive.
13. **My Program** — program hero (PPL Hypertrophy, Week 3 of 8, 38% done), deload indicator bars, weekly schedule timeline, weekly-goal and projected-volume cards.

Each screen is a tall vertical mobile layout, rendered at two widths (Pixel 7 @ 360×780, Pixel 7 Pro @ 412×892).

For exact structure, typography size, spacing, and content — open `reference/IronPulse Redesign.html` in a browser and inspect the corresponding JSX file.

## Interactions & Behavior
Most interactions are implicit in the static mocks; implementers should infer these:

- **Tab bar FAB** — tapping the center lime `+` opens a Quick-add sheet (start workout / log food / log weight).
- **Filter pills** — tap to activate. Active pill is lime bg with `--blue-ink` text. Inactive pills are transparent-ish with a 1px `--line` border.
- **Active workout set rows** — tap the checkmark column to mark a set complete; the "A1 · ACTIVE" label follows the current exercise.
- **Rest timer** — counts down from the configured rest. `+30s` and `Skip` buttons.
- **Program week** — tapping a day opens that day's workout; "Today" has a Start CTA.
- **Connected apps toggles** — standard iOS/Android toggles; lime when on.
- **Sleep hypnogram** — horizontal bar showing sleep stages across the night.
- **Progress photos** — tap any thumbnail to enlarge; today's photo has a lime dot indicator.

### Motion cues
- Primary CTAs: scale(0.97) on press, 120ms cubic-bezier(0.2, 0.8, 0.2, 1).
- Cards and rows: no hover on mobile; use a subtle bg-2 press state (opacity 0.7 of `--bg-2` for 80ms).
- FAB: lime glow should pulse subtly when a workout is in progress (use `--blue-glow` shadow at 0.45 alpha).
- Rest timer: ring drains counterclockwise, smoothly.

### Loading / empty / error
Not explicitly mocked. Suggested patterns:
- Skeleton rows: `--bg-2` with 20% shimmer over `--bg-3`.
- Empty state: centered icon (muted `--text-3`) + single line of copy + outline CTA.
- Error toast: `--red` left border, `--bg-1` bg, 14px radius.

## State Management
Not prescriptive — use whatever the codebase already does. Data shapes the screens need:
- `user`: name, avatar, level, streakDays
- `workoutSession`: active?, startTime, elapsedMs, exerciseList[], currentExerciseIdx, currentSetIdx, restCountdownMs
- `program`: name, week, totalWeeks, phase (e.g. "hypertrophy"), days[]
- `exercises`: catalog with name, category, muscleGroups[], recent1RM
- `records`: list of lifts with history[] for sparklines
- `nutrition`: today's targets + consumed macros + meal list
- `sleep`: last-night summary + 7-day series + HR/HRV

## Design Tokens

### Colors (from `reference/mobile.css`)
```
/* Surfaces (cool near-black with blue undertone) */
--bg:         #0B0D12  /* outermost */
--bg-1:       #13161E  /* cards */
--bg-2:       #1B1F29  /* input fields, inactive pills */
--bg-3:       #252A38  /* chip.mono background */
--bg-4:       #323848
--line:       #252A38  /* default border */
--line-2:     #323848
--line-soft:  #181B24  /* card borders */

/* Type (warm off-white — NEVER pure white) */
--text:       #F4F0E6  /* primary */
--text-2:     #D4D1C6  /* secondary, on-card body */
--text-3:     #A6A49C  /* meta, captions */
--text-4:     #8F8D86  /* decorative labels only, min 10px */

/* PRIMARY — electric lime (mapped to --blue slot in code) */
--blue:       #D4FF3A  /* CTAs, FAB, active pills */
--blue-2:     #C4EF2A  /* on-dark text in lime family */
--blue-soft:  rgba(212,255,58,.16)
--blue-glow:  rgba(212,255,58,.45)
--blue-ink:   #0F1508  /* text ON lime — always use this, never pure black */

/* SECONDARY — cobalt (mapped to --green slot) */
--green:      #3A6DFF  /* positive data, HRV, progress arcs */
--green-soft: rgba(58,109,255,.16)

/* TERTIARY — warm white highlight */
--purple:     #F4F0E6
--purple-soft: rgba(244,240,230,.10)

/* Accents */
--amber:      #FFB800  /* PRs, records, goals */
--amber-soft: rgba(255,184,0,.14)
--red:        #FF3D5A  /* alerts, sleep "awake" */
--orange:     #FF7A3C
--cyan:       #4FD1E8
--cyan-soft:  rgba(79,209,232,.14)
```

**Background ambient light** (body `background`):
```
radial-gradient(1100px 700px at 12% -5%,  rgba(58,109,255,0.14), transparent 60%),
radial-gradient(800px 600px at 92% 40%,  rgba(212,255,58,0.06), transparent 60%),
radial-gradient(700px 500px at 50% 110%, rgba(79,209,232,0.05), transparent 60%),
#06080D;
```

### Typography
```
--ff-display: 'Space Grotesk'    /* headlines, bignum, numeric hero */
--ff-body:    'Instrument Sans'  /* body, UI labels */
--ff-mono:    'JetBrains Mono'   /* timers, set counts, weight values */
```
Load from Google Fonts with weights: Space Grotesk 400/500/600/700, Instrument Sans 400/500/600/700, JetBrains Mono 500/600/700.

**Type scale**
- Display hero (weight number, timer): 28–36px, weight 700, tracking -0.035em
- Screen title (e.g. "Nutrition"): 20px, weight 700, tracking -0.02em
- Big metric number (.bignum): 16–22px, weight 700, tabular-nums
- Body: 13.5–14px, weight 400/500
- Row label: 12.5–13px, weight 500–600
- Meta / captions: 10.5–12px, weight 400, color `--text-3`
- Uppercase xs (section labels): 10.5px, weight 700, tracking .02em

**Minimum legible sizes** — enforced during a11y pass:
- Body/caption: 10.5px floor
- Chips with text: 10px floor
- Tab bar labels: 10.5px floor

### Spacing
```
4  – inline icon gap
6–8 – pill internal padding
10  – tight card padding
14  – default card padding horizontal
16  – screen edge gutter
20  – between stacked cards
```
Border-radius scale: 6 (small chips) · 10 (small cards/rows) · 14 (input, chip-tab active) · 20–22 (large cards) · 999 (pills)

### Shadows / glow
- Lime glow (FAB, Start CTA): `0 2px 14px -2px var(--blue-glow)`
- Subtle card lift: `0 1px 0 rgba(255,255,255,0.02) inset`

## Assets
No bitmap assets. All icons are inline SVGs in `reference/icons.jsx` — substitute with equivalents from the target codebase's icon library (Material Symbols, Phosphor, Lucide, etc.), choosing the closest visual weight (1.5–1.75px stroke, rounded caps).

## Files in `reference/`
- `IronPulse Redesign.html` — the gallery page. Open in a browser to see all 13 screens side-by-side.
- `mobile.css` — every design token + component base styles (tabs, cards, rows, chips, inputs, btn).
- `icons.jsx` — all inline SVG icons used throughout.
- `shell.jsx` — Android phone frame (Pixel 7 bezel, status bar, tab bar).
- `app.jsx` — gallery layout + Tweaks panel (not production UI — just the presentation scaffold).
- `screens-primary.jsx` — Login, Dashboard, Active Workout
- `screens-secondary.jsx` — Stats, Exercises, Profile, Nutrition, Sleep
- `screens-tertiary.jsx` — Goals, Progress Photos, Connected Apps, Templates, My Program

## Accessibility notes
Colors and font sizes have been tuned to pass WCAG AA on 10.5px+ text:
- `--text-3` on `--bg-1` ≈ 7:1
- `--text-4` reserved for decorative labels ≥ 10px, ≈ 5.5:1 on `--bg`
- Chips bumped to 10–10.5px minimum
- Tab bar labels at 10.5px with `--text-3`

Implementers should **retain these minimums** when porting — do not let chips shrink below 10px or tab labels below 10.5px.

## Key "don'ts"
- Don't use pure white (#FFF). Always `--text` (#F4F0E6).
- Don't put black text on lime. Always `--blue-ink` (#0F1508).
- Don't introduce orange as a primary — it reads as Strava. Orange exists only as `--orange` for very specific accent moments (not used in the 13 shipped screens).
- Don't use Inter, Roboto, or system fonts. The Space Grotesk + Instrument Sans + JetBrains Mono trio is a load-bearing part of the identity.
- Don't add gradients to card backgrounds. Only the body has ambient radial light.
