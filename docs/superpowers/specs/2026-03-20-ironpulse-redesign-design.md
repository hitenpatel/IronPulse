# IronPulse UI Redesign — "Pulse" Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Complete UI redesign for both web and mobile platforms, delivered as a separate Stitch project

## Overview

A full visual redesign of IronPulse covering every screen across web (Next.js) and mobile (Expo/React Native). The redesign targets a **bold and energetic** aesthetic with a dark-mode-first approach ("Pulse"), electric blue primary color, and platform-native navigation patterns with a shared brand identity.

The redesign will be created in **Stitch** as a separate project with both web and app screen variants.

## Design Direction

**Approach: "Pulse" — Dark-Mode-First with Electric Accents**

Deep dark backgrounds (rich charcoal/navy, not pure black) with electric blue as the primary action color. Bright accent pops for PRs, streaks, and achievements. Light mode available but dark is the hero.

**Rationale:** Most people use fitness apps in the gym where dark UIs reduce glare. Electric blue pops beautifully on dark backgrounds. Data visualizations (charts, heatmaps) look more premium on dark canvases.

---

## 1. Design System Foundation

### 1.1 Color Palette

#### Dark Mode (Hero)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#060B14` | App background |
| `bg-surface` | `#0F1629` | Cards, sheets |
| `bg-surface-raised` | `#1A2340` | Elevated cards, modals |
| `bg-muted` | `#243052` | Hover states, secondary areas |
| `border-default` | `#1E2B47` | Card/input borders |
| `border-subtle` | `#152035` | Dividers |
| `text-primary` | `#F0F4F8` | Primary text |
| `text-secondary` | `#8899B4` | Secondary/muted text |
| `text-tertiary` | `#4E6180` | Placeholder, disabled |

#### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#FFFFFF` | App background |
| `bg-surface` | `#F5F7FA` | Cards |
| `bg-surface-raised` | `#FFFFFF` | Elevated cards, modals (with shadow) |
| `bg-muted` | `#EDF0F5` | Hover states |
| `border-default` | `#D8DFE9` | Borders |
| `text-primary` | `#111827` | Primary text |
| `text-secondary` | `#4B5563` | Secondary |
| `text-tertiary` | `#9CA3AF` | Placeholder |

#### Brand & Semantic Colors (shared both modes)

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#0077FF` | CTAs, links, active states |
| `primary-hover` | `#0066DD` | Hover on primary |
| `primary-light` | `#0077FF1A` (10% opacity) | Primary tinted backgrounds |
| `success` | `#10B981` | PRs, completed, positive |
| `warning` | `#F59E0B` | Caution, missed sessions |
| `error` | `#EF4444` | Errors, destructive actions |
| `pr-gold` | `#FFD700` | Personal records highlight |
| `streak-orange` | `#FF6B2C` | Streak badges, fire |

### 1.2 Typography

| Level | Font | Weight | Size (mobile / web) |
|-------|------|--------|---------------------|
| Display | Clash Display | Bold (700) | 32px / 40px |
| H1 | Clash Display | Semibold (600) | 28px / 36px |
| H2 | Clash Display | Semibold (600) | 22px / 28px |
| H3 | Clash Display | Medium (500) | 18px / 22px |
| Body | Inter | Regular (400) | 16px / 16px |
| Body Small | Inter | Regular (400) | 14px / 14px |
| Caption | Inter | Medium (500) | 12px / 12px |
| Stats/Numbers | Inter (tabular figures) | Semibold (600) | Varies |
| Button | Inter | Semibold (600) | 16px / 16px |

### 1.3 Spacing & Layout

- Base unit: 4px grid
- Border radius: 12px cards, 8px inputs/buttons, 24px pills/badges, full-round for avatars
- Touch targets: 48px minimum on mobile
- Card padding: 16px mobile, 20px web
- Section spacing: 24px mobile, 32px web

### 1.4 Elevation

- Dark mode: depth via surface color layering (each level slightly lighter)
- Light mode: subtle box shadows (`0 1px 3px rgba(0,0,0,0.08)` for cards, increasing for modals)

### 1.5 Iconography

- Lucide icons throughout
- 24px default, 20px compact, 28px tab bar
- Stroke width: 1.75px (slightly bolder than default for the energetic feel)

### 1.6 Accessibility

- WCAG AA compliance (4.5:1 text contrast, 3:1 UI elements)
- 48px minimum touch targets on mobile (gym-friendly — sweaty hands, gloves)
- Colorblind-friendly palette: secondary colors distinguishable without relying on color alone (use icons, patterns, labels)
- `prefers-reduced-motion` respected — all animations have reduced-motion variants
- Keyboard navigable on web with visible focus indicators (`primary` blue ring, 2px offset)
- Screen reader support: semantic HTML, ARIA labels on interactive elements

---

## 2. Mobile App — Navigation & Shell

### 2.1 Tab Bar

Bottom tab bar with frosted glass/blur background (`bg-base` at 85% opacity + backdrop blur). Active tab: `primary` blue icon with a subtle glow dot beneath. Inactive tabs: `text-tertiary`.

| Tab | Icon | Label |
|-----|------|-------|
| Home | `home` | Home |
| Stats | `bar-chart-3` | Stats |
| **+ (FAB)** | `plus` | — |
| Exercises | `dumbbell` | Exercises |
| Profile | `user` | Profile |

Center FAB: 56px circle, `primary` blue, subtle blue glow. Opens bottom sheet: Start Workout / Start Cardio / Log Body Metrics.

### 2.2 Top Bar

- Minimal chrome
- Left: contextual (back arrow on sub-screens, greeting on dashboard)
- Right: notification bell (badge dot) + messages icon
- Title: Clash Display H3

### 2.3 Bottom Sheets

Used for: FAB menu, exercise picker, RPE picker, rest timer settings, filters. 20px rounded top corners, drag handle indicator, backdrop blur overlay.

### 2.4 Navigation Patterns

- Stack navigation within each tab (push/pop with horizontal slide)
- Bottom sheets for contextual actions and pickers
- Full-screen modals for active workout and cardio tracking (tab bar hidden)

---

## 3. Mobile App — Auth Screens

### 3.1 Login

- Dark background with subtle radial gradient of `primary` blue at top
- IronPulse logo + wordmark centered (Clash Display)
- Email + password inputs (8px radius, `bg-surface` fill, `border-default`)
- "Log In" full-width `primary` button, 48px height
- Divider: "or continue with"
- Social row: Google + Apple buttons (outlined, side by side)
- "Sign in with passkey" text link
- Bottom: "Don't have an account? **Sign up**" with `primary` link

### 3.2 Signup

- Same layout as login
- Fields: name, email, password, confirm password
- Password strength indicator bar (gray → red → amber → green)

### 3.3 Onboarding (3-step wizard)

- Progress dots at top (active = `primary`)
- Step 1: "What's your goal?" — large tappable cards with icons: Build Muscle / Lose Weight / Get Stronger / General Fitness / Endurance
- Step 2: "Experience level?" — 3 cards: Beginner / Intermediate / Advanced with brief descriptions
- Step 3: "Preferred units?" — Metric / Imperial toggle with preview
- Steps 1-2: "Continue" button; Step 3: "Get Started"

---

## 4. Mobile App — Dashboard (Home Tab)

Scrollable layout, top to bottom:

1. **Greeting header** — "Morning, Hiten" Clash Display H1 + current date `text-secondary`. Notification bell + message icon top-right.

2. **Streak banner** — horizontal card, `bg-surface`, flame icon `streak-orange` + "12 Day Streak" H3, mini 7-day dot grid (filled = active, current day pulsing).

3. **Quick Start** — "Start Training" H3. Two side-by-side cards:
   - Workout: dumbbell icon, "Strength" (or program template name if scheduled)
   - Cardio: running icon, "Cardio"

4. **Weekly Summary** — horizontal stat row: workouts, cardio, volume, distance. Numbers in Inter Semibold, labels in caption. Week day indicators below (M T W T F S S, completed = `primary`).

5. **Today's Program** (if enrolled) — card with template name, muscle group pills, "Start" button. Rest day: "Rest Day — recover well" with subtle illustration.

6. **Recent Activity** — last 3-5 sessions as compact cards. Workout: dumbbell icon, name, "5 exercises · 45 min", time ago. Cardio: activity icon, "5.2 km · 28:34". Gold star overlay for PR sessions.

7. **Feed preview** — "From Your Network" + "See All". 2-3 feed items from followed users (avatar, name, activity, reactions).

---

## 5. Mobile App — Active Workout Flow

### 5.1 Active Workout Screen

- Full-screen modal (no tab bar)
- Top bar: elapsed timer (left), workout name H3 (center), "Finish" `primary` text (right)
- Exercise cards:
  - Header: exercise name H3, muscle badge, "..." menu (reorder, remove, replace, note)
  - Set table: Set # | Previous (faded `text-tertiary`) | Weight | Reps | checkmark
  - Row types: set number or W/D/F badge (warmup/dropset/failure)
  - Completed sets: `success` green checkmark micro-animation, subtle `success` left border
  - "Add Set" ghost button, `primary` text
- Superset indicator: vertical `primary` blue bar connecting linked exercises
- Rest Timer: floating bottom bar on set completion. Large Clash Display countdown, circular progress ring `primary`, "Skip" button. Pulses on expiry.
- Add Exercise: sticky button above rest timer, full-width outlined

### 5.2 Add Exercise Sheet

- Search bar (magnifying glass, `bg-surface`)
- Filter pills: All / Recent / Favorites / by muscle group
- Exercise list: name, primary muscle badge, secondary tag
- Tap to add, sheet dismisses

### 5.3 Workout Complete

- PR burst animation with `pr-gold` (if PRs set)
- Summary card: duration, total volume, sets, exercise count
- PR callout cards: each with gold accent (e.g., "Bench Press — New 1RM: 100 kg")
- "Save as Template" + "Share" buttons
- "Done" returns to dashboard

---

## 6. Mobile App — Cardio Flow

### 6.1 Type Picker

- 2-column grid: Run, Cycle, Swim, Hike, Walk, Row, Elliptical, Other
- Each card: icon + label, `bg-surface`, 12px radius

### 6.2 Live GPS Tracking

- Full-screen modal, map upper 60% (dark-styled tiles)
- Route in `primary` blue, pulsing blue dot at current position
- Bottom 40%: live stats panel — Distance (largest), Pace, Duration, Heart Rate
- Top overlay: back arrow, activity type label, lock button
- Weak signal: amber banner "GPS signal weak" + satellite icon
- Low battery: red banner
- Bottom: 64px red "Stop" circle, "Pause" flanking

### 6.3 Manual Cardio Entry

- Form: activity type, distance, duration, date/time, notes, optional HR/elevation
- "Save" primary button

### 6.4 Cardio Summary

- Route map (full width, compact)
- Stats grid: distance, duration, avg pace, elevation, calories
- Lap splits table (if applicable)
- "Share" + "Done" buttons

---

## 7. Mobile App — Stats Tab

Scrollable layout:

1. **Training Status** — headline card. Status pill: Optimal (`success`) / Fresh (`primary`) / Fatigued (`warning`) / Overreaching (`error`). Mini TSB line chart (14 days). Row: Fitness (CTL), Fatigue (ATL), Form (TSB) with trend arrows.

2. **Training Load Chart** — dual-line (ATL + CTL), `primary` for fitness, `error` for fatigue, shaded area between. 7d / 30d / 90d toggle pills.

3. **Weekly Volume** — stacked bar chart by muscle group, curated color palette. Current week highlighted. Tap for breakdown.

4. **Muscle Heatmap** — front/back body silhouette, cool→warm coloring by volume.

5. **Workout Frequency** — this week vs last week comparison bars.

6. **Body Weight Trend** — line chart with dots. Inline log form: weight + date + "Log". 30d / 90d / 1y toggle.

7. **Body Measurements** — expandable card, per-measurement line charts (chest, waist, hips, biceps, thighs) with log form.

8. **Progress Photos** — horizontal scrollable timeline. Tap to compare (side-by-side slider). "Add Photo" button.

---

## 8. Mobile App — Secondary Screens

### 8.1 Exercise Library (Exercises Tab)

- Search + filter pills (All / Favorites / muscle group, horizontal scroll)
- List items: name (Inter Semibold), primary muscle badge, secondary muscle `text-secondary`, favorite heart (filled = `error` red)
- Alphabet section headers
- Exercise Detail: name H2, muscle badges, history section (grouped by date), PR cards (gold accent), "Add to Workout" if workout active

### 8.2 History

**Workout History:** reverse chronological, month group headers (H3). Items: name, date/time ago, duration, exercise count, volume. Gold star badge for PR sessions.

**Workout Detail:** name H1, date + duration + volume. Stats row. Exercise cards with read-only set tables, PR rows highlighted `pr-gold`. "Share" FAB, "Save as Template" in overflow.

**Cardio History:** activity icon, name/date, distance, duration, avg pace. Route thumbnail map per card.

**Cardio Detail:** route map (top 40%), stats grid, lap splits table (alternating rows), "Share" button.

### 8.3 Calendar

- Month grid, Clash Display month/year with arrow navigation
- Workout days: `primary` blue dot. Cardio: `success` green dot. Both: stacked dots.
- Tap day → session list expands below grid
- Today: `primary` ring

### 8.4 Feed

- Pull-to-refresh
- Cards: avatar (40px) + name + time ago + activity icon
- Content varies: workout summary, cardio with mini route map, PR with gold card tint
- Reaction bar: kudos/fire/muscle with counts, active filled with color
- Empty state: "Follow athletes to see their activity" + "Find Users"

### 8.5 Coaching

**Client List:** "My Clients" H1, search, client cards (avatar, name, last active, program, green/gray status dot).

**Client Detail:** avatar (64px), name, member since. Tabs: Overview (weekly summary, adherence ring) / Workouts / Stats / Program.

### 8.6 Messages

**Inbox:** conversation list, avatar + name + preview + timestamp + unread badge (`primary`). Unread rows: `bg-surface-raised`.

**Thread:** sent = right-aligned `primary` blue bubble (white text), received = left-aligned `bg-surface` bubble. Input bar at bottom with send button.

### 8.7 Profile Tab

- Avatar (80px) + name H1 + email + tier badge pill + streak
- Stats row: total workouts, cardio, PRs
- Settings list grouped: Account, Preferences, Integrations, Subscription, App (Sign Out in `error` red)

### 8.8 Settings

**General:** toggles/chevrons for biometric lock, theme (dark/light/system), notifications.

**Integrations:** service cards with logo + status + connect/disconnect. Health app toggles per data type.

**Subscription:** current plan card, change/cancel options, feature comparison.

---

## 9. Web App — Shell & Navigation

### 9.1 Layout Structure

- Left sidebar (260px, collapsible to 64px) + main content area (32px padding, max 1280px centered)

### 9.2 Sidebar

Top: IronPulse logo + wordmark (Clash Display), collapses to logo mark.

**Navigation groups** (section labels in `text-tertiary` uppercase caption):

| Group | Items |
|-------|-------|
| Training | Dashboard, Workouts, Cardio, Calendar, Exercises, Templates, My Program |
| Analytics | Stats, Body Metrics |
| Social | Feed, Messages |
| Coach (coach tier) | Clients, Programs |
| Tools | 1RM Calculator, Plate Calculator |

- Active item: `primary` text + `primary-light` bg + 2px `primary` left border
- Hover: `bg-muted`
- Collapsed: icons only with hover tooltips
- Bottom: theme toggle, settings gear, user avatar + name + tier badge → dropdown (Profile, Settings, Sign Out)

### 9.3 Top Bar (in main content)

- Breadcrumb (left)
- Contextual actions (right, e.g., "New Workout" button)
- Notification bell with badge
- `⌘K` command palette shortcut

### 9.4 Command Palette

- Centered modal overlay, search input
- Results grouped: Pages, Exercises, Recent Workouts, Actions
- Keyboard navigable (arrows + enter), fuzzy search

### 9.5 Responsive Breakpoints

| Breakpoint | Behavior |
|-----------|----------|
| ≥1280px | Full sidebar + main content |
| 1024–1279px | Collapsed sidebar (icon-only) |
| 768–1023px | Sidebar hidden, hamburger menu, single column |
| <768px | Mobile layout, bottom tab bar replaces sidebar |

---

## 10. Web App — Public Pages

### 10.1 Landing Page

- Full-width, no sidebar
- Hero: dark background, Clash Display headline "Strength + Cardio. One Tracker.", two CTAs: "Get Started Free" (`primary`) + "Self-Host" (outlined). Animated gradient mesh in `primary` blue tones.
- Features: 3-column grid with icons
- App screenshots on dark device mockups
- Pricing: 3 cards (Self-Hosted Free / Athlete £15/mo / Coach £30/mo), annual toggle with 20% discount badge
- Footer: links, legal, GitHub

### 10.2 Auth Pages

- Centered card (max 420px), dark background with brand gradient
- Same fields as mobile, adapted for keyboard/mouse (tab order, autofill)
- Social login buttons full-width, side by side

---

## 11. Web App — Core Pages

### 11.1 Dashboard

Two-column grid (60/40 on desktop, single column on tablet):

**Left:** greeting + date, today's program card, recent activity list (5 sessions).

**Right:** streak card, weekly summary (2×2 stat grid), week activity bar, feed preview.

### 11.2 Workouts

**List:** H1 + "New Workout" button. Filter bar (date range, search). Table: Date, Name, Duration, Exercises, Volume, PRs. Paginated.

**Detail:** name H1, stat pills (date, duration, volume). Actions: Share, Save as Template. Exercise cards with set tables (read-only), PR rows with `pr-gold` left border.

### 11.3 Active Workout (`/workouts/new`)

Two-panel layout:
- Left (65%): exercise cards with editable set tables, drag-and-drop reorder, superset grouping
- Right (35%): sticky sidebar — elapsed timer, rest timer (circular), quick stats, "Add Exercise" (opens slide-over), "Finish Workout"
- Keyboard shortcuts: Enter advance, Tab between weight/reps, Space complete set

### 11.4 Cardio

**List:** table — Date, Type, Distance, Duration, Avg Pace, Elevation. Activity type icon. Route map thumbnail on hover.

**New:** form with activity type grid, fields, GPX/FIT drag-and-drop import (auto-populates + route map preview).

**Detail:** Leaflet route map (dark tiles, full-width, 400px), stats 3×2 grid, lap splits table (striped), share button.

### 11.5 Templates

**Library:** 3-column card grid (name, exercise count, muscle pills, last used). Search + muscle group filter. "New Template" button.

**Detail:** inline-editable name H1, exercise list with target sets/reps/RPE, drag-and-drop reorder. "Start Workout" primary button. Edit/delete actions.

### 11.6 My Program

- 7-column weekly grid (Mon–Sun)
- Each cell: template name + muscle pills + status (Done green checkmark / Missed amber badge / Today blue pill + "Start" / Upcoming neutral)
- Adherence bar at top: "78% this week" progress bar in `primary`
- Empty days: "Rest Day" in `text-tertiary`

### 11.7 Stats

Full analytics dashboard, 2-column responsive grid:

1. Training Status (full width): status pill + TSB line chart + ATL/CTL/TSB cards. Period toggles.
2. Training Load Chart (full width): dual-line with hover tooltips, legend.
3. Weekly Volume (left): stacked bar chart with legend, hover breakdown.
4. Muscle Heatmap (right): body silhouette, front/back toggle, hover shows volume.
5. Workout Frequency (left): this vs last week bars.
6. Body Weight Trend (right): line chart + inline log form + period toggles.
7. Body Measurements (full width): tabbed by type, chart + log form, overlay comparison.
8. Progress Photos (full width): grid with dates, click for side-by-side slider comparison, upload.

### 11.8 Exercise Library

**List with sidebar detail:** left = searchable/filterable list, right = detail panel (history, PRs, instructions) without page navigation.

**Full Detail:** name H1, muscle badges, history table (sortable), PR cards (gold), 1RM progression line chart.

---

## 12. Web App — Social & Messaging

### 12.1 Feed

- Single column (max 640px centered)
- Cards: avatar (44px) + name + timestamp + badge, content area (full exercise list / larger route map / PR with gold tint), reaction bar with hover tooltips
- Infinite scroll with skeleton loading

### 12.2 Messages

- Two-panel: left (320px) conversation list with search, right = active thread
- Chat layout: sent `primary` blue bubbles (white text), received `bg-surface` bubbles
- SSE real-time, Enter to send, Shift+Enter newline
- Empty state: "Select a conversation"

### 12.3 Users & Coaches

**Find Users:** search, result cards (avatar, name, bio, followers, "Follow" button). Tap → profile.

**User Profile:** avatar (96px), name H1, bio, follower/following counts, Follow/Message buttons. Public activity feed below.

**Discover Coaches:** 3-column card grid (avatar, name, specialties, bio, client count). Search + specialty filter.

**Public Coach Profile:** no sidebar, centered (max 800px). Hero: avatar (120px), name Display, specialties, bio. "Request Coaching" CTA.

---

## 13. Web App — Coaching (Coach Tier)

### 13.1 Coach Dashboard

- Overview cards: total clients, active this week, average adherence %
- Attention list: clients with missed sessions / low adherence (`warning` amber highlight)

### 13.2 Client Management

**List:** table — avatar + name, program, adherence %, last active, status dot. Sortable, searchable. "Add Client" (invite link).

**Detail:** avatar + name + member since + program badge. Tabs: Overview (adherence ring, summary, recent) / Workouts / Cardio / Stats / Program. All read-only views of client data.

### 13.3 Program Builder

**Library:** grid of program cards (name, weeks, template count, client count). "New Program" button.

**Builder:** inline-editable name, week duration selector. Grid: 7 columns × N weeks. Drag templates from sidebar into day cells. Cells show template name + muscle pills + "×" remove. "Assign to Client" dropdown. Auto-save with indicator.

---

## 14. Web App — Tools, Profile & Settings

### 14.1 1RM Calculator

- Centered (max 600px), weight + reps inputs (large)
- Result: estimated 1RM in Display size, 3 formulas compared
- Training percentages table: % → weight (100% down to 50%), alternating rows

### 14.2 Plate Calculator

- Target weight, bar weight, available plates (editable toggles)
- Visual barbell diagram: color-coded plates, symmetric
- Plate breakdown list

### 14.3 Profile

- Two-column: left (avatar upload, name, email, bio), right (account stats)
- "Save Changes" primary, "Export Data" secondary

### 14.4 Security

- Change password form
- Passkey list (name, date, remove action) + "Add Passkey"

### 14.5 Settings

- Grouped cards: General (units, rest timer, theme), Notifications (per-type toggles), Privacy (visibility, feed opt-out)

### 14.6 Integrations

- Service cards: Strava, Garmin (logo, status, connect/disconnect, last sync). API Keys section for self-hosted.

### 14.7 Import

- Step wizard: 1) Upload CSV (drag-drop) → 2) Column mapping (preview + dropdowns) → 3) Review summary → 4) Import with progress bar

### 14.8 Subscription

- Pricing cards (same as landing), current plan badge, upgrade/downgrade, annual/monthly toggle, cancel flow with confirmation

---

## 15. Web App — Public Share Pages

### 15.1 Shared Workout (`/share/workout/[id]`)

- Dark background, centered card (max 640px)
- IronPulse branding, workout summary, compact exercise list, PR highlights in gold
- CTA: "Track your workouts with IronPulse"

### 15.2 Shared PR (`/share/pr/[id]`)

- Dark background, celebratory card: exercise name Display, "New Personal Record" headline, record in Display `pr-gold`, user avatar + name, date
- IronPulse branding + CTA

### 15.3 Legal Pages

- Centered prose (max 720px), standard styling

---

## 16. Stitch Project Structure

The Stitch project will be organized as:

### Screen Groups (Web)

1. Landing & Public (landing, pricing, coach profile, share pages, legal)
2. Auth (login, signup, forgot password, reset password, onboarding, confirm email)
3. Dashboard
4. Workouts (list, detail, active workout)
5. Cardio (list, new, detail)
6. Templates (library, detail)
7. Program (my program schedule)
8. Stats & Analytics (full stats page, body metrics)
9. Exercises (library, detail)
10. Social (feed, messages, users, user profile, coaches)
11. Coaching (dashboard, clients, client detail, programs, program builder)
12. Tools (1RM calculator, plate calculator)
13. Profile & Settings (profile, security, settings, integrations, import, subscription)

### Screen Groups (Mobile/App)

1. Auth (login, signup, onboarding)
2. Dashboard (home tab)
3. Active Workout (workout screen, add exercise, complete)
4. Cardio (type picker, live tracking, manual entry, summary)
5. Stats (stats tab — all sections)
6. Exercises (library, detail)
7. History (workout list, workout detail, cardio list, cardio detail)
8. Calendar
9. Feed
10. Coaching (client list, client detail)
11. Messages (inbox, thread)
12. Profile & Settings (profile tab, settings, integrations, subscription)

### Design Deliverables Per Screen

- Dark mode variant (primary)
- Light mode variant
- Key interaction states: default, hover (web), pressed, disabled, loading, empty state, error state
- Component annotations for spacing, colors, typography tokens
