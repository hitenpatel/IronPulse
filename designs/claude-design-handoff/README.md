# Handoff: IronPulse — Mobile Redesign (Android)

## Overview

Full redesign of **IronPulse**, a fitness tracking app targeting Android. Covers the complete daily loop — login, home, live workout, stats, nutrition, sleep, goals — across **13 screens**. The design is deliberately unified: one visual system, one typographic voice, consistent chrome. It replaces a fragmented prior app that felt like "six apps glued together."

Primary device target: **Pixel 7** (412×892 logical @ 2.625× DPR, shown at 300×636 in the gallery) and **Pixel 7 Pro** (360×780 logical shown at 360×780). The design should scale cleanly from ~360dp up to 412dp width; no tablet layout needed in this pass.

## About the Design Files

The files in this bundle are **design references authored in HTML/React (via in-browser Babel)** — high-fidelity prototypes showing intended look, layout, typography, color, and micro-interactions. **They are not production code to copy directly.** They use inline styles, Babel standalone, and a gallery wrapper so multiple screens can be inspected side-by-side in a desktop browser.

The task is to **recreate these designs in the target codebase's native environment.** For an Android client, that most likely means **Jetpack Compose** (Material 3) or a cross-platform layer (**React Native** with Expo, or **Flutter**) — whatever matches the project's existing stack. If no environment exists yet, Jetpack Compose with Material 3 is the recommended starting point: the design was drafted against M3 component shapes (rounded squircle FAB, pill status bar, gesture nav pill) and its tokens map cleanly.

Use the HTML as **source of truth for visual details**: colors, spacing, copy, type sizes, component composition. Apply your codebase's established patterns (navigation library, theming API, icon set, state management) — do not try to literally translate inline-style React into production components.

## Fidelity

**High-fidelity.** Colors are final hex values. Typography, spacing, border radii, and states are specified below and visible in the prototypes. Micro-interactions (rest timer ring, streak heatmap, progress rail, set-logger highlight) are shown in static form but should be implemented as intended — callouts where dynamic behavior matters are in the Interactions section.

## Screenshots

See the `screenshots/` folder for rendered overviews of each section:
- `01-core-loop.jpg` — Login, Dashboard, Active Workout
- `02-track-progress.jpg` — Stats, Exercises, My Program
- `03-profile-recovery.jpg` — Profile, Nutrition, Sleep
- `04-tools-ecosystem.jpg` — Goals, Progress Photos, Connected Apps, Templates

## Files Included

| File | What it is |
|---|---|
| `IronPulse Redesign.html` | Entry point. Composes the gallery of all 13 screens. |
| `mobile.css` | All design tokens + shared primitive styles (chips, cards, rows, buttons, input, bignum, phone frame). |
| `icons.jsx` | Icon set (Lucide-style line icons) + IronPulse logo mark. |
| `shell.jsx` | Phone frame, Android status bar, bottom tab bar, sparkline, top-bar primitives. |
| `app.jsx` | Gallery composition + Tweaks panel. |
| `screens-primary.jsx` | Login, Dashboard, Active Workout, Stats. |
| `screens-secondary.jsx` | Exercises, Profile, Nutrition, Sleep. |
| `screens-tertiary.jsx` | Goals, Progress Photos, Connected Apps, Templates, My Program. |

To run the prototype locally: open `IronPulse Redesign.html` in any modern browser. No build step.

---

## Design Tokens

### Colors

All colors are in hex unless noted. The app is **dark-mode-first**; a light mode is not in scope.

**Surfaces (dark)**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#060B14` | App background (deepest) |
| `--bg-1` | `#0B121D` | Card / row-list surface |
| `--bg-2` | `#111A28` | Input / secondary surface |
| `--bg-3` | `#172434` | Hover / pressed surface |
| `--bg-4` | `#1E2D41` | Raised surface |

**Lines**
| Token | Value | Use |
|---|---|---|
| `--line` | `#1C2838` | Default 1px divider |
| `--line-2` | `#26344A` | Emphasized divider |
| `--line-soft` | `#14202E` | Ultra-subtle divider (inside cards) |

**Text**
| Token | Value | Use |
|---|---|---|
| `--text` | `#E7ECF3` | Primary text |
| `--text-2` | `#AEBAC9` | Secondary text |
| `--text-3` | `#7A8698` | Tertiary / labels |
| `--text-4` | `#4F5A6D` | Disabled / metadata |

**Accent — Primary (Blue)**
| Token | Value | Use |
|---|---|---|
| `--blue` | `#0077FF` | Primary CTA, active state, brand |
| `--blue-2` | `#3391FF` | Highlight text, active icon |
| `--blue-soft` | `rgba(0,119,255,0.14)` | Filled chip / tint background |
| `--blue-glow` | `rgba(0,119,255,0.35)` | Drop shadow / glow |

**Semantic accents**
| Token | Value | Use |
|---|---|---|
| `--green` | `#22C55E` | Success, completed set, HRV |
| `--green-soft` | `rgba(34,197,94,0.14)` | Tint |
| `--purple` | `#8B5CF6` | Superset, sleep, time-based |
| `--purple-soft` | `rgba(139,92,246,0.14)` | Tint |
| `--amber` | `#F59E0B` | Streak / warning / carbs |
| `--amber-soft` | `rgba(245,158,11,0.14)` | Tint |
| `--red` | `#EF4444` | Heart rate, destructive |
| `--orange` | `#F97316` | Strava |
| `--pink` | `#EC4899` | Reserved |

**Body gradient (behind app)**
```
radial-gradient(1400px 900px at 20% 10%, rgba(0,119,255,0.05), transparent 50%),
radial-gradient(900px 600px at 90% 80%, rgba(34,197,94,0.03), transparent 60%),
#050810
```

### Typography

Three typefaces. All loaded from Google Fonts in the prototype; on native platforms use the closest available match and keep the weight scale.

| Role | Family | Fallback | Weights used |
|---|---|---|---|
| Display (titles, big numbers) | **Space Grotesk** | ui-sans-serif, system | 400, 500, 600, 700 |
| Body / UI | **Inter** | ui-sans-serif, system | 400, 500, 600 |
| Mono (timestamps, units, labels) | **JetBrains Mono** | ui-monospace | 400, 500, 600 |

**Letter-spacing rules:**
- Display: `-0.025em` for 20px+, `-0.02em` for 16–19px, `-0.01em` for 12–15px
- Body: `-0.005em` default
- Uppercase labels (section titles, chip text): `+0.12em` to `+0.16em`
- Tabular numerics: use `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum", "zero"` on any metric display

**Type scale (reference)**
| Role | Size | Weight | Family |
|---|---|---|---|
| Page hero title | 30px | 600 | Display |
| Screen title | 22–26px | 500 | Display |
| Section card title | 15–18px | 600 | Display |
| "BigNum" metric | 16–36px | 500 | Display |
| Body | 12.5–13.5px | 400–500 | Body |
| Caption | 10.5–11px | 400 | Body |
| Uppercase label | 9–11px | 600 | Body or Mono |
| Mono stat | 9–11px | 500 | Mono |

### Spacing

No rigid 4/8pt grid; values used throughout: `2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 40`. Card internal padding is `12 14` (sm frame) / `14 16` (lg frame). Row padding is `11 14`. Screen gutter is `16px`.

### Border radii

| Use | Radius |
|---|---|
| Phone frame | 30–36px |
| Card | 12–14px |
| Row-list container | 14px |
| Button | 10px (6px for sm variant) |
| Chip | 999px (pill) |
| Small tag/pill | 3–6px |
| FAB | 14–16px (Material 3 squircle — **not** circular) |
| Icon tile (row leading icon) | 7–10px |
| Avatar | 50% |

### Shadows & glows

| Use | Value |
|---|---|
| Phone bezel | `0 40px 80px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset` |
| Primary button | `0 8px 20px -8px var(--blue-glow)` |
| FAB | `0 8px 24px -6px var(--blue-glow), 0 0 0 1px rgba(255,255,255,.08) inset` |
| Accent glow on active bar | `drop-shadow(0 0 6px var(--blue))` (on SVG) or `box-shadow: 0 0 8px var(--blue)` |
| Card hover (future) | `0 12px 32px -10px var(--blue-glow)` |

---

## Android Chrome (Phone Frame)

The design uses authentic Android chrome, not iOS.

- **Status bar:** left-aligned time (e.g. "9:41"), centered punch-hole camera cutout (10×10 black circle), right-side signal bars + wifi + battery. 28px tall. Font: Inter 500.
- **No notch/pill.** Pixel 7-style centered punch-hole only.
- **Bottom navigation:** 5-slot tab bar. Center slot is a Material-3 squircle FAB (14–16px radius, **not circular**) — primary create/log action. Surrounding slots: Home, Stats, (FAB), Exercises, Profile. Active tab has colored icon + label.
- **Gesture nav pill:** 104×3px rounded bar, 50% opacity `--text-2`, centered under tab bar. Replaces iOS home indicator.
- **Top bar:** Back button (chevron-left, 30×30 target), title, optional right-side icon action.

---

## Screens

### 1. Login (`Login` in `screens-primary.jsx`)

**Purpose:** Authenticate. First impression of brand.

**Layout (top → bottom):** 56px top padding → centered logo block (56px icon tile + "IronPulse" wordmark + tagline) → 40px gap → Email input with uppercase label → Password input with eye toggle and "Forgot?" link → Primary "Log in" button → "OR CONTINUE WITH" divider → 2-column Google/Apple button row → pushed to bottom: "Don't have an account? Sign up" link.

**Key details:**
- Logo tile is `56×56`, `border-radius: 16px`, gradient background `linear-gradient(135deg, #0B121D, #0B121D 70%, #0A1E34)`, 1px border `--line-2`, blue accent glow shadow.
- Wordmark: "Iron" in `--text`, "Pulse" in `--blue-2`. 30px Display weight 600.
- Input label: 10px uppercase, `+0.14em` tracking, color `--text-3`.
- "Forgot?" is color `--blue-2`, no underline, weight 600.

### 2. Dashboard / Home (`Dashboard`)

**Purpose:** Daily launchpad. Show what's next, streak, quick stats, recent activity.

**Layout:** Brand row (logo + bell) → greeting block (date label in `--blue-2` uppercase, "Morning, Alex" in 24px Display, subtitle) → **Next Up hero card** (blue-tinted, contains workout title, exercise preview, primary Start button) → **Streak card** (flame icon, days count, 21-cell mini heatmap on the right) → 3-column metric row (Sessions, Volume, Time) → Recent list.

**Key details:**
- "Next Up" card uses a 135deg gradient from `rgba(0,119,255,0.22)` to nearly transparent, with a subtle concentric-circles SVG decoration at -14,-14 at 8% opacity.
- Streak heatmap: 3×7 grid of 6×6px squares with 2px gaps, cells opacity based on workout intensity.
- Recent rows have a 28×28 colored leading tile (icon in accent color, bg in `-soft` tint).
- Empty states should not appear on first login — show an onboarding state instead (not designed in this pass; flag for design follow-up).

### 3. Active Workout (`ActiveWorkout`)

**Purpose:** The core training screen. Log sets, follow rest timer, navigate supersets.

**Layout:** Compact header with close X + workout name + live timer + Finish button → 14-segment progress dot row (first 4 filled blue) → **Rest timer card** (40×40 ring showing countdown, "Rest" label, next set preview, +30s / Skip buttons) → **Active exercise card** with set rows → **Superset bracket card** pairing B1/B2.

**Key details on Active exercise card (IMPORTANT — no left-border accent):**
- Card has a **top tab badge** floating off the upper edge: 2×8×3px padding, solid `--blue` background, white text, "A1 · ACTIVE" in 8.5px mono 700 weight, `+0.16em` tracking, border radius `0 0 5px 5px`.
- Card has an **inset top glow**: `box-shadow: inset 0 1px 0 rgba(51,145,255,.25)`.
- Set rows use a 5-column grid: `#`, `Prev`, `kg`, `Reps`, action. Column header row in 8.5px uppercase.
- Completed sets show ✓ in `--green`, previous value greyed, "RPE 7" in 9px.
- Active set row has a light blue background tint and a solid blue "LOG" button at the end.
- PR row has a "PR" pill on the right.

**Key details on Superset card (no left-border accent):**
- "SUPERSET" chip top-left (purple), "B1 ⟷ B2" mono label top-right.
- 3-column grid: B1 exercise | **bracket hinge** | B2 exercise.
- Hinge column has a vertical gradient line (fades from transparent through `--purple` and back), interrupted mid-height by a 16×16 purple-bordered circle with a small dot inside — visually "hinging" the two.

### 4. Stats (`Stats`)

**Purpose:** Training analytics over 4w / 12w / 1y.

**Layout:** Title + segmented 4w/12w/1y toggle → **Hero metric card** (collapsible: "Back Squat · est 1RM", 36px number + "kg" + green `+14.4%` delta, full-width sparkline with gradient fill, 12w/now endpoints) → **Training status card** (3 metrics: ATL/CTL/TSB = Fatigue/Fitness/Form, each with sub-label) → **Weekly volume bars** (12 weeks of SVG bars, current week highlighted blue with glow) → **Top muscle groups** list with horizontal percentage bars → **Records** list (compact row: name, weight bignum, mini sparkline).

### 5. Exercises (`Exercises`)

**Purpose:** Browse the 420-exercise library; create custom.

**Layout:** Title + filter icon + blue Plus button → Search input with leading magnifier → Horizontal scrolling filter chips (All, Chest, Back, Legs, Shoulders, each with count) → "Recent" section with richer rows (32×32 circular progress ring showing frequency percentage around a dark inner tile with the number, name, category, 1RM on the right) → "All · A" with plain rows.

### 6. My Program (`Program`)

**Purpose:** Show this week's plan + program progression.

**Layout:** Title → **Program hero card** (Active chip + "6 day split" label, "PPL · Hypertrophy" title, "Week 3 of 8 · deload wk 4" subtitle, 38% completion on right, 8-segment program progress bar underneath) → week section with "This week · Apr 15–21" label and "3/4 done" counter → **Timeline rail** of 7 days → 2-column summary cards (Weekly goal, Projected volume).

**Key details on the Timeline rail (IMPORTANT — no left-border accent, replaced with a connected timeline):**
- The day rows sit in a container with `padding-left: 40px`. A vertical rail line sits at `left: 16px, top: 12px, bottom: 12px` — a 2px-wide vertical bar with a gradient (`--line-soft` at top/bottom, `--line` in the middle, fading to transparent at the very top and bottom).
- Each day row has an absolutely-positioned **rail node** in the gutter at `left: -32px`: 16×16 circle with 2px colored border (blue for today, green for done, the day's workout color otherwise, `--line-2` for rest days). Inside, a 6×6 dot in the matching color for done/today states (blank for upcoming).
- The **today node** has an additional outer glow: `box-shadow: 0 0 0 4px rgba(0,119,255,.15), 0 0 12px var(--blue-glow)`.
- Today's row has a blue gradient bg and subtle ring glow shadow; other rows are flat `--bg-1`.
- Workout label inside the row has a **thin 14×2px underline swatch** in the workout's color as a color identifier — not a left border.
- Rest days are `opacity: 0.5` and render with no underline swatch.

### 7. Profile (`Profile`)

**Purpose:** Hub for account, program, records, goals, recovery, settings.

**Layout:** Gradient hero band (extends -16px into gutter) with settings gear top-right, 56px gradient avatar (blue→purple), name in Display, @handle + level, chips row (Level 12, 42d streak), 3-column stat strip with vertical dividers (Workouts / PRs / Hours) → "Training" section (My program, Records, Goals, Progress photos) → "Recovery" section (Nutrition, Sleep, Wellness) → "Social" section (Friends, Privacy).

### 8. Nutrition (`Nutrition`)

**Purpose:** Daily calorie + macro log.

**Layout:** TopBar with Plus → **Calorie ring card** (triple-ring SVG: outer = total cal/goal in green, middle = protein in blue, inner = carbs in amber; center shows "REMAINING 260 cal") + 3-column macro rows with progress bars → Meal list (Breakfast/Lunch/Snack/Dinner) with 28×28 icon tiles, meal name + timestamp, food summary, calorie bignum. Empty dinner shows a "+" instead. → "Scan barcode" ghost button at the bottom.

### 9. Sleep (`Sleep`)

**Purpose:** Last night + trends.

**Layout:** TopBar with synced indicator → **Purple-tinted hero card** with 7:42 duration bignum, score 82, hypnogram (SVG stage bars connected by vertical line segments: Awake/REM/Light/Deep rows), 4-column stage breakdown (Deep / REM / Light / Awake with color-coded mini-squares) → 2-column biometric cards (Resting HR 54 bpm with red sparkline, HRV 62 ms with green sparkline) → **7-day sleep card** (vertical bar chart, last day in purple with glow).

### 10. Goals (`Goals`)

**Purpose:** Track outcome goals.

**Layout:** TopBar with Plus → 3-tab segmented control (Active · 2 / Done · 8 / Paused) → **Big goal card** (icon + Strength chip, title, target, 84% right-aligned bignum, gradient progress bar with circular thumb, start/now/goal labels underneath, 3-column Pace/Left/ETA stats) → compact goal row card → "Suggested" section with richer rows that have a + button on the right.

### 11. Progress Photos (`ProgressPhotos`)

**Purpose:** Visual comparison over time.

**Layout:** TopBar with Camera button → **Compare card** (2-column side-by-side: "FEB 24" vs "APR 19", stylized silhouette SVGs rendered on a dark gradient bg, "NOW" badge on the newer one, weight deltas underneath) → 3-column body stats cards (Weight, Body fat, Waist) with green negative deltas → **Timeline grid** (3 cols × rows of mini silhouettes, latest highlighted with blue border + ring shadow).

The silhouettes are **placeholder abstract figures** — in production replace with real uploaded photos (with EXIF-stripped, locally-cropped square thumbnails).

### 12. Connected Apps (`ConnectedApps`)

**Purpose:** Manage wearables + health-data integrations.

**Layout:** TopBar → **Active device hero card** (blue-tinted, watch icon, "Apple Watch · Alex's", sync status with pulsing green dot, battery mini-bar on right, 4-column live-stat footer) → "Connected · 3" list with toggle switches → "Available" list with "Connect" ghost buttons.

Supported devices in the design: Apple Watch, Oura Ring, Withings Body+, Polar H10, Apple Health, Strava, Google Fit, Garmin Connect.

### 13. Templates (`Templates`)

**Purpose:** Workout program library.

**Layout:** TopBar with Plus → 3-tab segmented control (Mine · 6 / Community / AI) → "In rotation" rich cards (40×40 gradient-tile initial letter, title, metadata with sets + volume, category pills, Start button) → "Archive · 3" compact row-list.

---

## Interactions & Behavior

| Element | Behavior |
|---|---|
| Rest timer ring | Circular SVG progress indicator, counts down in real-time; +30s button extends, Skip jumps to next. Timer runs in a foreground service so it survives screen lock. |
| Active set LOG button | Tap advances to next set row, plays light haptic. Holding opens a picker for kg/reps adjustment. |
| Program timeline rail | Today's node **pulses** (2s ease-in-out alpha 0.6→1 on the outer glow ring). Done nodes are static. Tapping a past day opens that session's summary; tapping a future day opens edit-workout. |
| Streak heatmap | Static visual, taps open a calendar view (not in this pass). |
| Hero metric dropdown on Stats | Chevron-down opens an exercise picker overlay (not designed; follow-up). |
| Segmented controls (4w/12w/1y, Active/Done/Paused, Mine/Community/AI) | Animated pill slides under selected option (200ms ease). |
| Tab bar FAB (center button) | Opens "Start workout" quick-choice sheet — options: resume template, start empty, cardio session. |
| Bottom nav | Persistent across Dashboard, Stats, Exercises, Profile. Hidden inside a running workout and full-screen flows (Login, Nutrition detail, Sleep detail, etc.). |
| Superset B1/B2 | During a running workout, tapping either side toggles the active half; the rest timer starts when both sides complete a round. |
| Connected Apps toggles | Flipping off prompts "Disconnect <Device>? History will be retained." Confirmation required. |

### Animations

- Card entrance on screen change: 240ms, opacity 0→1 + translateY(8px → 0), ease-out.
- Primary button press: 100ms scale to 0.97 with haptic selection.
- Progress bars fill: 800ms ease-out on initial render only.
- Today rail-node glow: infinite 2s ease-in-out alternate on the outer ring shadow.

---

## State Management

Minimal for a v1. Suggested shape:

```ts
type User = { id, handle, name, avatarSeed, level, streakDays };
type Session = { id, templateId, date, durationSec, totalVolumeKg, exercises: Array<Exercise> };
type Exercise = { id, name, muscleGroup, category, oneRepMax, prHistory, sets: Array<Set> };
type Set = { id, weightKg, reps, rpe?, completed, isPR? };
type Program = { id, name, weeks: 8, splits: Array<DayPlan>, currentWeek };
type Goal = { id, category, title, startValue, currentValue, targetValue, targetDate };
type Device = { id, kind, name, connected, lastSyncAt, batteryPct? };
type DaySleep = { date, durationMin, score, stages: { deep, rem, light, awake } };
type Meal = { id, date, mealType, items: Array<Food>, caloriesTotal, macros };
```

Use your codebase's established state layer (Compose `viewModel`+`StateFlow`, Redux, Zustand, Riverpod, etc.). Treat the live workout as a **foreground service** with its own persisted state — this is the only screen where mid-app-kill loss is unacceptable.

---

## Assets

Icons are inline SVG (Lucide line-icon style) with a few custom ones (IronPulse logo, silhouettes, device icons). **Do not copy the inline SVGs directly** — use your codebase's icon system (Lucide React Native, Material Symbols, SF Symbols mapped, whatever's standard). The logo SVG in `icons.jsx` (`Icons.Logo`) is the brand mark and should be vendored as an asset.

No photography, no illustration system beyond the placeholder silhouettes (replace with user-uploaded content).

Fonts: Space Grotesk, Inter, JetBrains Mono — all Google Fonts, freely licensable.

---

## Open questions / follow-ups for the designer

- Onboarding flow (post-signup) not designed. Login → Dashboard assumes an existing account.
- Empty states (zero workouts logged, no sleep data, no connected devices) need standalone treatments.
- Error / offline states not designed.
- The Stats "hero metric" chevron implies a picker — not yet designed.
- Light mode not in scope.
- Tablet / foldable layouts not in scope.
- Accessibility: contrast ratios are designed with WCAG AA in mind, but spot-check before ship. All interactive targets should be ≥44dp (tab bar, buttons, chevron rows all meet this; set-row inline LOG button is tight at ~28dp — consider expanding tap target with padding.)
