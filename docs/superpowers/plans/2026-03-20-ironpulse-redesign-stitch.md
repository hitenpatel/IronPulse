# IronPulse UI Redesign — Stitch Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a complete UI redesign of IronPulse in Stitch covering all mobile and web screens with the "Pulse" dark-mode-first design system.

**Architecture:** A single Stitch project containing ~70 screens organized by platform (mobile/web) and feature area. Each screen is generated via `mcp__stitch__generate_screen_from_text` with detailed prompts that embed the design system tokens for consistency. Mobile screens use `MOBILE` device type, web screens use `DESKTOP`.

**Tech Stack:** Stitch MCP (generate_screen_from_text, edit_screens), GEMINI_3_1_PRO model

**Spec:** `docs/superpowers/specs/2026-03-20-ironpulse-redesign-design.md`

---

## Design System Prompt Prefix

Every screen generation prompt MUST begin with this prefix to ensure visual consistency. This is referenced as `{DSP}` in all tasks below.

```
IronPulse fitness app redesign — "Pulse" design system.

DARK MODE (hero theme):
- Background: #060B14 (app bg), #0F1629 (cards/surfaces), #1A2340 (elevated cards/modals), #243052 (hover/muted)
- Borders: #1E2B47 (default), #152035 (subtle/dividers)
- Text: #F0F4F8 (primary), #8899B4 (secondary), #4E6180 (tertiary/placeholder)

Brand colors:
- Primary: #0077FF (CTAs, links, active states)
- Success: #10B981 (completed, PRs, positive)
- Warning: #F59E0B (caution, missed)
- Error: #EF4444 (errors, destructive)
- PR Gold: #FFD700 (personal records)
- Streak Orange: #FF6B2C (streaks, fire)

Typography:
- Headings: Clash Display (Bold 700 for display, Semibold 600 for H1/H2, Medium 500 for H3)
- Body/UI: Inter (Regular 400 body, Medium 500 captions, Semibold 600 buttons/stats)
- Stats/numbers use Inter tabular figures

Spacing: 4px grid, 12px card radius, 8px input/button radius, 24px pill radius.
Icons: Lucide, 1.75px stroke, 24px default.
Touch targets: 48px minimum on mobile.

Style: Bold, energetic, premium. Dark-mode-first with layered surface depth (no shadows on dark — use progressively lighter backgrounds for elevation). Clean and modern, not cluttered.
```

---

## Chunk 1: Project Setup & Mobile Auth

### Task 1: Create Stitch Project

- [ ] **Step 1: Create the project**

```
Tool: mcp__stitch__create_project
title: "IronPulse Redesign — Pulse"
```

- [ ] **Step 2: Record the project ID**

Save the returned project ID — it is needed for every subsequent screen generation call. All tasks below reference this as `{PROJECT_ID}`.

---

### Task 2: Mobile — Login Screen

- [ ] **Step 1: Generate login screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Login — "IronPulse" fitness app

  Layout (top to bottom):
  - Dark background (#060B14) with a subtle radial gradient of #0077FF at 8% opacity emanating from top center, creating an atmospheric glow
  - IronPulse logo (stylized "IP" mark) + wordmark "IronPulse" in Clash Display Bold, centered, white text, near top with generous spacing
  - Tagline below logo: "Strength + Cardio. One Tracker." in Inter Regular 14px, #8899B4

  Form section (centered, full width with 24px horizontal padding):
  - Email input: full width, 48px height, #0F1629 fill, #1E2B47 border, 8px radius, placeholder "Email" in #4E6180, left-aligned mail icon in #4E6180
  - Password input: same style, placeholder "Password", eye icon toggle on right
  - 12px gap between inputs
  - "Log In" button: full width, 48px height, #0077FF background, white text, Inter Semibold 16px, 8px radius, 16px below password
  - "Forgot password?" link: centered below button, #0077FF text, Inter Regular 14px

  Divider section:
  - Horizontal line divider with "or continue with" centered text in #4E6180, 24px vertical margin

  Social login row:
  - Two buttons side by side, equal width, 48px height, transparent background, #1E2B47 border, 8px radius
  - Left: Google "G" logo + "Google" text in #F0F4F8
  - Right: Apple logo + "Apple" text in #F0F4F8
  - 12px gap between buttons

  Passkey link:
  - "Sign in with passkey" centered text link, #8899B4, Inter Regular 14px, 16px below social buttons, with a small key icon

  Bottom:
  - "Don't have an account? Sign up" — "Sign up" in #0077FF bold, rest in #8899B4
  - Positioned near bottom of screen with safe area padding

  The overall feel is dark, premium, and clean. Generous vertical spacing between sections. No clutter.
```

- [ ] **Step 2: Verify screen created**

Check the screen was created successfully. Note the screen ID for potential edits.

---

### Task 3: Mobile — Signup Screen

- [ ] **Step 1: Generate signup screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Signup — "IronPulse" fitness app

  Layout (top to bottom):
  - Dark background (#060B14) with subtle radial #0077FF glow at top (same as login)
  - IronPulse logo + wordmark centered at top (same as login)
  - "Create your account" in Clash Display Semibold 22px, #F0F4F8, centered, below logo

  Form section (full width, 24px horizontal padding):
  - Name input: full width, 48px height, #0F1629 fill, #1E2B47 border, 8px radius, placeholder "Full name", user icon left
  - Email input: same style, placeholder "Email", mail icon left
  - Password input: same style, placeholder "Password", eye toggle right
  - Confirm password input: same style, placeholder "Confirm password", eye toggle right
  - 12px gap between all inputs
  - Password strength bar below password field: 4-segment bar, currently showing 2/4 segments filled (first two amber #F59E0B, last two gray #1E2B47), label "Fair" in #F59E0B, Inter Medium 12px
  - "Create Account" button: full width, 48px height, #0077FF, white text Inter Semibold 16px, 8px radius, 16px below confirm password

  Divider and social login:
  - Same "or continue with" divider pattern as login
  - Same Google + Apple button row

  Bottom:
  - "Already have an account? Log in" — "Log in" in #0077FF bold
  - Near bottom with safe area padding
```

---

### Task 4: Mobile — Onboarding Step 1 (Goals)

- [ ] **Step 1: Generate onboarding goals screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Onboarding Step 1 — Goal Selection

  Top section:
  - 3 progress dots horizontally centered, 8px diameter, 12px gap. First dot filled #0077FF, other two #1E2B47
  - "What's your goal?" in Clash Display Bold 28px, #F0F4F8, centered, 32px below dots
  - "This helps us personalize your experience" in Inter Regular 14px, #8899B4, centered

  Goal cards (vertical list, full width, 24px horizontal padding, 12px gap between cards):
  Each card: #0F1629 background, #1E2B47 border, 12px radius, 64px height, horizontal layout:
  - Left: icon (28px, #0077FF) — different per card
  - Center: goal label in Inter Semibold 16px, #F0F4F8
  - Right: empty (or subtle chevron)
  - On selection: card gets #0077FF border, #0077FF10 background tint

  Cards (top to bottom):
  1. Target icon → "Build Muscle"
  2. Flame icon → "Lose Weight"
  3. Dumbbell icon → "Get Stronger"
  4. Heart icon → "General Fitness"
  5. Running icon → "Endurance"

  Show card 3 ("Get Stronger") as the selected state with blue border and tint.

  Bottom:
  - "Continue" button: full width, 48px, #0077FF, white text, 24px horizontal padding, pinned to bottom with 24px margin
```

---

### Task 5: Mobile — Onboarding Step 2 (Experience)

- [ ] **Step 1: Generate onboarding experience screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Onboarding Step 2 — Experience Level

  Top section:
  - 3 progress dots, second dot filled #0077FF, first dot #0077FF at 50% opacity (completed), third #1E2B47
  - "Experience level?" in Clash Display Bold 28px, #F0F4F8, centered
  - "So we can tailor your training" in Inter Regular 14px, #8899B4

  Three large cards (vertical, full width, 24px padding, 16px gap):
  Each card: #0F1629 bg, #1E2B47 border, 12px radius, vertical layout, ~120px height:
  - Level name: Clash Display Medium 18px, #F0F4F8
  - Description: Inter Regular 14px, #8899B4, 1-2 lines
  - Selected state: #0077FF border + #0077FF10 tint

  Cards:
  1. "Beginner" — "New to strength training or getting back into it"
  2. "Intermediate" — "Training consistently for 1-3 years" (show this one selected)
  3. "Advanced" — "3+ years of structured training"

  Bottom: "Continue" button same as step 1
```

---

### Task 6: Mobile — Onboarding Step 3 (Units)

- [ ] **Step 1: Generate onboarding units screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Onboarding Step 3 — Unit Preference

  Top section:
  - 3 progress dots, first two #0077FF (50% opacity = completed), third filled #0077FF
  - "Preferred units?" in Clash Display Bold 28px, #F0F4F8
  - "You can change this later in settings" in Inter Regular 14px, #8899B4

  Toggle selector (centered, 24px padding):
  - Segmented control style: two options side by side in a #0F1629 container with #1E2B47 border, 8px radius, 48px height
  - Left: "Metric" — selected state: #0077FF background, white text Inter Semibold
  - Right: "Imperial" — unselected: transparent bg, #8899B4 text

  Preview card below (#0F1629, 12px radius, 24px padding, 16px below toggle):
  - Shows how data will display:
  - "Weight: 80 kg" in Inter Semibold 16px, #F0F4F8
  - "Distance: 5.0 km" in Inter Semibold 16px, #F0F4F8
  - "Body weight: 75.5 kg" in Inter Semibold 16px, #F0F4F8
  - Labels in #8899B4, values in #F0F4F8

  Bottom: "Get Started" button: full width, 48px, #0077FF, white text "Get Started" (different from previous "Continue")
```

---

## Chunk 2: Mobile Dashboard & Workout Flow

### Task 7: Mobile — Dashboard (Home Tab)

- [ ] **Step 1: Generate dashboard screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Dashboard — Home Tab

  Top bar:
  - Left: "Morning, Hiten" in Clash Display Semibold 28px, #F0F4F8, with "Thursday, 20 March" below in Inter Regular 14px, #8899B4
  - Right: bell icon (24px, #8899B4, with a small #0077FF dot badge) + message-circle icon (24px, #8899B4), 16px gap between

  Scrollable content (24px horizontal padding):

  1. Streak banner (top card):
  - #0F1629 bg, 12px radius, horizontal layout, 16px padding
  - Left: flame icon 28px in #FF6B2C + "12 Day Streak" in Clash Display Medium 18px, #F0F4F8
  - Right: 7 small dots in a row (Mon-Sun), 8px diameter, 6px gap. 5 dots filled #0077FF (Mon-Fri done), today (Sat) pulsing/glowing #0077FF, Sunday #1E2B47

  2. Quick Start section (16px below):
  - "Start Training" in Clash Display Medium 18px, #F0F4F8
  - Two cards side by side, equal width, 12px gap:
    - Left card: #0F1629 bg, 12px radius, vertical layout, 16px padding. Dumbbell icon 32px #0077FF at top, "Push Day A" in Inter Semibold 14px #F0F4F8, "Chest, Shoulders, Triceps" in Inter Regular 12px #8899B4
    - Right card: same style, activity/running icon 32px #10B981, "Cardio" in Inter Semibold 14px, "Start a session" in Inter Regular 12px #8899B4

  3. Weekly Summary card (16px below):
  - #0F1629 bg, 12px radius, 16px padding
  - 4 stats in a horizontal row, evenly spaced:
    - "3" Inter Semibold 24px #F0F4F8 + "Workouts" Inter Medium 12px #8899B4
    - "2" + "Cardio"
    - "14.2k" + "Volume (kg)"
    - "42" + "Distance (km)"
  - Below stats: week bar — M T W T F S S, letters in Inter Medium 12px #4E6180, dots below each: Mon-Wed filled #0077FF, Thu-Fri filled #10B981 (cardio), Sat-Sun #1E2B47

  4. Recent Activity (16px below):
  - "Recent Activity" in Clash Display Medium 18px, #F0F4F8, with "See All" link #0077FF right-aligned
  - 3 compact activity cards, 8px gap between:
    - Card 1: #0F1629, 12px radius, 12px padding, horizontal. Left: dumbbell icon 20px #0077FF. Middle: "Push Day A" Inter Semibold 14px #F0F4F8 + "5 exercises · 48 min" Inter Regular 12px #8899B4. Right: "2h ago" #4E6180 + small gold star icon (PR)
    - Card 2: running icon 20px #10B981, "Morning Run" + "5.2 km · 28:34", "Yesterday"
    - Card 3: dumbbell icon, "Pull Day B" + "6 exercises · 52 min", "2 days ago"

  Bottom tab bar:
  - Frosted glass bar at bottom, #060B14 at 85% opacity with blur
  - 5 tabs evenly spaced: Home (home icon, #0077FF, dot below), Stats (bar-chart-3, #4E6180), + FAB center (56px circle, #0077FF, plus icon white, slight blue glow/shadow), Exercises (dumbbell, #4E6180), Profile (user, #4E6180)
  - Tab labels below icons in Inter Medium 10px, matching icon color. FAB has no label.
```

---

### Task 8: Mobile — Active Workout Screen

- [ ] **Step 1: Generate active workout screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Active Workout — mid-session state

  Full-screen modal (no tab bar visible).

  Top bar:
  - Left: "32:15" elapsed time in Inter Semibold 16px, #8899B4
  - Center: "Push Day A" in Clash Display Medium 18px, #F0F4F8
  - Right: "Finish" in Inter Semibold 16px, #0077FF

  Scrollable exercise list (16px horizontal padding):

  Exercise 1 — Bench Press (completed):
  - Header: "Bench Press" Clash Display Medium 18px #F0F4F8 + "Chest" badge pill (#0077FF15 bg, #0077FF text, 24px radius, Inter Medium 12px) + "..." menu icon #4E6180 right
  - Set table with columns: SET | PREVIOUS | KG | REPS | ✓
  - Column headers: Inter Medium 12px, #4E6180, uppercase
  - Row 1: "1" | "60 × 10" in #4E6180 | "60" in #F0F4F8 | "10" | green checkmark ✓ #10B981 — row has subtle #10B981 left border (2px)
  - Row 2: "2" | "80 × 8" | "80" | "8" | green ✓ — same left border
  - Row 3: "3" | "80 × 8" | "85" | "8" | green ✓ + tiny gold "PR" badge next to checkmark — this was a PR set, #FFD700 left border instead
  - Row 4: "W" badge (#243052 bg, #8899B4 text) | "40 × 12" | "40" | "12" | green ✓ — warmup set
  - "+ Add Set" below table, Inter Semibold 14px, #0077FF

  Exercise 2 — Overhead Press (in progress):
  - "Overhead Press" + "Shoulders" badge
  - Row 1: completed (green ✓, green left border)
  - Row 2: current row — weight "50" and reps "—" inputs with #243052 background fill, #1E2B47 border, editable appearance. No checkmark yet (empty circle outline #1E2B47)
  - Row 3: future row — all values "—", circle outline, faded
  - "+ Add Set"

  Superset indicator: Exercise 2 and Exercise 3 (Lateral Raises, partially visible below) connected by a continuous vertical #0077FF bar (3px wide) on the left margin spanning both exercise cards.

  Exercise 3 — Lateral Raises (partially visible, scrolled):
  - Just the header and first row visible, connected to Exercise 2 by the superset bar

  Rest Timer (floating bottom bar):
  - Positioned above the bottom of screen, #0F1629 bg, 12px top radius, 16px padding
  - Center: "1:32" large countdown in Clash Display Bold 32px, #F0F4F8
  - Circular progress ring around the timer numbers, #0077FF, ~60% complete
  - Right: "Skip" in Inter Semibold 14px, #8899B4

  No tab bar (full screen modal).
```

---

### Task 9: Mobile — Add Exercise Sheet

- [ ] **Step 1: Generate add exercise bottom sheet**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Add Exercise — bottom sheet overlaying active workout

  Background: the active workout screen is visible behind, dimmed with a dark overlay (#060B14 at 60%)

  Bottom sheet (slides up from bottom, ~75% screen height):
  - #0F1629 background, 20px top-left and top-right radius
  - Drag handle: 40px wide, 4px height, #243052, centered at top, 8px from top edge

  Sheet content:
  - Search bar: full width, 48px height, #1A2340 fill, #1E2B47 border, 8px radius, magnifying glass icon #4E6180 left, placeholder "Search exercises" in #4E6180, 16px horizontal margin

  Filter pills (horizontal scroll, 12px below search, 16px left padding):
  - Pill buttons: 32px height, 24px radius, 12px horizontal padding
  - "All" pill: #0077FF bg, white text (selected)
  - "Recent" pill: #1A2340 bg, #8899B4 text, #1E2B47 border
  - "Favorites" pill: same unselected style, heart icon
  - "Chest" pill, "Back" pill, "Shoulders" pill, "Legs" pill — all unselected, scrolling off right edge

  Exercise list (scrollable, below pills):
  - Each row: 56px height, 16px horizontal padding, separated by #152035 divider
    - Left: exercise name in Inter Semibold 16px, #F0F4F8
    - Below name: muscle group in Inter Regular 12px, #8899B4
    - Right: secondary muscle tag if applicable, Inter Regular 12px, #4E6180

  Visible exercises:
  1. "Barbell Row" — "Back" + "Biceps" secondary
  2. "Cable Fly" — "Chest"
  3. "Dumbbell Curl" — "Biceps"
  4. "Face Pull" — "Rear Delts" + "Upper Back" secondary
  5. "Incline Bench Press" — "Upper Chest" + "Shoulders" secondary
  6. "Lat Pulldown" — "Back" + "Biceps" secondary
  7. More rows fading below...
```

---

### Task 10: Mobile — Workout Complete Screen

- [ ] **Step 1: Generate workout complete screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Workout Complete — post-workout summary with PRs

  Full screen, dark background #060B14.

  Top section (celebratory):
  - Subtle radiating gold (#FFD700 at 5% opacity) gradient burst from center top
  - "Workout Complete!" in Clash Display Bold 28px, #F0F4F8, centered
  - Small trophy icon 32px in #FFD700 above the text

  Summary card (#0F1629, 12px radius, 16px padding, 24px horizontal margin):
  - 4 stats in 2×2 grid:
    - "48 min" + "Duration" (clock icon #8899B4)
    - "14,200 kg" + "Volume" (dumbbell icon #8899B4)
    - "18" + "Sets" (layers icon #8899B4)
    - "5" + "Exercises" (list icon #8899B4)
  - Numbers: Inter Semibold 24px #F0F4F8, labels: Inter Medium 12px #8899B4

  PR section (16px below, 24px horizontal margin):
  - "New Personal Records" in Clash Display Medium 18px, #FFD700, with a star icon
  - PR cards (12px gap between):
    - Card 1: #0F162990 bg with #FFD700 left border (3px), 12px radius, 12px padding
      - "Bench Press" Inter Semibold 14px #F0F4F8
      - "New 1RM: 85 kg" Inter Regular 14px #FFD700
      - "Previous: 82.5 kg" Inter Regular 12px #4E6180
    - Card 2: same style
      - "Overhead Press"
      - "New 3RM: 50 kg"
      - "Previous: 47.5 kg"

  Action buttons (24px horizontal margin, 16px below PRs):
  - "Save as Template" button: full width, 48px, transparent bg, #1E2B47 border, #F0F4F8 text, copy icon left
  - "Share" button: full width, 48px, transparent bg, #1E2B47 border, #F0F4F8 text, share icon left
  - 12px gap between buttons

  Bottom:
  - "Done" button: full width, 48px, #0077FF bg, white text, 24px horizontal margin, 24px from bottom
```

---

## Chunk 3: Mobile Cardio Flow

### Task 11: Mobile — Cardio Type Picker

- [ ] **Step 1: Generate type picker screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Cardio Type Picker

  Top bar:
  - Left: back arrow icon 24px #F0F4F8
  - Center: "Start Cardio" Clash Display Medium 18px #F0F4F8

  Content (24px horizontal padding):
  - "Choose activity" Inter Regular 14px #8899B4, 16px below top bar

  2-column grid of activity cards (12px gap):
  Each card: #0F1629 bg, #1E2B47 border, 12px radius, square aspect ratio (~160px), vertical center layout:
  - Icon: 36px, #0077FF
  - Label: Inter Semibold 14px, #F0F4F8, 8px below icon

  Cards (left to right, top to bottom):
  1. Running icon → "Run"
  2. Bike icon → "Cycle"
  3. Waves icon → "Swim"
  4. Mountain icon → "Hike"
  5. Footprints icon → "Walk"
  6. Rowing icon → "Row"
  7. Circle-dot icon → "Elliptical"
  8. Plus icon → "Other"

  Bottom section:
  - "Or log manually" text link, centered, #0077FF, Inter Semibold 14px, 24px below grid
  - Tapping skips GPS tracking and goes to manual entry form

  Tab bar visible at bottom (same frosted glass style).
```

---

### Task 12: Mobile — Live GPS Cardio Tracking

- [ ] **Step 1: Generate GPS tracking screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Live GPS Cardio Tracking — mid-run state

  Full-screen modal (no tab bar).

  Map section (upper 60% of screen):
  - Dark-styled map (dark gray/navy map tiles, muted roads, no bright colors)
  - Blue route line (#0077FF, 4px width) showing a running path through streets
  - Current position: pulsing blue dot (#0077FF) with a subtle glow ring at the end of the route
  - Top overlay on map:
    - Left: back arrow 24px in white circle (#FFFFFF20 bg)
    - Center: "Running" + running icon, Inter Semibold 14px, white, in a pill (#FFFFFF15 bg, 24px radius)
    - Right: lock icon in white circle

  Amber warning banner (optional, shown):
  - Full width strip below map, #F59E0B15 bg, #F59E0B text
  - Satellite icon + "GPS signal weak" Inter Medium 14px

  Stats panel (lower 40%, #0F1629 bg, 16px top radius, sliding up over map):
  - 2×2 grid of stats, generous sizing:
    - Top left (largest, spans more width): "5.24" in Clash Display Bold 40px #F0F4F8 + "km" Inter Medium 14px #8899B4 + "Distance" Inter Medium 12px #4E6180
    - Top right: "5:28" Clash Display Semibold 28px #F0F4F8 + "/km" #8899B4 + "Pace"
    - Bottom left: "28:34" Clash Display Semibold 28px #F0F4F8 + "Duration"
    - Bottom right: "156" Clash Display Semibold 28px #F0F4F8 + "bpm" #8899B4 + "Heart Rate" with a small heart icon #EF4444

  Bottom controls (centered, 24px below stats):
  - Center: large red circle "Stop" button, 64px diameter, #EF4444, square/stop icon white 24px inside
  - Left of stop: "Pause" circle, 48px, #1A2340 bg, #1E2B47 border, pause icon #F0F4F8
  - 24px gap between buttons
```

---

### Task 13: Mobile — Manual Cardio Entry

- [ ] **Step 1: Generate manual cardio form**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Manual Cardio Entry form

  Top bar:
  - Left: "Cancel" #8899B4 text
  - Center: "Log Cardio" Clash Display Medium 18px #F0F4F8
  - Right: (empty)

  Form (scrollable, 24px horizontal padding, 16px gap between fields):

  Activity type (pre-selected):
  - Label: "Activity" Inter Medium 12px #8899B4
  - Selector: #0F1629 bg, #1E2B47 border, 8px radius, 48px height, showing "Run" with running icon, chevron-down right

  Distance:
  - Label: "Distance"
  - Input: #0F1629, 48px, "0.0" placeholder, "km" suffix label inside right side in #4E6180

  Duration:
  - Label: "Duration"
  - Three inputs side by side: HH : MM : SS, each #0F1629, with ":" separator in #4E6180

  Date & Time:
  - Label: "Date & Time"
  - Input showing "20 Mar 2026, 08:30" with calendar icon right

  Average Heart Rate (optional section):
  - Label: "Avg Heart Rate (optional)"
  - Input: placeholder "—", "bpm" suffix

  Elevation Gain (optional):
  - Label: "Elevation (optional)"
  - Input: placeholder "—", "m" suffix

  Notes:
  - Label: "Notes (optional)"
  - Textarea: #0F1629, 3 lines height, placeholder "How did it feel?"

  Bottom:
  - "Save" button: full width, 48px, #0077FF, white "Save" text, 24px margin, pinned to bottom
```

---

### Task 14: Mobile — Cardio Summary

- [ ] **Step 1: Generate cardio summary screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Cardio Summary — post-run

  Top bar:
  - Left: back arrow
  - Center: "Run Summary" Clash Display Medium 18px #F0F4F8

  Route map (full width, 200px height, 0 horizontal margin):
  - Dark map tiles, #0077FF route line showing the completed run path
  - Start marker (green #10B981 dot) and finish marker (#EF4444 dot)

  Stats grid (24px horizontal padding, 16px below map):
  - #0F1629 card, 12px radius, 16px padding
  - 3×2 grid:
    - "5.24 km" + "Distance" (ruler icon)
    - "28:34" + "Duration" (clock icon)
    - "5:28 /km" + "Avg Pace" (gauge icon)
    - "4:52 /km" + "Best Pace" (zap icon)
    - "48 m" + "Elevation" (mountain icon)
    - "312" + "Calories" (flame icon)
  - Numbers: Inter Semibold 20px #F0F4F8, labels: Inter Medium 12px #8899B4, icons 16px #4E6180

  Lap splits (16px below):
  - "Lap Splits" Clash Display Medium 18px #F0F4F8
  - Table header: LAP | KM | PACE | TIME — Inter Medium 12px #4E6180 uppercase
  - Rows (alternating: #0F1629 and #0F162980):
    - 1 | 1.00 | 5:22 | 5:22
    - 2 | 1.00 | 5:31 | 10:53
    - 3 | 1.00 | 5:18 | 16:11
    - 4 | 1.00 | 5:42 | 21:53
    - 5 | 1.00 | 5:25 | 27:18
    - 6 | 0.24 | 5:10 | 28:34
  - Text: Inter Regular 14px #F0F4F8, tabular figures

  Action buttons (24px padding, 16px below):
  - "Share" outlined button + "Done" #0077FF button, side by side
```

---

## Chunk 4: Mobile Stats, Exercises & History

### Task 15: Mobile — Stats Tab

- [ ] **Step 1: Generate stats screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Stats Tab — analytics dashboard (scrollable)

  Top bar:
  - "Stats" Clash Display Semibold 28px #F0F4F8 left-aligned, 24px left padding

  Content (24px horizontal padding, scrollable):

  1. Training Status card (#0F1629, 12px radius, 16px padding):
  - Top row: "Training Status" Inter Semibold 14px #8899B4 left, "Optimal" pill badge (#10B981 text, #10B98115 bg, 24px radius) right
  - Mini line chart area (80px height): a smooth TSB line over 14 days, mostly above zero (positive territory), line color #0077FF, area fill #0077FF10, zero line dashed #1E2B47
  - Bottom row: 3 metrics evenly spaced:
    - "62" + "Fitness" + up-arrow #10B981 (CTL going up)
    - "55" + "Fatigue" + down-arrow #10B981 (ATL going down = good)
    - "+7" + "Form" + #10B981 text (positive TSB)
  - Numbers: Inter Semibold 20px #F0F4F8, labels Inter Medium 12px #8899B4

  2. Weekly Volume card (16px below):
  - "Weekly Volume" header + "This Week" pill selector
  - Stacked bar chart (120px height): 7 bars for Mon-Sun, each bar composed of colored segments:
    - Chest (#0077FF), Back (#10B981), Shoulders (#F59E0B), Arms (#8B5CF6), Legs (#EF4444)
  - Mon-Wed bars tallest (training days), Thu smaller, Fri-Sat medium, Sun empty
  - Small legend below: colored dots + muscle group names in Inter Regular 12px #8899B4

  3. Muscle Heatmap card (16px below):
  - "Muscle Volume" header + "Front" / "Back" toggle pills
  - Body silhouette (front view), ~180px height, centered
  - Muscles colored from cool blue (#0077FF30) for low volume to hot (#EF4444) for high volume
  - Chest and shoulders showing hot (red/orange), legs medium (yellow-green), arms cool (blue)

  4. Body Weight Trend card (16px below):
  - "Body Weight" header + 30d / 90d / 1y toggle pills
  - Line chart (100px height): weight trend line in #0077FF with dot markers on data points, slight downward trend from 78kg to 75.5kg
  - Inline log row below chart: weight input (#1A2340 bg, compact) + "Log" small #0077FF button

  Tab bar at bottom (Stats tab active — bar-chart-3 icon #0077FF with dot).
```

---

### Task 16: Mobile — Exercise Library

- [ ] **Step 1: Generate exercise library screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Exercise Library — Exercises tab

  Top bar:
  - "Exercises" Clash Display Semibold 28px #F0F4F8 left-aligned

  Search bar (24px horizontal padding):
  - Full width, 44px height, #0F1629 fill, #1E2B47 border, 8px radius, magnifying glass icon #4E6180, placeholder "Search exercises" #4E6180

  Filter pills (horizontal scroll, 12px below, 16px left padding):
  - "All" selected (#0077FF bg, white text)
  - "Favorites" (#1A2340 bg, #8899B4, heart icon)
  - "Chest", "Back", "Shoulders", "Legs", "Arms", "Core" — unselected pills scrolling

  Exercise list (16px below, 24px horizontal padding):
  - Alphabet section headers: "B" in Inter Semibold 14px #4E6180, with #152035 divider below

  List items (56px height, #152035 divider between):
  - "Barbell Row" Inter Semibold 16px #F0F4F8 + "Back" badge pill (#10B98120 bg, #10B981 text, tiny)
  - "Bench Press" + "Chest" badge (#0077FF20 bg, #0077FF text) + heart icon filled #EF4444 (favorited)
  - "Bulgarian Split Squat" + "Legs" badge (#EF444420 bg, #EF4444 text)

  Section "C":
  - "Cable Fly" + "Chest" badge
  - "Calf Raise" + "Legs" badge

  Section "D":
  - "Deadlift" + "Back" badge + "Legs" secondary tag in #4E6180
  - "Dumbbell Curl" + "Biceps" badge
  - More items fading below...

  Tab bar: Exercises tab active (dumbbell icon #0077FF with dot).
```

---

### Task 17: Mobile — Exercise Detail

- [ ] **Step 1: Generate exercise detail screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Exercise Detail — Bench Press

  Top bar:
  - Left: back arrow #F0F4F8
  - Center: "Bench Press" Clash Display Medium 18px #F0F4F8
  - Right: heart icon filled #EF4444 (favorited)

  Content (24px horizontal padding, scrollable):

  Muscle badges (top):
  - "Chest" primary badge (#0077FF20 bg, #0077FF text, 24px radius pill)
  - "Triceps" secondary badge (#1A2340 bg, #8899B4 text)
  - "Shoulders" secondary badge

  PR section (#0F1629 card, 12px radius, 16px padding, 16px below badges):
  - "Personal Records" Clash Display Medium 16px #FFD700
  - 4 PR cards in 2×2 grid (8px gap):
    - Each: #1A2340 bg, 8px radius, 12px padding
    - "1RM" Inter Medium 12px #8899B4 + "85 kg" Inter Semibold 18px #FFD700
    - "3RM" + "80 kg"
    - "5RM" + "72.5 kg"
    - "Vol" + "4,800 kg"

  History section (16px below):
  - "History" Clash Display Medium 16px #F0F4F8

  History items grouped by date:
  - Date header: "18 March 2026" Inter Medium 12px #4E6180
  - Session card: #0F1629, 12px radius, 12px padding
    - "Push Day A" Inter Semibold 14px #F0F4F8
    - Mini set summary: "4 sets · 60-85 kg · Best: 85×8" Inter Regular 12px #8899B4
    - Gold "PR" tiny badge if PR was set

  - Date: "15 March 2026"
  - Session: "Push Day A" + "4 sets · 60-82.5 kg · Best: 82.5×8"

  - Date: "11 March 2026"
  - Session: "Upper Body" + "3 sets · 60-80 kg"

  More entries fading below...
```

---

### Task 18: Mobile — Workout History List

- [ ] **Step 1: Generate workout history screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Workout History — list of past workouts

  Top bar:
  - Left: back arrow
  - Center: "Workouts" Clash Display Medium 18px #F0F4F8

  Content (scrollable, 24px horizontal padding):

  Month header: "March 2026" Clash Display Semibold 22px #F0F4F8, 16px bottom margin

  Workout cards (12px gap between):

  Card 1: #0F1629 bg, 12px radius, 16px padding
  - Top row: "Push Day A" Inter Semibold 16px #F0F4F8 + gold star icon #FFD700 (had PRs)
  - Bottom row: "20 Mar · 48 min · 5 exercises · 14,200 kg" Inter Regular 12px #8899B4
  - Chevron right #4E6180

  Card 2: same style
  - "Morning Run" with running icon #10B981 — wait, this is workout history, not cardio
  - Actually: "Pull Day B" + no star
  - "18 Mar · 52 min · 6 exercises · 15,800 kg"

  Card 3: "Push Day A"
  - "15 Mar · 45 min · 5 exercises · 13,900 kg"

  Card 4: "Leg Day"
  - "13 Mar · 55 min · 6 exercises · 22,400 kg" + gold star

  Card 5: "Pull Day A"
  - "11 Mar · 50 min · 5 exercises · 14,200 kg"

  Month header: "February 2026" Clash Display Semibold 22px #F0F4F8
  - More cards below, fading...
```

---

### Task 19: Mobile — Workout Detail

- [ ] **Step 1: Generate workout detail screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Workout Detail — viewing a completed "Push Day A" workout

  Top bar:
  - Left: back arrow
  - Center: "Push Day A" Clash Display Medium 18px #F0F4F8
  - Right: share icon #8899B4

  Stats pills row (24px horizontal padding, horizontal scroll):
  - 4 pills: "20 Mar" (#1A2340 bg, calendar icon), "48 min" (clock icon), "14,200 kg" (dumbbell icon), "2 PRs" (#FFD700 text, star icon, #FFD70015 bg)
  - Inter Medium 12px, 8px horizontal padding each, 24px radius, 8px gap

  Exercise cards (24px padding, 16px gap, scrollable):

  Exercise 1 — Bench Press:
  - "Bench Press" Clash Display Medium 16px #F0F4F8 + "Chest" badge
  - Read-only set table (no edit controls):
    - SET | KG | REPS | 1RM EST
    - 1 | 60 | 10 | 80
    - 2 | 80 | 8 | 101
    - 3 | 85 | 8 | 107 ← row highlighted with #FFD700 left border + "PR" badge
    - W | 40 | 12 | —
  - Table text: Inter Regular 14px #F0F4F8, headers #4E6180

  Exercise 2 — Overhead Press:
  - "Overhead Press" + "Shoulders" badge
  - SET | KG | REPS | 1RM EST
  - 1 | 40 | 10 | 53
  - 2 | 50 | 8 | 63 ← #FFD700 left border + "PR"
  - 3 | 50 | 6 | 60

  Exercise 3 — Incline Dumbbell Press (partially visible):
  - "Incline DB Press" + "Upper Chest" badge
  - First 2 rows visible...

  Floating bottom: "Save as Template" outlined button, full width
```

---

### Task 20: Mobile — Cardio History & Detail

- [ ] **Step 1: Generate cardio history screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Cardio History — list of past cardio sessions

  Top bar:
  - Left: back arrow
  - Center: "Cardio" Clash Display Medium 18px #F0F4F8

  Content (scrollable, 24px horizontal padding):

  Month header: "March 2026" Clash Display Semibold 22px #F0F4F8

  Cardio cards (12px gap):

  Card 1: #0F1629, 12px radius, 16px padding, horizontal layout
  - Left column: running icon 24px #10B981 in a #10B98115 circle (40px)
  - Middle: "Morning Run" Inter Semibold 16px #F0F4F8 + "5.24 km · 28:34 · 5:28/km" Inter Regular 12px #8899B4
  - Right: small dark route map thumbnail (60×60px, rounded 8px) showing the route in #0077FF on dark tiles
  - "20 Mar" Inter Regular 12px #4E6180 below middle text

  Card 2: bike icon #0077FF
  - "Evening Cycle" + "22.4 km · 52:10 · 2:20/km" + route thumbnail
  - "18 Mar"

  Card 3: running icon #10B981
  - "Park Run" + "5.00 km · 24:12 · 4:50/km" + route thumbnail
  - "16 Mar"

  Card 4: mountain icon #F59E0B
  - "Weekend Hike" + "8.3 km · 1:42:00" + route thumbnail
  - "15 Mar"

  More cards fading...
```

---

### Task 21: Mobile — Calendar

- [ ] **Step 1: Generate calendar screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Calendar — month view of training activity

  Top bar:
  - Left: back arrow
  - Center: left-arrow, "March 2026" Clash Display Semibold 22px #F0F4F8, right-arrow

  Calendar grid (24px horizontal padding):
  - Day-of-week headers: M T W T F S S in Inter Medium 12px #4E6180
  - Date cells: 7 columns, ~48px per cell, 6 rows for the month
  - Each date: number in Inter Regular 16px #F0F4F8 (current month) or #4E6180 (overflow)
  - Today (20): number inside a #0077FF ring circle
  - Days with workouts: small #0077FF dot (6px) below the number
  - Days with cardio: small #10B981 dot below
  - Days with both: two dots stacked (#0077FF on top, #10B981 below)
  - Empty/rest days: just the number, no dot

  Example dots:
  - Mar 3, 5, 7, 10, 12, 15, 18, 20: #0077FF dots (workouts)
  - Mar 4, 8, 14, 16, 19: #10B981 dots (cardio)
  - Mar 11, 13: both dots (workout + cardio)

  Expanded day section (below calendar, 16px margin):
  - "Thursday 20 March" Inter Semibold 14px #8899B4
  - Session card: #0F1629, 12px radius, 12px padding
    - Dumbbell icon #0077FF + "Push Day A" Inter Semibold 14px #F0F4F8 + "48 min · 5 exercises" #8899B4
    - Chevron right

  Tab bar visible.
```

---

## Chunk 5: Mobile Social, Coaching, Messages, Profile

### Task 22: Mobile — Activity Feed

- [ ] **Step 1: Generate feed screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Activity Feed — social feed from followed users

  Top bar:
  - "Feed" Clash Display Semibold 28px #F0F4F8 left-aligned

  Feed cards (24px horizontal padding, 16px gap, scrollable):

  Card 1 — Workout post:
  - #0F1629, 12px radius, 16px padding
  - Header: avatar circle 40px (placeholder photo), "Sarah Chen" Inter Semibold 14px #F0F4F8, "2h ago" Inter Regular 12px #4E6180, dumbbell icon 16px #0077FF
  - Content: "Completed Push Day A — 6 exercises, 15,200 kg volume" Inter Regular 14px #F0F4F8
  - Mini exercise summary: "Bench Press · OHP · Incline DB · Cable Fly · Lateral Raise · Tricep Pushdown" Inter Regular 12px #8899B4
  - Reaction bar: 3 buttons horizontal, 8px gap — fist-bump "3" (#0077FF), fire "1" (#FF6B2C), flexed-arm "2" (#10B981) — icons 20px, count Inter Medium 12px #8899B4

  Card 2 — PR post (special):
  - #0F1629 with subtle #FFD700 top border (2px)
  - Header: avatar 40px, "Mike Torres", "5h ago", star icon #FFD700
  - Content: "New Personal Record!" Inter Semibold 16px #FFD700
  - "Deadlift 1RM: 180 kg" Clash Display Medium 18px #F0F4F8
  - "Previous: 175 kg" Inter Regular 12px #4E6180
  - Reaction bar: fist-bump "8", fire "5", flexed-arm "12"

  Card 3 — Cardio post:
  - Header: avatar, "Alex Kim", "Yesterday", running icon #10B981
  - Content: "Ran 10.0 km in 48:22" Inter Regular 14px #F0F4F8
  - Mini route map thumbnail (full card width, 100px height, rounded 8px, dark tiles, #0077FF route)
  - Reaction bar: fist-bump "2", fire "1"

  Tab bar visible (no tab selected for feed — it's accessed from dashboard).
```

---

### Task 23: Mobile — Coach Client List

- [ ] **Step 1: Generate coach client list**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Coach Client List

  Top bar:
  - "My Clients" Clash Display Semibold 28px #F0F4F8 left, "5" badge count in #0077FF15 bg #0077FF text pill right

  Search bar (24px horizontal padding):
  - Standard search bar style, 44px, #0F1629, magnifying glass icon

  Client cards (16px below, 24px padding, 12px gap):

  Card 1: #0F1629, 12px radius, 16px padding, horizontal layout
  - Avatar 48px (placeholder photo) with green dot (#10B981, 10px) overlapping bottom-right (active)
  - "Emma Wilson" Inter Semibold 16px #F0F4F8
  - "Push/Pull/Legs · 85% adherence" Inter Regular 12px #8899B4
  - "Active 2h ago" Inter Regular 12px #10B981
  - Chevron right #4E6180

  Card 2:
  - Avatar with green dot
  - "James Park"
  - "Upper/Lower · 72% adherence"
  - "Active 5h ago" #10B981

  Card 3:
  - Avatar with gray dot #4E6180 (inactive)
  - "Lisa Nguyen"
  - "Full Body · 45% adherence" — adherence in #F59E0B (low, warning color)
  - "Last active 3 days ago" #F59E0B

  Card 4:
  - Avatar green dot
  - "Tom Richards"
  - "Strength Focus · 91% adherence"
  - "Active today" #10B981

  Card 5:
  - Avatar gray dot
  - "Rachel Adams"
  - "No program assigned" #4E6180
  - "Last active 1 week ago" #EF4444
```

---

### Task 24: Mobile — Coach Client Detail

- [ ] **Step 1: Generate client detail screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Coach Client Detail — viewing a client "Emma Wilson"

  Top bar:
  - Left: back arrow
  - Center: "Emma Wilson" Clash Display Medium 18px #F0F4F8

  Profile header (#0F1629, 16px padding, no radius — full width):
  - Avatar 64px centered + "Emma Wilson" Clash Display Semibold 22px below
  - "Member since Jan 2026" Inter Regular 12px #8899B4
  - "Push/Pull/Legs" program badge pill (#0077FF15 bg, #0077FF text)

  Tab navigation (sticky, below header):
  - 4 tabs horizontal: Overview | Workouts | Stats | Program
  - Active tab ("Overview"): #0077FF text with #0077FF bottom border 2px
  - Inactive: #4E6180 text
  - Full width, evenly spaced, Inter Semibold 14px

  Overview content (24px padding, scrollable):

  Adherence ring (centered):
  - Circular progress ring, 100px diameter, #0077FF, 85% filled
  - "85%" in center, Clash Display Bold 28px #F0F4F8
  - "Adherence" below ring, Inter Medium 12px #8899B4

  Weekly summary card (#0F1629, 12px radius, 16px padding, 16px below):
  - 3 stats in a row: "4 Workouts" | "12,400 kg Volume" | "3h 20m Time"
  - Inter Semibold 16px #F0F4F8 numbers, Inter Medium 12px #8899B4 labels

  Recent sessions (16px below):
  - "Recent Activity" Inter Semibold 14px #8899B4
  - 3 compact cards showing last sessions (same style as dashboard recent activity)
```

---

### Task 25: Mobile — Messages Inbox

- [ ] **Step 1: Generate messages inbox**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Messages Inbox

  Top bar:
  - "Messages" Clash Display Semibold 28px #F0F4F8

  Conversation list (full width):

  Row 1 (unread — #1A2340 bg):
  - Avatar 48px left, "Coach Mike" Inter Semibold 16px #F0F4F8, timestamp "10:32" Inter Regular 12px #4E6180 right
  - Message preview: "Great session today! Let's adjust your..." Inter Regular 14px #8899B4, truncated single line
  - Unread badge: #0077FF circle 20px with "2" white text, far right
  - #152035 divider below

  Row 2 (unread — #1A2340 bg):
  - Avatar, "Sarah Chen", "Yesterday"
  - "Nice PR on bench! What weight are you..."
  - Unread badge "1"

  Row 3 (read — #060B14 bg):
  - Avatar, "Alex Kim", "Mon"
  - "Thanks for the template, I'll try it..."
  - No badge

  Row 4 (read):
  - Avatar, "Emma Wilson", "12 Mar"
  - "Can we move Thursday's session to..."

  Row 5 (read):
  - Avatar, "James Park", "10 Mar"
  - "Got it, I'll start the new program..."

  Tab bar visible.
```

---

### Task 26: Mobile — Message Thread

- [ ] **Step 1: Generate message thread screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Message Thread — chat with "Coach Mike"

  Top bar:
  - Left: back arrow
  - Center: avatar 32px + "Coach Mike" Inter Semibold 16px #F0F4F8
  - Right: (empty)

  Chat area (scrollable, 16px horizontal padding):

  Timestamp group: "Today" centered, Inter Medium 12px #4E6180, 16px margin

  Received message (left-aligned):
  - #0F1629 bg, 12px radius (rounded all corners except bottom-left is 4px), 12px padding, max-width 75%
  - "Hey Hiten, great session today! I noticed your bench press is really progressing." Inter Regular 14px #F0F4F8
  - "10:30" Inter Regular 10px #4E6180 below, right-aligned within bubble

  Received message:
  - "Let's adjust your program next week — I want to add an extra chest day since you're recovering well."
  - "10:31"

  Sent message (right-aligned):
  - #0077FF bg, 12px radius (rounded all corners except bottom-right is 4px), 12px padding
  - "Thanks Coach! Yeah the 85kg felt solid today. Happy to add more volume." white text Inter Regular 14px
  - "10:32" Inter Regular 10px #FFFFFF80 below

  Sent message:
  - "Should I keep the RPE the same or push a bit harder?"
  - "10:32"

  Received message:
  - "Keep RPE 8 for now. We'll reassess after next week. Rest up! 💪"
  - "10:35"

  Input bar (bottom, #0F1629 bg, #1E2B47 top border):
  - Text input: #1A2340 bg, 40px height, 20px radius (pill shape), placeholder "Message..." #4E6180
  - Send button: #0077FF circle 36px, arrow-up icon white, right of input
  - Safe area padding below
```

---

### Task 27: Mobile — Profile Tab

- [ ] **Step 1: Generate profile tab screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Profile Tab

  Profile header (centered, 24px padding):
  - Avatar 80px circle (placeholder photo)
  - "Hiten Patel" Clash Display Semibold 22px #F0F4F8, 12px below
  - "hiten@example.com" Inter Regular 14px #8899B4
  - "Athlete" tier badge pill (#0077FF15 bg, #0077FF text, 24px radius), 8px below
  - Streak: flame icon #FF6B2C + "12 day streak" Inter Medium 14px #FF6B2C, 8px below

  Stats row (#0F1629 card, 12px radius, 16px padding, 24px horizontal margin, 16px below):
  - 3 stats evenly spaced with vertical #152035 dividers:
  - "248" + "Workouts" (Inter Semibold 24px #F0F4F8 / Inter Medium 12px #8899B4)
  - "89" + "Cardio"
  - "42" + "PRs" (star icon #FFD700)

  Settings list (24px horizontal margin, 16px below):

  Section "Account" — Inter Medium 12px #4E6180 uppercase header:
  - "Edit Profile" — user icon left #8899B4, chevron right #4E6180, 48px row, #152035 divider
  - "Change Email" — mail icon
  - "Security" — shield icon

  Section "Preferences":
  - "Units" — ruler icon, "Metric" value label right in #4E6180
  - "Rest Timer" — timer icon, "90s" value
  - "Notifications" — bell icon

  Section "Integrations":
  - "Strava" — orange Strava-style icon, "Connected" #10B981 right
  - "Apple Health" — heart icon, "Connected" #10B981

  Section "Subscription":
  - "Athlete Plan" — credit-card icon, "£15/mo" #4E6180 right

  Section "":
  - "Data Export" — download icon
  - "About" — info icon
  - "Sign Out" — log-out icon, #EF4444 text, no chevron

  Tab bar: Profile tab active (user icon #0077FF with dot).
```

---

### Task 28: Mobile — Settings Integrations

- [ ] **Step 1: Generate integrations settings screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Settings — Integrations

  Top bar:
  - Left: back arrow
  - Center: "Integrations" Clash Display Medium 18px #F0F4F8

  Content (24px horizontal padding, scrollable):

  Integration card 1 — Strava (#0F1629, 12px radius, 16px padding):
  - Header row: Strava logo (orange square icon), "Strava" Inter Semibold 16px #F0F4F8, "Connected" badge (#10B981 text, #10B98115 bg, 24px radius pill) right
  - "Last synced 2 hours ago" Inter Regular 12px #8899B4
  - "Disconnect" text button Inter Medium 14px #EF4444, right-aligned, 8px below

  Integration card 2 — Garmin (#0F1629, 12px radius, 16px padding, 16px below):
  - Garmin logo placeholder, "Garmin Connect" Inter Semibold 16px
  - "Not connected" #4E6180
  - "Connect" button: #0077FF bg, white text, 36px height, 8px radius, right-aligned

  Integration card 3 — Apple Health (#0F1629, 12px radius, 16px padding, 16px below):
  - Heart icon in pink/red, "Apple Health" Inter Semibold 16px
  - "Connected" badge #10B981
  - Toggle rows below (12px gap):
    - "Read Workouts" Inter Regular 14px #F0F4F8 + toggle switch (on, #0077FF)
    - "Write Workouts" + toggle (on)
    - "Read Body Weight" + toggle (on)
    - "Read Heart Rate" + toggle (off, #1E2B47 bg)
```

---

## Chunk 6: Web — Shell, Landing & Auth

### Task 29: Web — Landing Page

- [ ] **Step 1: Generate landing page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Landing Page — IronPulse marketing homepage (full page, 1440px wide)

  Hero section (full width, #060B14 bg):
  - Subtle animated gradient mesh: #0077FF at 8% opacity, organic blobs in the background
  - Navigation bar: IronPulse logo + wordmark left, nav links center ("Features", "Pricing", "Self-Host" in Inter Medium 14px #8899B4, hover: #F0F4F8), "Log In" ghost link + "Get Started" #0077FF button right. 80px horizontal padding.
  - Hero content (centered, max-width 800px, generous vertical padding ~120px):
    - "Strength + Cardio." line 1, "One Tracker." line 2 — Clash Display Bold 64px #F0F4F8
    - "The open-source fitness platform that unifies your strength training and cardio in one powerful app. Offline-first. Self-hostable. Free forever." Inter Regular 18px #8899B4, max-width 600px, centered
    - Two CTA buttons (16px gap, centered):
      - "Get Started Free" #0077FF bg, white text, 48px height, 24px horizontal padding, 8px radius
      - "Self-Host" outlined (#1E2B47 border, #F0F4F8 text), same size

  Features section (#0A0F1A bg, 80px padding):
  - "Everything you need" Clash Display Semibold 36px #F0F4F8 centered
  - "Track, analyze, and improve — all in one place" Inter Regular 16px #8899B4 centered
  - 3-column grid (32px gap, max-width 1200px centered), 48px below:
    - Card 1: dumbbell icon 32px #0077FF, "Strength Training" Clash Display Medium 18px #F0F4F8, "Log exercises, sets, reps, RPE. Auto-detect PRs. Workout templates." Inter Regular 14px #8899B4. #0F1629 bg, 12px radius, 24px padding.
    - Card 2: activity icon #10B981, "GPS Cardio", "Live GPS tracking for runs, rides, hikes. Route maps, lap splits, pace analysis."
    - Card 3: bar-chart-3 icon #8B5CF6, "Smart Analytics", "Training load, muscle volume heatmaps, body composition trends, fitness scoring."
    - Card 4: users icon #F59E0B, "Coaching", "Manage clients, build programs, track adherence. Built for personal trainers."
    - Card 5: wifi-off icon #0077FF, "Offline-First", "Works without internet. Syncs automatically when back online. PowerSync + SQLite."
    - Card 6: link icon #10B981, "Integrations", "Strava, Garmin, Apple Health, Google Fit. Import and sync your data."

  Pricing section (#060B14, 80px padding):
  - "Simple Pricing" Clash Display Semibold 36px centered
  - "Free forever when self-hosted. Cloud plans for convenience." Inter Regular 16px #8899B4
  - Annual/Monthly toggle (centered pill selector, 32px below)
  - 3 pricing cards (max-width 1100px, centered, 24px gap):
    - "Self-Hosted" card: #0F1629, 12px radius, 24px padding. "Free" Clash Display Bold 40px, "forever" #8899B4. Feature list with check icons. "Get Started" outlined button.
    - "Athlete" card: #0F1629, #0077FF border 2px (highlighted), 12px radius. "£15" Clash Display Bold 40px + "/mo" #8899B4. Feature list. "Start Free Trial" #0077FF button. "Most Popular" badge pill at top.
    - "Coach" card: same as Athlete without border highlight. "£30" + "/mo". Extended feature list. "Start Free Trial" outlined button.

  Footer (#0A0F1A, 60px padding, #152035 top border):
  - 4 columns: Product (features, pricing, self-host), Resources (docs, API, status), Legal (privacy, terms), Community (GitHub, Discord)
  - Bottom row: "© 2026 IronPulse" left, social icons right
  - All links Inter Regular 14px #4E6180, hover #8899B4
```

---

### Task 30: Web — Login Page

- [ ] **Step 1: Generate web login**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Login Page — centered card layout (1440px viewport)

  Full page dark background #060B14 with subtle #0077FF radial gradient from center.

  Centered card (max-width 420px, #0F1629 bg, 12px radius, 32px padding):
  - IronPulse logo + wordmark centered at top, 24px below card top
  - "Welcome back" Clash Display Semibold 22px #F0F4F8, centered, 24px below logo
  - "Sign in to your account" Inter Regular 14px #8899B4, centered

  Form (24px below):
  - Email label: "Email" Inter Medium 12px #8899B4
  - Email input: full width, 44px height, #1A2340 fill, #1E2B47 border, 8px radius, focus: #0077FF border
  - Password label + input (16px below): same style, eye toggle icon right
  - "Forgot password?" link right-aligned below password, #0077FF Inter Regular 12px
  - "Log In" button: full width, 44px, #0077FF, white text, 24px above

  Divider: "or continue with" centered, #4E6180, line on each side

  Social buttons (2 side by side, 12px gap):
  - Google: outlined, #1E2B47 border, Google logo + "Google"
  - Apple: outlined, Apple logo + "Apple"

  Passkey: "Sign in with passkey" centered link, #8899B4, key icon, 16px below

  Bottom of card: "Don't have an account? Sign up" — #8899B4 + #0077FF link

  Below card: "Back to home" link, Inter Regular 14px #4E6180, 16px below card
```

---

### Task 31: Web — Signup Page

- [ ] **Step 1: Generate web signup**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Signup Page (1440px viewport)

  Same background as login — #060B14 with #0077FF radial gradient.

  Centered card (420px, #0F1629, 12px radius, 32px padding):
  - Logo + wordmark
  - "Create your account" Clash Display Semibold 22px #F0F4F8
  - "Start tracking your fitness journey" Inter Regular 14px #8899B4

  Form:
  - Full name input (label "Full name")
  - Email input (label "Email")
  - Password input + strength bar (4 segments, showing 3/4 green = "Strong")
  - Confirm password input
  - All inputs: 44px height, #1A2340, #1E2B47 border, 16px gap between
  - "Create Account" button: full width, 44px, #0077FF, white

  Divider + social buttons (same as login)

  Bottom: "Already have an account? Log in" link

  Below card: "Back to home" link
```

---

### Task 32: Web — Forgot & Reset Password

- [ ] **Step 1: Generate forgot password screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Forgot Password (1440px viewport)

  Same dark background with #0077FF gradient as login.

  Centered card (420px, #0F1629, 12px radius, 32px padding):
  - Back arrow + "Back to login" link at top, #8899B4, Inter Regular 14px
  - Mail icon 32px #0077FF centered, 24px below
  - "Reset your password" Clash Display Semibold 22px #F0F4F8 centered
  - "Enter your email and we'll send you a reset link" Inter Regular 14px #8899B4 centered

  Form:
  - Email input: full width, 44px, standard dark input style
  - "Send Reset Link" button: full width, 44px, #0077FF, white text, 16px below
```

- [ ] **Step 2: Generate reset password screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Reset Password — new password form (1440px viewport)

  Same dark background with #0077FF gradient as login.

  Centered card (420px, #0F1629, 12px radius, 32px padding):
  - Lock icon 32px #0077FF centered at top
  - "Set new password" Clash Display Semibold 22px #F0F4F8 centered
  - "Enter your new password below" Inter Regular 14px #8899B4 centered

  Form (24px below):
  - "New Password" label + input (44px, standard dark style, eye toggle right)
  - Password strength bar below: 4 segments, 3/4 filled green #10B981, label "Strong" #10B981 Inter Medium 12px
  - "Confirm Password" label + input (16px below, same style)
  - "Reset Password" button: full width, 44px, #0077FF, white text, 24px below

  Bottom of card: "Back to login" link #0077FF
```

---

### Task 33: Web — Onboarding

- [ ] **Step 1: Generate web onboarding screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Onboarding — all 3 steps visible as a wizard (1440px viewport)

  Background: #060B14

  Centered container (max-width 600px):
  - IronPulse logo at top, small
  - Progress bar: 3 segments, first filled #0077FF, others #1E2B47, full width, 4px height, 8px radius
  - Step indicator: "Step 1 of 3" Inter Medium 12px #8899B4, right-aligned above bar

  Step 1 content (showing goal selection):
  - "What's your goal?" Clash Display Bold 28px #F0F4F8, centered
  - "This helps us personalize your experience" Inter Regular 14px #8899B4

  Goal cards (vertical stack, 12px gap):
  - 5 cards, each: #0F1629 bg, #1E2B47 border, 12px radius, 56px height, horizontal layout
  - Icon 24px #0077FF left, label Inter Semibold 16px #F0F4F8 center-left
  - Hover state on one card: #1E2B47 bg shift
  - Selected card ("Get Stronger"): #0077FF border, #0077FF10 bg tint, checkmark icon right
  - Cards: Target→"Build Muscle", Flame→"Lose Weight", Dumbbell→"Get Stronger" (selected), Heart→"General Fitness", Running→"Endurance"

  Bottom: "Continue" button full-width, 44px, #0077FF
```

---

## Chunk 7: Web — Dashboard & Workouts

### Task 34: Web — Dashboard

- [ ] **Step 1: Generate web dashboard**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Dashboard — authenticated app with sidebar (1440px viewport)

  Sidebar (260px, #0A0F1A bg, left side, full height):
  - Top: IronPulse logo mark + "IronPulse" wordmark in Clash Display, 24px padding, 16px from top
  - Nav groups (16px horizontal padding, 8px gap between items):

  "TRAINING" section label (Inter Medium 10px #4E6180 uppercase, 24px top margin):
  - Dashboard (home icon, ACTIVE: #0077FF text, #0077FF10 bg, 2px #0077FF left border, 36px height, 8px radius)
  - Workouts (dumbbell icon, inactive: #8899B4 text, hover: #243052 bg)
  - Cardio (activity icon)
  - Calendar (calendar icon)
  - Exercises (library icon)
  - Templates (copy icon)
  - My Program (calendar-check icon)

  "ANALYTICS" label:
  - Stats (bar-chart-3)
  - Body Metrics (ruler)

  "SOCIAL" label:
  - Feed (rss)
  - Messages (message-circle) with "2" badge pill #0077FF

  "TOOLS" label:
  - 1RM Calculator (calculator)
  - Plate Calculator (circle-dot)

  Bottom of sidebar:
  - Theme toggle (moon icon), settings gear, side by side, #4E6180, 16px padding
  - User row: avatar 32px + "Hiten Patel" Inter Medium 14px #F0F4F8 + "Athlete" tiny badge #0077FF, chevron-down, 16px padding, #152035 top border

  Main content (right of sidebar, #060B14 bg, 32px padding):

  Top bar:
  - Breadcrumb: "Home" Inter Regular 14px #4E6180
  - Right: search icon + "⌘K" badge (#1A2340 bg, Inter Mono 12px #4E6180), bell icon with #0077FF dot badge

  Two-column grid (60% left, 40% right, 24px gap):

  LEFT COLUMN:
  - Greeting: "Good morning, Hiten" Clash Display Semibold 28px #F0F4F8 + "Thursday, 20 March 2026" Inter Regular 14px #8899B4

  - Today's Program card (#0F1629, 12px radius, 20px padding, 24px below):
    - "Today's Workout" Inter Medium 12px #8899B4
    - "Push Day A" Clash Display Medium 18px #F0F4F8
    - Muscle pills: "Chest" "Shoulders" "Triceps" (#0077FF20 bg, #0077FF text)
    - "Start Workout" button #0077FF, 36px height, right side

  - Recent Activity (24px below):
    - "Recent Activity" Clash Display Medium 18px #F0F4F8 + "See All" #0077FF link right
    - 5 activity rows, compact table-like, #0F1629 bg, 12px radius:
      - Each: icon (dumbbell/running) | name | detail | time ago | PR star if applicable
      - Alternating subtle backgrounds (#0F1629 / #0F162980)

  RIGHT COLUMN:
  - Streak card (#0F1629, 12px radius, 20px padding):
    - Flame icon #FF6B2C + "12 Day Streak" Clash Display Medium 18px
    - 7-day dot row below

  - Weekly Summary (#0F1629, 20px padding, 16px below):
    - 2×2 stat grid: "3 Workouts" / "2 Cardio" / "14.2k kg Volume" / "42 km Distance"
    - Week bar M-S below

  - Feed Preview (#0F1629, 20px padding, 16px below):
    - "From Your Network" header + "See All"
    - 2 compact feed items (avatar + name + brief activity text)
```

---

### Task 35: Web — Workout List

- [ ] **Step 1: Generate web workout list**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Workouts List — table view with sidebar (1440px)

  Sidebar: same as dashboard but "Workouts" nav item is active (#0077FF text, #0077FF10 bg, blue left border)

  Main content (32px padding):
  - Top bar: breadcrumb "Home / Workouts"
  - Header row: "Workouts" Clash Display Semibold 28px #F0F4F8 left, "New Workout" button #0077FF (plus icon + text) right

  Filter bar (16px below):
  - Date range picker: #1A2340, #1E2B47 border, "Last 30 days" with calendar icon, chevron
  - Search input: magnifying glass, placeholder "Search workouts", same dark style
  - Both inline, 12px gap

  Table (#0F1629 bg, 12px radius, 24px below):
  - Header row: DATE | NAME | DURATION | EXERCISES | VOLUME | PRS — Inter Medium 12px #4E6180 uppercase, #152035 bottom border
  - Data rows (48px height, #152035 bottom border, hover: #1A2340 bg):
    - "20 Mar 2026" | "Push Day A" Inter Semibold | "48 min" | "5" | "14,200 kg" | gold star "2"
    - "18 Mar 2026" | "Pull Day B" | "52 min" | "6" | "15,800 kg" | "—"
    - "15 Mar 2026" | "Push Day A" | "45 min" | "5" | "13,900 kg" | "—"
    - "13 Mar 2026" | "Leg Day" | "55 min" | "6" | "22,400 kg" | star "1"
    - "11 Mar 2026" | "Pull Day A" | "50 min" | "5" | "14,200 kg" | "—"
    - "10 Mar 2026" | "Upper Body" | "40 min" | "4" | "10,500 kg" | "—"
    - "8 Mar 2026" | "Push Day A" | "47 min" | "5" | "14,000 kg" | star "1"
  - All data: Inter Regular 14px #F0F4F8, PR column: #FFD700 star + count

  Pagination (below table, right-aligned):
  - "Showing 1-7 of 48" Inter Regular 12px #4E6180
  - Page buttons: 1 (active #0077FF bg), 2, 3, ... 7, next arrow
```

---

### Task 36: Web — Workout Detail

- [ ] **Step 1: Generate web workout detail**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Workout Detail — "Push Day A" (1440px, with sidebar)

  Sidebar: Workouts active

  Main content (32px padding):
  - Breadcrumb: "Home / Workouts / Push Day A"

  Header:
  - "Push Day A" Clash Display Semibold 28px #F0F4F8
  - Stat pills row (12px below): "20 Mar 2026" (calendar icon), "48 min" (clock), "14,200 kg" (dumbbell), "2 PRs" (#FFD700 star, gold tint bg) — pills: #1A2340 bg, 24px radius, Inter Medium 12px, 8px gap
  - Action buttons right-aligned: "Share" outlined button (share icon), "Save as Template" outlined (copy icon), "..." overflow menu

  Exercise cards (24px below, max-width 900px, 16px gap):

  Card 1 — Bench Press (#0F1629, 12px radius, 20px padding):
  - "Bench Press" Clash Display Medium 18px #F0F4F8 + "Chest" badge + "Triceps" secondary badge
  - Table:
    - SET | WEIGHT | REPS | RPE | 1RM EST | TYPE
    - Headers: Inter Medium 12px #4E6180
    - Row 1: 1 | 60 kg | 10 | 7 | 80 kg | Working
    - Row 2: 2 | 80 kg | 8 | 8 | 101 kg | Working
    - Row 3: 3 | 85 kg | 8 | 9 | 107 kg | Working — #FFD700 left border, "PR" badge in last column
    - Row 4: W | 40 kg | 12 | — | — | Warmup (W badge #243052)
    - Rows Inter Regular 14px #F0F4F8, alternating row backgrounds

  Card 2 — Overhead Press:
  - "Overhead Press" + "Shoulders" badge
  - Similar table with PR on row 2

  Card 3 — Incline Dumbbell Press (partially visible):
  - Header + first rows showing

  Workout notes section at bottom: "Notes" header, "Felt strong today, bench PR felt smooth" in #8899B4 italic
```

---

### Task 37: Web — Active Workout (New Workout)

- [ ] **Step 1: Generate web active workout**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Active Workout — two-panel layout, mid-session (1440px with sidebar)

  Sidebar: Workouts active

  Main content — two-panel layout:

  LEFT PANEL (65%, 24px padding):
  - Top: "Push Day A" Clash Display Semibold 22px #F0F4F8 + elapsed timer "32:15" Inter Semibold 16px #8899B4 right

  Exercise cards (16px gap):

  Exercise 1 — Bench Press (completed):
  - #0F1629, 12px radius, 20px padding
  - Header: grip handle icon #4E6180 (drag), "Bench Press" Clash Display Medium 16px, "Chest" badge, "..." menu right
  - Editable set table:
    - SET | PREVIOUS | KG | REPS | ✓
    - Row 1: 1 | "60 × 10" #4E6180 | input "60" | input "10" | green check ✓ — #10B981 left border
    - Row 2: 2 | "80 × 8" | "80" | "8" | green ✓
    - Row 3: 3 | "80 × 8" | "85" | "8" | green ✓ + "PR" gold badge — #FFD700 left border
    - Inputs: #1A2340 bg, 36px height, 60px width, centered text, #1E2B47 border
    - "+ Add Set" #0077FF text button below

  Exercise 2 — Overhead Press (in progress):
  - Same card style, "Shoulders" badge
  - Row 1: completed green ✓
  - Row 2: active — input fields empty/editable, empty circle checkbox
  - Row 3: future — dashed, empty

  Exercise 3 — Lateral Raises (connected by superset bar):
  - Vertical #0077FF bar (3px) connecting Exercise 2 and 3 on left margin
  - "Lateral Raises" + "Shoulders" badge
  - All rows empty/future

  RIGHT PANEL (35%, #0F1629 bg, full height, 20px padding):
  - Sticky sidebar

  Elapsed Timer:
  - "32:15" Clash Display Bold 32px #F0F4F8 centered
  - "Elapsed" Inter Medium 12px #8899B4

  Rest Timer (24px below):
  - Circular progress ring (120px diameter), #0077FF, ~65% complete
  - "1:32" inside ring, Clash Display Semibold 24px #F0F4F8
  - "Skip" button below ring, Inter Medium 14px #8899B4

  Quick Stats (24px below):
  - "15 / 24" + "Sets" (#0F1629 mini card)
  - "8,400 kg" + "Volume"

  "Add Exercise" button: full width, outlined, #1E2B47 border, Inter Semibold 14px #F0F4F8, plus icon, 24px below

  "Finish Workout" button: full width, #0077FF, white text, 16px below
```

---

## Chunk 8: Web — Cardio, Templates, Program, Stats

### Task 38: Web — Cardio List

- [ ] **Step 1: Generate web cardio list**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Cardio List — table with sidebar (1440px)

  Sidebar: Cardio active

  Main content:
  - "Cardio" Clash Display Semibold 28px + "New Session" #0077FF button right
  - Filter bar: date range + search

  Table (#0F1629, 12px radius):
  - DATE | TYPE | DISTANCE | DURATION | AVG PACE | ELEVATION
  - Rows:
    - "20 Mar" | running icon + "Run" | "5.24 km" | "28:34" | "5:28/km" | "48m"
    - "18 Mar" | bike icon + "Cycle" | "22.4 km" | "52:10" | "2:20/km" | "124m"
    - "16 Mar" | running icon + "Run" | "5.00 km" | "24:12" | "4:50/km" | "22m"
    - "15 Mar" | mountain icon + "Hike" | "8.3 km" | "1:42:00" | "12:17/km" | "340m"
    - "12 Mar" | running icon + "Run" | "8.1 km" | "42:30" | "5:15/km" | "35m"
  - Type icons colored: running #10B981, bike #0077FF, hike #F59E0B
  - Hover shows route map tooltip (small)
```

---

### Task 39: Web — Cardio Detail

- [ ] **Step 1: Generate web cardio detail**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Cardio Detail — Run, 5.24km (1440px with sidebar)

  Sidebar: Cardio active
  Breadcrumb: "Home / Cardio / Morning Run"

  Route map (full content width, 400px height, 12px radius):
  - Dark map tiles (dark gray/navy style)
  - Route line in #0077FF, 4px width
  - Start marker green #10B981, finish marker red #EF4444

  Stats grid (24px below, 3×2 grid, 16px gap):
  6 stat cards, each #0F1629, 12px radius, 20px padding:
  - "5.24 km" Inter Semibold 28px #F0F4F8 + "Distance" Inter Medium 12px #8899B4 + ruler icon #4E6180
  - "28:34" + "Duration" + clock icon
  - "5:28 /km" + "Avg Pace" + gauge icon
  - "4:52 /km" + "Best Pace" + zap icon
  - "48 m" + "Elevation" + mountain icon
  - "312" + "Calories" + flame icon

  Lap Splits table (24px below, #0F1629, 12px radius):
  - "Lap Splits" Clash Display Medium 18px above table
  - LAP | DISTANCE | PACE | CUMULATIVE — headers #4E6180
  - 6 rows with striped backgrounds (#0F1629 / #1A234080):
    - 1 | 1.00 km | 5:22 /km | 5:22
    - 2 | 1.00 km | 5:31 /km | 10:53
    - 3 | 1.00 km | 5:18 /km | 16:11
    - 4 | 1.00 km | 5:42 /km | 21:53
    - 5 | 1.00 km | 5:25 /km | 27:18
    - 6 | 0.24 km | 5:10 /km | 28:34

  "Share" outlined button, right-aligned below table
```

---

### Task 40: Web — New Cardio Entry

- [ ] **Step 1: Generate web new cardio page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web New Cardio — form + GPX import (1440px with sidebar)

  Sidebar: Cardio active
  Breadcrumb: "Home / Cardio / New Session"
  Header: "Log Cardio" Clash Display Semibold 28px

  Two-column layout (max-width 900px):

  LEFT (60%):
  Activity type grid (2×4, 12px gap):
  - 8 square cards, ~80px each, #0F1629, #1E2B47 border, 8px radius
  - Icon 24px + label 12px below
  - "Run" selected: #0077FF border, #0077FF10 bg
  - Others: Run, Cycle, Swim, Hike, Walk, Row, Elliptical, Other

  Form below (16px gap between fields):
  - Distance: label + input "0.0" + "km" suffix
  - Duration: HH:MM:SS triple input
  - Date: date picker showing "20 Mar 2026"
  - Avg Heart Rate: optional, "bpm" suffix
  - Elevation: optional, "m" suffix
  - Notes: textarea 3 lines
  - "Save" #0077FF button, full width

  RIGHT (40%):
  GPX/FIT Import card (#0F1629, 12px radius, 20px padding):
  - Dashed #1E2B47 border drop zone, 200px height
  - Upload icon 48px #4E6180 centered
  - "Drag & drop GPX or FIT file" Inter Regular 14px #8899B4
  - "or browse" #0077FF link
  - After upload would show: route map preview + auto-populated fields
```

---

### Task 41: Web — Templates

- [ ] **Step 1: Generate web template library**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Template Library — grid view (1440px with sidebar)

  Sidebar: Templates active

  Main content:
  - "Templates" Clash Display Semibold 28px + "New Template" button #0077FF right
  - Search bar + muscle group filter pills below (16px gap)

  3-column card grid (24px gap):

  Card 1 (#0F1629, 12px radius, 20px padding):
  - "Push Day A" Clash Display Medium 18px #F0F4F8
  - "5 exercises" Inter Regular 12px #8899B4
  - Muscle pills: "Chest" "Shoulders" "Triceps" small badges
  - "Last used 2 days ago" Inter Regular 12px #4E6180
  - Hover: #1A2340 bg, subtle transition

  Card 2: "Pull Day A" — 5 exercises — "Back" "Biceps"
  Card 3: "Leg Day" — 6 exercises — "Quads" "Hamstrings" "Glutes"
  Card 4: "Push Day B" — 5 exercises — "Chest" "Shoulders" "Triceps"
  Card 5: "Pull Day B" — 6 exercises — "Back" "Biceps" "Rear Delts"
  Card 6: "Upper Body" — 4 exercises — "Chest" "Back" "Shoulders"
  Card 7: "Full Body" — 6 exercises — "Chest" "Back" "Legs" "Shoulders"
  Card 8: empty "+" card with dashed border, "Create Template" centered text #4E6180
```

---

### Task 42: Web — My Program

- [ ] **Step 1: Generate web program schedule**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web My Program — weekly schedule grid (1440px with sidebar)

  Sidebar: My Program active

  Main content:
  - "My Program" Clash Display Semibold 28px
  - Adherence bar: "78% this week" Inter Semibold 14px #F0F4F8 + progress bar (300px wide, 8px height, #0077FF fill at 78%, #1E2B47 track, 4px radius)

  Weekly grid (7 columns, equal width, 16px gap, 24px below):

  Column headers: MON | TUE | WED | THU | FRI | SAT | SUN — Inter Medium 12px #4E6180 centered

  Day cells (each ~160px wide, min-height 120px, #0F1629, 12px radius, 16px padding):

  MON: "Push Day A" Inter Semibold 14px #F0F4F8, pills "Chest" "Shoulders", green checkmark badge ✓ #10B981, "Done" #10B981 text — completed state
  TUE: "Pull Day A", "Back" "Biceps", green ✓, "Done"
  WED: "Leg Day", "Quads" "Hamstrings", green ✓, "Done"
  THU: "Rest Day" Inter Regular 14px #4E6180, no template, muted appearance — rest day
  FRI: "Push Day B", "Chest" "Shoulders", #F59E0B ✕ "Missed" — missed state, amber warning
  SAT (today): "Pull Day B", "Back" "Biceps", #0077FF border, "Today" pill badge #0077FF, "Start Workout" small #0077FF button — today state, highlighted
  SUN: "Rest Day" — upcoming, neutral, no status
```

---

### Task 43: Web — Stats Page

- [ ] **Step 1: Generate web stats dashboard**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Stats — full analytics dashboard (1440px with sidebar)

  Sidebar: Stats active

  Main content (32px padding):
  - "Stats" Clash Display Semibold 28px

  Two-column responsive grid (24px gap):

  1. Training Status (FULL WIDTH, #0F1629, 12px radius, 20px padding):
  - Left: "Training Status" Inter Semibold 14px #8899B4 + "Optimal" pill #10B981
  - Right: 7d | 30d | 90d toggle pills (30d active #0077FF)
  - Chart (200px height): TSB line chart — smooth line #0077FF with #0077FF10 area fill, zero line dashed. Mostly positive territory. Hover tooltip showing date + value.
  - Below chart: 3 stat cards inline:
    - "62" Fitness (CTL) ↑ green
    - "55" Fatigue (ATL) ↓ green
    - "+7" Form (TSB) #10B981

  2. Training Load (FULL WIDTH, #0F1629, 12px radius, 20px padding):
  - Dual-line chart (250px height): CTL line #0077FF (fitness, rising), ATL line #EF4444 (fatigue, variable). Shaded area between in gradient. X-axis: dates. Y-axis: values. Legend below: blue dot "Fitness (CTL)" + red dot "Fatigue (ATL)"

  3. Weekly Volume (LEFT COLUMN, #0F1629, 12px radius, 20px padding):
  - Stacked bar chart (200px), 7 bars Mon-Sun, segments colored:
    - Chest #0077FF, Back #10B981, Shoulders #F59E0B, Arms #8B5CF6, Legs #EF4444
  - Legend below with colored dots + labels
  - Hover shows segment breakdown tooltip

  4. Muscle Heatmap (RIGHT COLUMN, #0F1629, 12px radius, 20px padding):
  - "Muscle Volume" header + Front/Back toggle
  - Body silhouette (200px), front view
  - Muscles colored: chest/shoulders = hot red-orange, legs = warm yellow-green, arms = cool blue
  - Hover shows muscle name + volume

  5. Workout Frequency (LEFT COLUMN, #0F1629):
  - "This Week vs Last Week" comparison
  - Two horizontal bars side by side: this week 4 (blue), last week 3 (gray #243052)

  6. Body Weight (RIGHT COLUMN, #0F1629):
  - Line chart: 30-day trend, slight downward slope 78→75.5 kg, dots on data points
  - Inline log: weight input + "Log" button below chart
  - 30d | 90d | 1y toggles
```

---

## Chunk 9: Web — Exercises, Social, Messages

### Task 44: Web — Exercise Library

- [ ] **Step 1: Generate web exercise library**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Exercise Library — list with detail panel (1440px with sidebar)

  Sidebar: Exercises active

  Main content — split view:

  LEFT LIST (40%, scrollable):
  - "Exercises" Clash Display Semibold 28px
  - Search: full width, magnifying glass, #1A2340
  - Filter pills: All (active), Favorites, Chest, Back, Shoulders, Legs, Arms, Core
  - Exercise list (48px rows, #152035 dividers):
    - "Barbell Row" Inter Semibold 14px + "Back" tiny badge #10B981
    - "Bench Press" + "Chest" badge #0077FF + heart filled #EF4444 — SELECTED: #1A2340 bg, #0077FF left border 2px
    - "Bulgarian Split Squat" + "Legs" badge #EF4444
    - "Cable Fly" + "Chest"
    - "Calf Raise" + "Legs"
    - "Deadlift" + "Back" + "Legs" secondary
    - More items below...

  RIGHT DETAIL PANEL (60%, #0F1629 bg, 12px left border-radius, 24px padding):
  - Selected: Bench Press
  - "Bench Press" Clash Display Semibold 22px #F0F4F8
  - Badges: "Chest" primary, "Triceps" "Shoulders" secondary
  - PR cards (2×2 grid, 12px gap):
    - "1RM: 85 kg" #FFD700, "3RM: 80 kg", "5RM: 72.5 kg", "Vol: 4,800 kg"

  - "Progression" chart (150px height): 1RM estimate over time, upward trend, #0077FF line

  - "History" section below:
    - Table: DATE | WORKOUT | SETS | BEST SET
    - "20 Mar" | "Push Day A" | "4 sets" | "85×8 (PR)" gold
    - "15 Mar" | "Push Day A" | "4 sets" | "82.5×8"
    - "11 Mar" | "Upper Body" | "3 sets" | "80×8"
```

---

### Task 45: Web — Activity Feed

- [ ] **Step 1: Generate web feed**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Activity Feed — centered single column (1440px with sidebar)

  Sidebar: Feed active

  Main content (centered, max-width 640px):
  - "Feed" Clash Display Semibold 28px

  Feed cards (16px gap):

  Card 1 — Workout (#0F1629, 12px radius, 20px padding):
  - Header: avatar 44px + "Sarah Chen" Inter Semibold 14px + "2h ago" #4E6180 + dumbbell icon #0077FF
  - Content: "Completed Push Day A" Inter Regular 14px #F0F4F8
  - Exercise list: "6 exercises · 15,200 kg total volume" #8899B4
  - Detail: "Bench Press 4×8 · OHP 3×10 · Incline DB 3×10 · Cable Fly 3×12 · Lat Raise 3×15 · Tricep PD 3×12" Inter Regular 12px #8899B4
  - Reactions: fist-bump 3 (#0077FF), fire 1 (#FF6B2C), muscle 2 (#10B981) — icon + count, 12px gap

  Card 2 — PR (gold accent, #FFD700 top border 2px):
  - Avatar + "Mike Torres" + "5h ago" + star #FFD700
  - "New Personal Record!" Inter Semibold 16px #FFD700
  - "Deadlift 1RM: 180 kg" Clash Display Medium 22px #F0F4F8
  - "Previous: 175 kg" #4E6180
  - Reactions: fist 8, fire 5, muscle 12

  Card 3 — Cardio:
  - Avatar + "Alex Kim" + "Yesterday" + running icon #10B981
  - "Ran 10.0 km in 48:22" Inter Regular 14px
  - Route map (full card width, 120px height, dark tiles, #0077FF route, 8px radius)
  - Reactions: fist 2, fire 1
```

---

### Task 46: Web — Messages

- [ ] **Step 1: Generate web messages**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Messages — two-panel chat layout (1440px with sidebar)

  Sidebar: Messages active (with "2" badge)

  Main content — two-panel, full height (no top padding):

  LEFT PANEL (320px, #0A0F1A bg, #152035 right border):
  - Search bar at top, 16px padding, #1A2340, magnifying glass
  - Conversation list:
    - Row 1 (unread, #1A2340 bg): avatar 44px, "Coach Mike" Inter Semibold, "10:32" #4E6180, preview "Great session today!..." #8899B4, unread badge "2" #0077FF circle
    - Row 2 (unread): "Sarah Chen", "Yesterday", "Nice PR on bench!...", badge "1"
    - Row 3 (read, #0A0F1A bg): "Alex Kim", "Mon", "Thanks for the template..."
    - Row 4: "Emma Wilson", "12 Mar", "Can we move Thursday's..."
    - #152035 dividers between

  RIGHT PANEL (remaining width, #060B14 bg):
  - Header: #0F1629 bg, 16px padding, #152035 bottom border. Avatar 36px + "Coach Mike" Inter Semibold 16px + "Online" green dot #10B981 + Inter Regular 12px #10B981

  Chat area (16px padding, scrollable):
  - "Today" timestamp centered, Inter Medium 12px #4E6180

  Received (left): #0F1629 bubble, 12px radius, max-width 65%, 12px padding
  - "Hey Hiten, great session today! I noticed your bench press is really progressing." #F0F4F8
  - "10:30" #4E6180 below

  Received: "Let's adjust your program next week — I want to add an extra chest day since you're recovering well."

  Sent (right): #0077FF bubble, 12px radius
  - "Thanks Coach! Yeah the 85kg felt solid today. Happy to add more volume." white text
  - "10:32" #FFFFFF80

  Sent: "Should I keep the RPE the same or push a bit harder?"

  Received: "Keep RPE 8 for now. We'll reassess after next week. Rest up!"

  Input bar (bottom, #0F1629 bg, #152035 top border, 16px padding):
  - Text input: #1A2340 bg, 44px height, 22px pill radius, placeholder "Type a message..."
  - Send button: #0077FF circle 36px, arrow-up icon white
```

---

### Task 47: Web — User Profile & Discover Coaches

- [ ] **Step 1: Generate user profile page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web User Profile — viewing another user "Sarah Chen" (1440px with sidebar)

  Sidebar: no item highlighted (deep link)

  Main content (max-width 800px, centered):
  - Header: avatar 96px, "Sarah Chen" Clash Display Semibold 28px, "Competitive powerlifter | London" Inter Regular 14px #8899B4
  - Stats row: "342 Workouts" · "156 Following" · "1.2k Followers" — Inter Regular 14px #8899B4, numbers in #F0F4F8 Semibold
  - Action buttons: "Following" outlined button (#0077FF border, #0077FF text, check icon) + "Message" outlined (#1E2B47 border)

  Activity feed below (same card pattern as main feed, showing Sarah's recent activity):
  - Card 1: workout post
  - Card 2: PR post with gold accent
  - Card 3: cardio post with route map
```

---

## Chunk 10: Web — Coaching & Program Builder

### Task 48: Web — Coach Dashboard

- [ ] **Step 1: Generate coach dashboard**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Coach Dashboard — overview (1440px with sidebar)

  Sidebar: shows coach section, "Clients" in COACH group active

  Main content:
  - "Coach Dashboard" Clash Display Semibold 28px

  Overview cards (3 inline, 16px gap):
  - Card 1: #0F1629, 12px radius, 20px padding. "5" Clash Display Bold 32px #F0F4F8 + "Total Clients" Inter Medium 12px #8899B4 + users icon #0077FF
  - Card 2: "4" + "Active This Week" + activity icon #10B981
  - Card 3: "76%" + "Avg Adherence" + target icon #F59E0B

  Attention section (24px below):
  - "Needs Attention" Clash Display Medium 18px #F0F4F8
  - Alert cards (#0F1629, 12px radius, 16px padding, #F59E0B left border 3px):
    - Avatar 36px + "Lisa Nguyen" Inter Semibold + "Missed 3 sessions this week · 45% adherence" #F59E0B + "View" link #0077FF
    - Avatar + "Rachel Adams" + "No program assigned · Last active 1 week ago" #EF4444 + "View"
```

---

### Task 49: Web — Coach Client List & Detail

- [ ] **Step 1: Generate client list table**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Coach Client List — table view (1440px with sidebar)

  Sidebar: Clients active in COACH section

  Main content:
  - "Clients" Clash Display Semibold 28px + "Add Client" button outlined (user-plus icon) right
  - Search bar below

  Table (#0F1629, 12px radius):
  - Headers: CLIENT | PROGRAM | ADHERENCE | LAST ACTIVE | STATUS
  - Rows (hover #1A2340):
    - Avatar 32px + "Emma Wilson" | "Push/Pull/Legs" | "85%" progress bar (small, #0077FF) | "2h ago" | green dot "Active"
    - "James Park" | "Upper/Lower" | "72%" bar | "5h ago" | green "Active"
    - "Lisa Nguyen" | "Full Body" | "45%" bar (#F59E0B color, low) | "3 days" | gray "Inactive"
    - "Tom Richards" | "Strength Focus" | "91%" bar #10B981 | "Today" | green
    - "Rachel Adams" | "—" #4E6180 | "—" | "1 week" | gray dot #EF4444 text

  Columns sortable (arrow indicators on headers).
```

---

### Task 50: Web — Program Builder

- [ ] **Step 1: Generate program builder**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Program Builder — drag-and-drop schedule (1440px with sidebar)

  Sidebar: Programs active in COACH section

  Main content:
  - Header: "Push/Pull/Legs" (editable, with pencil icon on hover) Clash Display Semibold 28px
  - "4 weeks" duration badge + "Assign to Client" #0077FF button right

  Two-panel layout:

  LEFT (75%):
  Weekly grid — 7 columns (MON-SUN) × 2 visible weeks (rows):

  Week 1 row label: "Week 1" Inter Semibold 14px #8899B4

  Day cells (each #0F1629, 12px radius, min-height 80px, 8px gap):
  - MON: "Push Day A" Inter Semibold 12px #F0F4F8, "Chest Shoulders" tiny pills, "×" remove on hover (#EF4444)
  - TUE: "Pull Day A", "Back Biceps"
  - WED: "Leg Day", "Quads Hamstrings"
  - THU: "Rest" Inter Regular 12px #4E6180, empty feel, dashed border
  - FRI: "Push Day B", "Chest Shoulders"
  - SAT: "Pull Day B", "Back Biceps"
  - SUN: "Rest"

  Week 2 row: same pattern (showing this is a repeating schedule)

  Drop zone indicators: cells with dashed #1E2B47 borders when empty

  RIGHT PANEL (25%, #0F1629 bg, 20px padding, scrollable):
  - "Templates" Clash Display Medium 16px
  - Search input compact
  - Draggable template items (cursor: grab):
    - "Push Day A" Inter Medium 14px #F0F4F8, grip dots icon left, "Chest" pill
    - "Pull Day A" + "Back"
    - "Leg Day" + "Legs"
    - "Push Day B" + "Chest"
    - "Pull Day B" + "Back"
    - "Upper Body" + "Chest Back"
    - "Full Body" + multi pills

  Auto-save indicator: "Saved" #10B981 with check, top right of header, Inter Regular 12px
```

---

## Chunk 11: Web — Tools, Profile, Settings

### Task 51: Web — 1RM Calculator

- [ ] **Step 1: Generate 1RM calculator**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web 1RM Calculator — tool page (1440px with sidebar)

  Sidebar: 1RM Calculator active in TOOLS

  Main content (centered, max-width 600px):
  - "1RM Calculator" Clash Display Semibold 28px

  Input card (#0F1629, 12px radius, 24px padding):
  - Two inputs side by side (16px gap):
    - "Weight lifted" label + input "80" + "kg" suffix (large, 56px height, Clash Display Semibold 24px)
    - "Reps performed" label + input "8" (same large style)

  Result card (24px below, #0F1629, 12px radius, 24px padding, #0077FF top border 3px):
  - "Estimated 1RM" Inter Medium 14px #8899B4 centered
  - "101 kg" Clash Display Bold 48px #0077FF centered
  - Formula comparison row (16px below):
    - "Epley: 101 kg" | "Brzycki: 99 kg" | "Lander: 100 kg" — Inter Regular 14px #8899B4, evenly spaced

  Training percentages table (24px below, #0F1629, 12px radius):
  - "Training Percentages" header
  - Two-column table:
    - % OF 1RM | WEIGHT
    - 100% | 101 kg
    - 95% | 96 kg
    - 90% | 91 kg
    - 85% | 86 kg
    - 80% | 81 kg
    - 75% | 76 kg
    - 70% | 71 kg
    - 65% | 66 kg
    - 60% | 61 kg
    - 55% | 56 kg
    - 50% | 51 kg
  - Alternating row backgrounds, Inter Regular 14px #F0F4F8, % column #8899B4
```

---

### Task 52: Web — Plate Calculator

- [ ] **Step 1: Generate plate calculator**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Plate Calculator — tool page (1440px with sidebar)

  Sidebar: Plate Calculator active

  Main content (centered, max-width 700px):
  - "Plate Calculator" Clash Display Semibold 28px

  Input section (#0F1629, 12px radius, 24px padding):
  - "Target Weight" label + input "100" + "kg" suffix (large, 56px height)
  - "Bar Weight" label + input "20" + "kg" (smaller, 44px) — 16px below
  - "Available Plates" (16px below): toggle pills for each plate weight:
    - 25kg (on, #EF4444 bg), 20kg (on, #0077FF bg), 15kg (on, #F59E0B bg), 10kg (on, #10B981 bg), 5kg (on, white bg dark text), 2.5kg (on, #8899B4), 1.25kg (on, #4E6180)
    - Toggle each on/off

  Visual barbell diagram (32px below, centered, full width):
  - Horizontal barbell illustration:
    - Gray bar (#4E6180) in center, 300px wide
    - Left side (plates, stacked from bar outward): 25kg red plate (#EF4444, wider), 15kg yellow (#F59E0B, medium width)
    - Right side: mirror image
    - Plates shown as rounded rectangles with weight labels inside
  - "40 kg per side" Inter Medium 14px #8899B4 centered below

  Plate breakdown (#0F1629, 12px radius, 16px padding, 16px below):
  - "Per Side" header
  - "1 × 25 kg" Inter Regular 14px + red dot
  - "1 × 15 kg" + yellow dot
  - Total: "Bar (20 kg) + 2 × 40 kg = 100 kg" Inter Semibold 14px #F0F4F8
```

---

### Task 53: Web — Profile Page

- [ ] **Step 1: Generate web profile**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Profile — edit profile page (1440px with sidebar)

  Sidebar: no item active (accessed via user menu)
  Breadcrumb: "Home / Profile"

  Main content (max-width 800px):
  - "Profile" Clash Display Semibold 28px

  Two-column layout (24px gap):

  LEFT (50%):
  - Avatar section: 96px avatar circle with camera overlay icon on hover (#060B14 at 50% bg, camera icon white), "Change Photo" #0077FF link below
  - "Full Name" label + input "Hiten Patel" (44px, standard dark style)
  - "Email" label + input "hiten@example.com" + "Change" #0077FF link right
  - "Bio" label + textarea (3 lines) "Fitness enthusiast | Push/Pull/Legs"
  - "Save Changes" #0077FF button, 24px below

  RIGHT (50%):
  - "Account Stats" card (#0F1629, 12px radius, 20px padding):
    - "Member since" Inter Regular 12px #4E6180 + "January 2025" #F0F4F8
    - "Total Workouts" + "248"
    - "Total Cardio" + "89"
    - "Personal Records" + "42" (#FFD700)
    - "Current Streak" + flame "12 days" (#FF6B2C)
    - Each row with #152035 divider

  - "Export Data" outlined button below card (download icon + "Export Data")
```

---

### Task 54: Web — Settings Page

- [ ] **Step 1: Generate web settings**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Settings — grouped settings (1440px with sidebar)

  Sidebar: accessed via gear icon
  Breadcrumb: "Home / Settings"

  Main content (max-width 700px):
  - "Settings" Clash Display Semibold 28px

  Settings groups (16px gap between cards):

  "General" card (#0F1629, 12px radius, 20px padding):
  - "Units" row: label left + "Metric" / "Imperial" segmented control right (Metric active #0077FF)
  - "Default Rest Timer" row: label + input "90" + "seconds"
  - "Theme" row: label + 3 radio buttons "Dark" (selected, #0077FF) / "Light" / "System"
  - Rows separated by #152035 dividers, 48px height each

  "Notifications" card:
  - "Workout Reminders" + toggle (on, #0077FF)
  - "Social Activity" + toggle (on)
  - "Coach Messages" + toggle (on)
  - "PR Achievements" + toggle (on)
  - "Weekly Summary" + toggle (off, #1E2B47)

  "Privacy" card:
  - "Profile Visibility" + "Public" / "Followers Only" / "Private" radio (Public selected)
  - "Show in Activity Feed" + toggle (on)

  "Danger Zone" card (#0F1629, #EF4444 top border 2px):
  - "Delete Account" #EF4444 text + "Permanently delete your account and all data" #8899B4 + "Delete" outlined #EF4444 button right
```

---

### Task 55: Web — Integrations & Import

- [ ] **Step 1: Generate web integrations**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Settings — Integrations page (1440px with sidebar)

  Breadcrumb: "Home / Settings / Integrations"
  Header: "Integrations" Clash Display Semibold 28px

  Content (max-width 700px):

  Integration cards (16px gap):

  Strava card (#0F1629, 12px radius, 20px padding):
  - Left: Strava logo (orange square), "Strava" Inter Semibold 16px
  - "Connected" badge #10B981 + "Last synced 2h ago" #8899B4
  - "Auto-import new activities" toggle (on)
  - "Disconnect" #EF4444 text link, right-aligned

  Garmin card:
  - Garmin logo, "Garmin Connect" Inter Semibold
  - "Not connected" #4E6180
  - "Connect" #0077FF button right

  API Keys card (#0F1629):
  - "API Keys" header + "For self-hosted integrations" #8899B4
  - Key table: KEY | CREATED | —
    - "sk-iron-...a4f2" | "15 Mar 2026" | "Revoke" #EF4444 link
  - "Generate New Key" #0077FF outlined button below
```

---

## Chunk 12: Web — Share Pages, Calendar, Subscription

### Task 56: Web — Shared Workout Page

- [ ] **Step 1: Generate shared workout public page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Shared Workout — public page, no sidebar (1440px)

  Dark background #060B14, no sidebar, no app chrome.

  Centered card (max-width 640px, #0F1629, 12px radius, 32px padding):

  - IronPulse logo + wordmark at top, small, centered, #8899B4

  - User: avatar 48px + "Hiten Patel" Inter Semibold 16px #F0F4F8, 16px below logo

  - "Push Day A" Clash Display Semibold 22px #F0F4F8
  - Stat row: "20 Mar 2026" · "48 min" · "14,200 kg" · "2 PRs" — pills

  Exercise summaries (compact):
  - "Bench Press" Inter Semibold 14px + "4 sets · 60-85 kg · PR: 85×8" #8899B4 — PR text in #FFD700
  - "Overhead Press" + "3 sets · 40-50 kg · PR: 50×8" #FFD700
  - "Incline DB Press" + "3 sets · 24-30 kg"
  - "Cable Fly" + "3 sets · 15 kg"
  - "Lateral Raises" + "3 sets · 10-12 kg"

  PR highlight cards (16px below, gold accent):
  - Mini PR cards: "Bench Press 1RM: 85 kg" + "Overhead Press 3RM: 50 kg" — #FFD700 left border

  CTA section (24px below, centered):
  - "Track your workouts with IronPulse" Inter Regular 16px #8899B4
  - "Get Started Free" #0077FF button, 44px
```

---

### Task 57: Web — Shared PR Page

- [ ] **Step 1: Generate shared PR public page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Shared PR — celebratory public page, no sidebar (1440px)

  Dark background #060B14 with subtle #FFD700 radial gradient at 5% from center (golden glow).

  Centered card (max-width 500px, #0F1629, 12px radius, 40px padding, #FFD700 border 1px):

  - Trophy icon 48px #FFD700 centered at top
  - "New Personal Record!" Clash Display Bold 28px #FFD700 centered
  - 16px spacer

  - "Bench Press" Clash Display Semibold 22px #F0F4F8 centered
  - "1RM" Inter Medium 14px #8899B4 centered

  - "85 kg" Clash Display Bold 56px #FFD700 centered (the star of the show)
  - "Previous: 82.5 kg" Inter Regular 14px #4E6180 centered

  - Divider #152035, 24px margin

  - User row centered: avatar 40px + "Hiten Patel" Inter Semibold 14px #F0F4F8
  - "20 March 2026" Inter Regular 12px #4E6180

  - IronPulse logo small at bottom, 24px below
  - "Track your PRs with IronPulse" Inter Regular 14px #8899B4
  - "Get Started" #0077FF button
```

---

### Task 58: Web — Calendar

- [ ] **Step 1: Generate web calendar**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Calendar — month view (1440px with sidebar)

  Sidebar: Calendar active

  Main content:
  - Header: left-arrow, "March 2026" Clash Display Semibold 28px, right-arrow
  - "Today" button outlined (#1E2B47 border) right of header

  Calendar grid (full width, 7 columns):
  - Day headers: MON TUE WED THU FRI SAT SUN — Inter Medium 12px #4E6180

  Day cells (each ~160px wide, ~100px tall, #0F1629 bg, #152035 borders):
  - Date number top-left: Inter Regular 14px #F0F4F8 (current month) or #4E6180 (overflow)
  - Today (20th): number in #0077FF bg circle
  - Activity indicators inside cells:
    - Workout days: small card "Push Day A" with dumbbell icon, Inter Regular 11px, #0077FF left border
    - Cardio days: "5.2km Run" with running icon, #10B981 left border
    - Days with both: stacked mini cards
    - Rest/empty: no cards

  Sample populated days:
  - Mon 3: "Push Day A" blue card
  - Tue 4: "5km Run" green card
  - Wed 5: "Pull Day A" blue card
  - Thu 6: empty
  - Fri 7: "Leg Day" blue
  - Sat 8: "10km Run" green
  - Sun 9: empty
  - Continue pattern through month...

  Selected day detail (below calendar, 16px top):
  - "Thursday 20 March" Inter Semibold 14px #8899B4
  - Activity card: #0F1629, dumbbell icon, "Push Day A" + "48 min · 5 exercises · 14,200 kg · 2 PRs" — clickable, chevron right
```

---

### Task 59: Web — Subscription/Pricing

- [ ] **Step 1: Generate web subscription page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Subscription — pricing within app (1440px with sidebar)

  Sidebar: accessed via profile/settings

  Main content (centered, max-width 1000px):
  - "Subscription" Clash Display Semibold 28px
  - "Current plan: Athlete" Inter Regular 14px #8899B4

  Toggle: Monthly / Annual (annual shows "Save 20%" badge in #10B981)

  3 pricing cards (inline, 20px gap):

  "Self-Hosted" card (#0F1629, 12px radius, 24px padding):
  - "Self-Hosted" Clash Display Medium 18px
  - "Free" Clash Display Bold 40px #F0F4F8
  - "forever" Inter Regular 14px #8899B4
  - Feature list (check icons #10B981):
    - "Unlimited workouts & cardio"
    - "Full analytics"
    - "Offline-first sync"
    - "Community support"
  - "Self-Host Guide" outlined button

  "Athlete" card (#0F1629, #0077FF border 2px, 12px radius — HIGHLIGHTED as current):
  - "Current Plan" badge pill (#0077FF bg, white text) at top
  - "Athlete" Clash Display Medium 18px
  - "£15" Clash Display Bold 40px + "/mo" #8899B4
  - Features:
    - Everything in Self-Hosted
    - "Cloud hosting"
    - "Strava & Garmin sync"
    - "Priority support"
  - "Current Plan" disabled button

  "Coach" card (#0F1629, 12px radius):
  - "Coach" Clash Display Medium 18px
  - "£30" + "/mo"
  - Features:
    - Everything in Athlete
    - "Client management"
    - "Program builder"
    - "Coach profile page"
  - "Upgrade" #0077FF button

  "Cancel Subscription" link at bottom, Inter Regular 14px #EF4444
```

---

### Task 60: Web — Data Import

- [ ] **Step 1: Generate web import wizard**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Data Import — CSV import wizard, step 2 column mapping (1440px with sidebar)

  Breadcrumb: "Home / Settings / Import"
  Header: "Import Data" Clash Display Semibold 28px

  Progress steps (horizontal, centered, max-width 600px):
  - 4 circles connected by lines: 1 "Upload" (filled #0077FF, completed ✓) → 2 "Map Columns" (filled #0077FF, active, current) → 3 "Review" (#1E2B47) → 4 "Import" (#1E2B47)
  - Active step label bold, others #4E6180

  Content (max-width 900px):
  - "Map your CSV columns to IronPulse fields" Inter Regular 14px #8899B4
  - "workouts.csv — 48 rows detected" Inter Medium 12px #4E6180

  Preview table (#0F1629, 12px radius, 20px padding):
  - Shows first 3 rows of CSV with column headers
  - Above each column: dropdown selector to map to IronPulse field
    - Column "Date" → dropdown showing "Date" ✓ (auto-matched, green)
    - Column "Exercise" → "Exercise Name" ✓
    - Column "Weight" → "Weight (kg)" ✓
    - Column "Reps" → "Reps" ✓
    - Column "Notes" → "Skip this column" (gray, user chose to skip)

  Sample data rows:
  - "2026-03-15" | "Bench Press" | "80" | "8" | "Felt good"
  - "2026-03-15" | "Bench Press" | "85" | "6" | ""
  - "2026-03-15" | "OHP" | "40" | "10" | ""

  Bottom buttons:
  - "Back" outlined button left
  - "Continue to Review" #0077FF button right
```

---

## Chunk 13: Missing Web Screens

### Task 61: Web — Confirm Email Change

- [ ] **Step 1: Generate confirm email change screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Confirm Email Change — auto-confirm page (1440px viewport)

  Same dark background as auth pages.

  Centered card (420px, #0F1629, 12px radius, 32px padding):
  - Green checkmark circle icon 48px #10B981 centered
  - "Email Updated" Clash Display Semibold 22px #F0F4F8 centered
  - "Your email has been changed to hiten.new@example.com" Inter Regular 14px #8899B4 centered
  - "Go to Dashboard" button: full width, 44px, #0077FF, white text, 24px below

  Error variant hint (show the success state — the error variant with "Link expired — request a new one" would be generated as an edit later)
```

---

### Task 62: Web — Shared Cardio Page

- [ ] **Step 1: Generate shared cardio public page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Shared Cardio — public page, no sidebar (1440px)

  Dark background #060B14, no sidebar.

  Centered card (max-width 640px, #0F1629, 12px radius, 32px padding):
  - IronPulse logo + wordmark small, centered, #8899B4
  - User: avatar 48px + "Hiten Patel" Inter Semibold 16px, 16px below

  - Running icon 24px #10B981 + "Morning Run" Clash Display Semibold 22px #F0F4F8
  - Route map (full card width, 200px height, 8px radius, dark tiles, #0077FF route line, start green dot, finish red dot)

  Stats grid (16px below, 2×2):
  - "5.24 km" + "Distance"
  - "28:34" + "Duration"
  - "5:28 /km" + "Avg Pace"
  - "48 m" + "Elevation"
  - Numbers Inter Semibold 20px #F0F4F8, labels Inter Medium 12px #8899B4

  CTA (24px below, centered):
  - "Track your runs with IronPulse" Inter Regular 16px #8899B4
  - "Get Started Free" #0077FF button, 44px
```

---

### Task 63: Web — Legal Page (Privacy Policy)

- [ ] **Step 1: Generate legal page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Privacy Policy — legal page (1440px)

  No sidebar. Navigation bar at top: IronPulse logo left, nav links, login/signup buttons right (same as landing page nav).

  Content (centered, max-width 720px, 80px top padding):
  - "Privacy Policy" Clash Display Semibold 36px #F0F4F8
  - "Last updated: 1 March 2026" Inter Regular 14px #4E6180, 8px below

  Prose content (#F0F4F8 body text, Inter Regular 16px, 1.7 line height):
  - Section headers in Clash Display Medium 22px, 32px top margin
  - Body paragraphs in #8899B4, 16px bottom margin between paragraphs
  - Sections visible:
    - "1. Information We Collect"
    - Paragraph of legal text
    - "2. How We Use Your Information"
    - Paragraph
    - "3. Data Storage & Security"
    - Paragraph (partially visible, scrolling)

  Footer at bottom (same as landing page footer).
```

---

### Task 64: Web — Discover Coaches

- [ ] **Step 1: Generate discover coaches page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Discover Coaches — coach directory (1440px with sidebar)

  Sidebar: no specific item active (accessed from social section)
  Breadcrumb: "Home / Coaches"

  Main content:
  - "Discover Coaches" Clash Display Semibold 28px
  - Search bar + specialty filter pills (16px below): "All", "Powerlifting", "Bodybuilding", "Weight Loss", "Endurance", "CrossFit" — "All" active #0077FF

  3-column card grid (20px gap):

  Card 1 (#0F1629, 12px radius, 20px padding):
  - Avatar 64px centered
  - "Coach Mike Torres" Clash Display Medium 16px #F0F4F8 centered
  - Specialty pills: "Powerlifting" "Strength" (#0077FF20 bg, #0077FF text, small)
  - "Helping athletes break plateaus for 8+ years" Inter Regular 13px #8899B4 centered, 2 lines
  - "12 clients" Inter Regular 12px #4E6180
  - "View Profile" outlined button, full width, 36px, #1E2B47 border

  Card 2: avatar, "Sarah Williams", "Bodybuilding" "Nutrition", "IFBB Pro coach specializing in contest prep", "8 clients"
  Card 3: avatar, "Alex Rivera", "Weight Loss" "General Fitness", "Sustainable transformations through habit-based coaching", "15 clients"
  Card 4: avatar, "Dr. Nina Park", "Endurance" "Running", "Sports scientist and marathon coach", "6 clients"
  Card 5: avatar, "Tom Baker", "CrossFit" "Functional", "CF-L3 certified, competition prep", "10 clients"
  Card 6: avatar, "Priya Sharma", "Powerlifting" "Women's Strength", "IPF certified coach, all-inclusive approach", "9 clients"
```

---

### Task 65: Web — Public Coach Profile

- [ ] **Step 1: Generate public coach profile**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Public Coach Profile — no sidebar (1440px)

  No sidebar. Navigation bar at top (same as landing page).

  Content (centered, max-width 800px):

  Hero section:
  - Avatar 120px centered, 48px top padding
  - "Coach Mike Torres" Clash Display Bold 32px #F0F4F8 centered
  - Specialty pills centered: "Powerlifting" "Strength Training" (#0077FF20 bg, #0077FF text)
  - "Helping athletes break plateaus for 8+ years. Certified NSCA-CSCS with expertise in periodization and peaking protocols." Inter Regular 16px #8899B4 centered, max-width 600px

  - "Request Coaching" #0077FF button, 48px height, centered, 24px below bio

  Stats row (#0F1629, 12px radius, 20px padding, full width, 32px below):
  - 3 stats: "12 Active Clients" | "8+ Years Experience" | "92% Avg Adherence"
  - Evenly spaced, #F0F4F8 numbers Semibold, #8899B4 labels

  About section (32px below):
  - "About" Clash Display Semibold 22px
  - Multi-paragraph bio text Inter Regular 16px #8899B4

  Footer at bottom.
```

---

### Task 66: Web — Find Users

- [ ] **Step 1: Generate find users page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Find Users — user search/discovery (1440px with sidebar)

  Sidebar: no specific item highlighted
  Breadcrumb: "Home / Users"

  Main content (max-width 800px):
  - "Find Users" Clash Display Semibold 28px
  - Search bar: full width, 44px, magnifying glass icon, placeholder "Search by name", #1A2340, #1E2B47 border

  Results (16px below, 12px gap):

  User card 1 (#0F1629, 12px radius, 16px padding, horizontal layout):
  - Avatar 48px left
  - "Sarah Chen" Inter Semibold 16px #F0F4F8 + "Competitive powerlifter | London" Inter Regular 12px #8899B4 below
  - "1.2k followers" Inter Regular 12px #4E6180
  - "Follow" #0077FF button right (small, 32px height, outlined)

  User card 2: avatar, "Mike Torres", "Coach | Strength specialist", "856 followers", "Follow"
  User card 3: avatar, "Alex Kim", "Marathon runner | Berlin", "342 followers", "Following" (outlined #0077FF, check icon — already following)
  User card 4: avatar, "Emma Wilson", "CrossFit enthusiast", "128 followers", "Follow"
  User card 5: avatar, "James Park", "Casual lifter | Seoul", "64 followers", "Follow"
```

---

### Task 67: Web — Template Detail

- [ ] **Step 1: Generate web template detail/editor**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Template Detail — editing "Push Day A" (1440px with sidebar)

  Sidebar: Templates active
  Breadcrumb: "Home / Templates / Push Day A"

  Main content (max-width 800px):
  - "Push Day A" Clash Display Semibold 28px (inline-editable — pencil icon on hover) + "Edit" / "Delete" action buttons right

  Exercise list (16px below, 12px gap):

  Exercise cards (draggable, grip handle on left):

  Card 1 (#0F1629, 12px radius, 16px padding):
  - Grip dots icon #4E6180 far left (drag handle)
  - "Bench Press" Inter Semibold 16px #F0F4F8 + "Chest" badge
  - Target row: "4 sets × 8 reps @ RPE 8" Inter Regular 14px #8899B4
  - "×" remove button far right #4E6180, hover #EF4444

  Card 2: grip + "Overhead Press" + "Shoulders" + "3 sets × 10 reps @ RPE 7"
  Card 3: grip + "Incline DB Press" + "Upper Chest" + "3 sets × 10 reps @ RPE 7"
  Card 4: grip + "Cable Fly" + "Chest" + "3 sets × 12 reps @ RPE 7"
  Card 5: grip + "Lateral Raises" + "Shoulders" + "3 sets × 15 reps @ RPE 6"

  "Add Exercise" outlined button below (plus icon + text, #1E2B47 border)

  Bottom actions (32px below, full width):
  - "Start Workout from Template" #0077FF button, large (48px)
```

---

### Task 68: Web — Body Metrics Page

- [ ] **Step 1: Generate body metrics page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Body Metrics — dedicated page (1440px with sidebar)

  Sidebar: Body Metrics active in ANALYTICS

  Main content:
  - "Body Metrics" Clash Display Semibold 28px

  Two-column layout (24px gap):

  LEFT COLUMN:

  Body Weight card (#0F1629, 12px radius, 20px padding):
  - "Body Weight" Clash Display Medium 18px + 30d | 90d | 1y toggle pills
  - Line chart (180px height): downward trend 78→75.5 kg over 30 days, #0077FF line, dot markers
  - Log form below: weight input (compact, #1A2340, "kg" suffix) + date picker + "Log" #0077FF button inline

  Body Measurements card (#0F1629, 12px radius, 20px padding, 24px below):
  - "Body Measurements" Clash Display Medium 18px
  - Tab buttons: Chest | Waist | Hips | Biceps | Thighs — "Chest" active #0077FF underline
  - Line chart (150px height): chest measurement trend, #0077FF line, slight increase
  - "Overlay comparison" toggle — ability to overlay multiple measurements
  - Log form: measurement dropdown "Chest" + value input "cm" suffix + date + "Log" button

  RIGHT COLUMN:

  Progress Photos card (#0F1629, 12px radius, 20px padding):
  - "Progress Photos" Clash Display Medium 18px + "Upload" #0077FF button right
  - Photo grid (3 columns, 8px gap):
    - 6 photo thumbnails (placeholder dark rectangles with camera icon, 120px squares, 8px radius)
    - Date below each: "20 Mar", "13 Mar", "6 Mar", "27 Feb", "20 Feb", "13 Feb"
  - "Compare" text link #0077FF below grid — opens side-by-side slider

  Body Fat % card (#0F1629, 12px radius, 20px padding, 16px below):
  - "Body Fat %" header + line chart (100px height, downward trend)
  - Log form: % input + date + "Log"
```

---

### Task 69: Web — Security Page

- [ ] **Step 1: Generate security settings page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Security — password & passkeys (1440px with sidebar)

  Breadcrumb: "Home / Profile / Security"

  Main content (max-width 700px):
  - "Security" Clash Display Semibold 28px

  Change Password card (#0F1629, 12px radius, 20px padding):
  - "Change Password" Clash Display Medium 18px
  - Form:
    - "Current Password" label + input (44px, dark style)
    - "New Password" label + input + strength bar (3/4 green "Strong")
    - "Confirm New Password" label + input
    - 16px gap between fields
    - "Update Password" #0077FF button, right-aligned, 16px below

  Passkeys card (#0F1629, 12px radius, 20px padding, 24px below):
  - "Passkeys" Clash Display Medium 18px + "Add Passkey" #0077FF button right
  - "Sign in securely without a password" Inter Regular 14px #8899B4

  Passkey list (table style, 16px below):
  - NAME | CREATED | —
  - "MacBook Pro" Inter Regular 14px #F0F4F8 | "15 Jan 2026" #8899B4 | "Remove" #EF4444 link
  - "iPhone 15" | "20 Jan 2026" | "Remove"
  - Rows separated by #152035 dividers
```

---

### Task 70: Web — Coach Client Detail

- [ ] **Step 1: Generate coach client detail page**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Coach Client Detail — "Emma Wilson" (1440px with sidebar)

  Sidebar: Clients active in COACH section
  Breadcrumb: "Home / Coach / Clients / Emma Wilson"

  Header:
  - Avatar 64px + "Emma Wilson" Clash Display Semibold 28px + "Push/Pull/Legs" program badge pill (#0077FF15, #0077FF)
  - "Member since January 2026" Inter Regular 14px #8899B4
  - "Change Program" outlined button + "Remove Program" #EF4444 text link, right-aligned

  Tab navigation (16px below, full width, #152035 bottom border):
  - Overview | Workouts | Cardio | Stats | Program — "Overview" active (#0077FF text, #0077FF bottom border 2px)

  Overview content (24px below):

  Two-column layout:

  LEFT:
  - Adherence ring: 120px circular progress, #0077FF, 85% filled, "85%" center Clash Display Bold 32px, "This Week" below
  - Weekly summary card (#0F1629, 12px radius, 20px padding, 16px below):
    - "4 Workouts" | "12,400 kg Volume" | "3h 20m Time" — 3 stats inline

  RIGHT:
  - Recent Activity (#0F1629, 20px padding):
    - "Recent Sessions" header
    - 4 compact rows: dumbbell/running icon + name + detail + date
    - "Push Day A" · "5 exercises · 48 min" · "Today"
    - "Pull Day A" · "6 exercises · 52 min" · "Yesterday"
    - "Leg Day" · "6 exercises · 55 min" · "Mon"
    - "5km Run" · "5.0 km · 24:12" · "Sun"

  Quick Notes (#0F1629, 20px padding, full width, 16px below):
  - Textarea: "Good progress this week. Consider adding volume next week." Inter Regular 14px #8899B4
```

---

### Task 71: Web — Coach Program Library

- [ ] **Step 1: Generate program library**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Coach Program Library — grid (1440px with sidebar)

  Sidebar: Programs active in COACH section

  Main content:
  - "Programs" Clash Display Semibold 28px + "New Program" #0077FF button right

  3-column card grid (20px gap):

  Card 1 (#0F1629, 12px radius, 20px padding):
  - "Push/Pull/Legs" Clash Display Medium 16px #F0F4F8
  - "4 weeks · 6 templates" Inter Regular 12px #8899B4
  - "3 clients assigned" Inter Regular 12px #4E6180 with users icon
  - Muscle pill summary: "Full Body" small badge

  Card 2: "Upper/Lower Split" · "4 weeks · 4 templates" · "1 client"
  Card 3: "Strength Focus" · "6 weeks · 4 templates" · "1 client"
  Card 4: "Beginner Full Body" · "4 weeks · 3 templates" · "0 clients"
  Card 5: empty "+" card, dashed #1E2B47 border, "Create Program" centered #4E6180
```

---

## Chunk 14: Missing Mobile Screens

### Task 72: Mobile — Cardio Detail (from history)

- [ ] **Step 1: Generate cardio detail screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Cardio Detail — viewing a past run from history

  Top bar:
  - Left: back arrow
  - Center: "Morning Run" Clash Display Medium 18px #F0F4F8
  - Right: share icon #8899B4

  Route map (full width, top 40% of screen, ~280px):
  - Dark map tiles, #0077FF route line, start green #10B981 dot, finish red #EF4444 dot

  Stats grid (16px below, 24px horizontal padding):
  - #0F1629 card, 12px radius, 16px padding, 3×2 grid:
    - "5.24 km" + "Distance" (ruler icon #4E6180)
    - "28:34" + "Duration" (clock)
    - "5:28 /km" + "Avg Pace" (gauge)
    - "4:52 /km" + "Best Pace" (zap)
    - "48 m" + "Elevation" (mountain)
    - "312" + "Calories" (flame)
  - Numbers Inter Semibold 20px #F0F4F8, labels Inter Medium 12px #8899B4

  Lap splits (16px below):
  - "Lap Splits" Clash Display Medium 16px
  - Table: LAP | KM | PACE | TIME — headers #4E6180 12px uppercase
  - Rows alternating #0F1629 / #0F162980:
    - 1 | 1.00 | 5:22 | 5:22
    - 2 | 1.00 | 5:31 | 10:53
    - 3 | 1.00 | 5:18 | 16:11
    - 4 | 1.00 | 5:42 | 21:53
    - 5 | 1.00 | 5:25 | 27:18
    - 6 | 0.24 | 5:10 | 28:34
  - Inter Regular 14px #F0F4F8

  "Share" outlined button at bottom, 24px padding
```

---

### Task 73: Mobile — General Settings

- [ ] **Step 1: Generate general settings screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile General Settings

  Top bar:
  - Left: back arrow
  - Center: "Settings" Clash Display Medium 18px #F0F4F8

  Content (24px horizontal padding, scrollable):

  Section "General" (Inter Medium 12px #4E6180 uppercase header):
  - "Biometric Lock" row: fingerprint icon #8899B4 left, label Inter Regular 16px #F0F4F8, toggle switch right (on, #0077FF)
  - "Theme" row: sun/moon icon, label, segmented control right: "Dark" (active #0077FF) / "Light" / "System"
  - "Units" row: ruler icon, "Metric" value #4E6180 right, chevron
  - "Default Rest Timer" row: timer icon, "90 seconds" #4E6180, chevron
  - All rows 48px height, #152035 dividers

  Section "Notifications":
  - "Workout Reminders" + toggle (on)
  - "Social Activity" + toggle (on)
  - "Coach Messages" + toggle (on)
  - "PR Achievements" + toggle (on)
  - "Weekly Summary" + toggle (off, #1E2B47 track)

  Section "Privacy":
  - "Profile Visibility" + "Public" value #4E6180, chevron
  - "Show in Activity Feed" + toggle (on)

  Section "Danger Zone" (red accent):
  - "Delete Account" row: trash icon #EF4444, text #EF4444, chevron
```

---

### Task 74: Mobile — Subscription

- [ ] **Step 1: Generate mobile subscription screen**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile Subscription Management

  Top bar:
  - Left: back arrow
  - Center: "Subscription" Clash Display Medium 18px #F0F4F8

  Current plan card (#0F1629, 12px radius, 16px padding, 24px horizontal margin):
  - "Current Plan" Inter Medium 12px #8899B4
  - "Athlete" Clash Display Semibold 22px #0077FF
  - "£15/month · Renews 15 April 2026" Inter Regular 14px #8899B4
  - "Manage Subscription" outlined button, full width, 36px, 12px below

  Plan comparison (24px below, 24px horizontal padding):
  - Monthly / Annual toggle (centered, Annual shows "Save 20%" #10B981 badge)

  Plan cards (vertical stack, 12px gap):

  "Self-Hosted" card (#0F1629, 12px radius, 16px padding):
  - "Self-Hosted" Inter Semibold 16px + "Free" Clash Display Bold 24px right
  - Feature list (compact): "Unlimited workouts" ✓, "Full analytics" ✓, "Offline-first" ✓
  - "Self-Host" outlined button

  "Athlete" card (#0F1629, #0077FF border 2px, "Current" badge):
  - "Athlete" + "£15/mo"
  - "Everything in Self-Hosted" + "Cloud hosting" + "Strava & Garmin" + "Priority support"

  "Coach" card (#0F1629):
  - "Coach" + "£30/mo"
  - "Everything in Athlete" + "Client management" + "Program builder" + "Coach profile"
  - "Upgrade" #0077FF button

  Bottom: "Cancel Subscription" #EF4444 text link, centered, 24px below
```

---

### Task 75: Mobile — FAB Bottom Sheet

- [ ] **Step 1: Generate FAB action sheet**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: MOBILE
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Mobile FAB Bottom Sheet — quick start actions

  Background: Dashboard screen dimmed with #060B14 at 60% overlay

  Bottom sheet (compact, ~30% screen height from bottom):
  - #0F1629 bg, 20px top-left and top-right radius
  - Drag handle: 40px wide, 4px height, #243052, centered, 8px from top

  3 action rows (16px padding, 16px gap):

  Row 1: #1A2340 bg, 12px radius, 56px height, horizontal layout
  - Dumbbell icon 24px #0077FF left
  - "Start Workout" Inter Semibold 16px #F0F4F8
  - Chevron right #4E6180

  Row 2: #1A2340 bg
  - Activity/running icon 24px #10B981
  - "Start Cardio"
  - Chevron

  Row 3: #1A2340 bg
  - Scale icon 24px #8B5CF6
  - "Log Body Metrics"
  - Chevron

  Tab bar visible below sheet (FAB center button still visible, now with "×" close icon instead of "+")
```

---

### Task 76: Web — Command Palette

- [ ] **Step 1: Generate command palette overlay**

```
Tool: mcp__stitch__generate_screen_from_text
projectId: {PROJECT_ID}
deviceType: DESKTOP
modelId: GEMINI_3_1_PRO
prompt: |
  {DSP}

  Screen: Web Command Palette — ⌘K search overlay (1440px)

  Background: the dashboard is visible behind, dimmed with #060B14 at 70% overlay

  Centered modal (max-width 560px, #0F1629, 12px radius, no padding):

  Search input (top):
  - Full width, 52px height, #0F1629, no border, magnifying glass icon #4E6180 left, placeholder "Search pages, exercises, workouts..." Inter Regular 16px #4E6180
  - "ESC" key badge right (#1A2340 bg, Inter Mono 11px #4E6180, 4px radius)
  - #152035 bottom border

  Results (scrollable, max-height 400px):

  Group "Pages" (Inter Medium 11px #4E6180 uppercase, 12px left padding, 8px top):
  - Row: home icon 16px #4E6180 + "Dashboard" Inter Regular 14px #F0F4F8, 40px height, 12px left padding. SELECTED: #1A2340 bg.
  - "Workouts" + dumbbell icon
  - "Stats" + bar-chart icon
  - "Calendar" + calendar icon

  Group "Exercises":
  - "Bench Press" + "Chest" tiny badge
  - "Deadlift" + "Back"
  - "Squat" + "Legs"

  Group "Recent Workouts":
  - "Push Day A — 20 Mar" + clock icon
  - "Pull Day B — 18 Mar"

  Keyboard hint at bottom (#152035 top border, 8px padding):
  - "↑↓ Navigate" + "↵ Select" + "ESC Close" — Inter Regular 11px #4E6180, spaced inline
```

---

## Execution Notes

### Screen Count Summary

| Platform | Screens |
|----------|---------|
| Mobile Auth | 5 (login, signup, onboarding steps 1-3) |
| Mobile Dashboard | 1 |
| Mobile FAB Sheet | 1 |
| Mobile Workout Flow | 3 (active, add exercise, complete) |
| Mobile Cardio Flow | 4 (type picker, GPS tracking, manual, summary) |
| Mobile Stats | 1 |
| Mobile Exercises | 2 (library, detail) |
| Mobile History | 4 (workout list, workout detail, cardio history, cardio detail) |
| Mobile Calendar | 1 |
| Mobile Social | 1 (feed) |
| Mobile Coaching | 2 (client list, client detail) |
| Mobile Messages | 2 (inbox, thread) |
| Mobile Profile/Settings | 4 (profile, general settings, integrations, subscription) |
| **Mobile Total** | **31** |
| Web Landing | 1 |
| Web Auth | 5 (login, signup, forgot password, reset password, onboarding) |
| Web Confirm Email | 1 |
| Web Dashboard | 1 |
| Web Workouts | 3 (list, detail, active) |
| Web Cardio | 3 (list, detail, new) |
| Web Templates | 2 (library, detail) |
| Web Program | 1 |
| Web Stats | 1 |
| Web Body Metrics | 1 |
| Web Exercises | 1 |
| Web Social | 5 (feed, messages, user profile, find users, discover coaches) |
| Web Public Coach Profile | 1 |
| Web Coaching | 5 (dashboard, client list, client detail, program library, program builder) |
| Web Tools | 2 (1RM, plate) |
| Web Command Palette | 1 |
| Web Profile/Settings | 4 (profile, security, settings, integrations) |
| Web Share Pages | 3 (workout, cardio, PR) |
| Web Calendar | 1 |
| Web Subscription | 1 |
| Web Import | 1 |
| Web Legal | 1 |
| **Web Total** | **45** |
| **Grand Total** | **76** |

### Execution Strategy

- Each `generate_screen_from_text` call takes 1-3 minutes
- Screens within the same chunk can be generated sequentially
- The `{DSP}` prefix MUST be substituted with the full Design System Prompt text in every call
- Use `GEMINI_3_1_PRO` model for all generations
- After generation, review each screen and use `edit_screens` for adjustments if needed
- If a screen doesn't match the spec well, re-generate with a refined prompt rather than trying to edit extensively
