# Zor — Logo & Identity Spec

Feed this document (or the ready-to-paste prompt in §12) to an AI design tool.

---

## 1. The name

**Zor** — ज़ोर — Hindi/Urdu for *force, strength, exertion*.

Idiom: *"zor lagao"* — put your strength into it, give it everything you've got.

Pronounced **ZOR**, one syllable, rhymes with "more".

---

## 2. Brand essence

| | |
|---|---|
| **Category** | Fitness tracking — strength training AND cardio, equally weighted |
| **Personality** | Physical, fast, a little defiant. Effort with attitude. |
| **Tone** | Confident, kinetic, not corporate. |
| **Anti-brief** | Not wellness. Not lifestyle. Not soft. Not an energy drink. |

---

## 3. Core concept — "the chalk-slash Z"

The mark is the letter **Z slashed in three fast strokes**, as if swiped in gym
chalk across a lifting platform.

```
  ◄██████████►
           ▄█►
         ▄█▀
       ▄█▀
     ◄█▀
  ◄██████████►
```

Three ideas stacked in one gesture:

- **Chalk** is the universal mark of effort — lifters, climbers, gymnasts. Chalk
  on your hands means you're about to do something hard. The mark is drawn in
  the material of training itself.
- **The slash** carries motion — speed, pace, cardio — without a single swoosh
  curve. All the energy lives in how the strokes taper and where they overshoot.
- **The signature** — a slashed Z is a claim: *I was here, this got done*. It
  borrows the one Z every human already remembers (Zorro's blade-cut) and
  re-roots it in gym culture.

It is still, at its core, a bold geometric Z — so it stays legible as a letter,
works as an app icon, and anchors the wordmark.

---

## 4. Construction

Draw on a **64 × 64** grid. All values in grid units.

### The three strokes — drawn in this order, and it must LOOK like that order

1. **Top stroke** — left → right
2. **Diagonal** — top-right → bottom-left
3. **Bottom stroke** — left → right

Each stroke is a straight, flat-sided cut (a blade stroke, not a brush curve)
that is **thick where it starts and tapers where it exits**:

| Element | Spec |
|---|---|
| Cap height | 44 (10 units clear top and bottom) |
| Stroke body thickness | 10 at the thickest point |
| Exit taper | Tapers to 3 units over the final 30% of each stroke's length |
| Entry | Near-full thickness, cut at a slight angle (blade entry), not square |
| Top stroke | 38 wide, rising ~3° left to right |
| Bottom stroke | 42 wide, rising ~3° left to right — longer, planted |
| Diagonal | ~50° from horizontal, tapering toward its bottom-left exit |
| Overshoot | Top and bottom strokes overshoot the diagonal join by 2–3 units |
| Corners | Where strokes meet they overlap; they do not neatly mitre |

### The rules that keep it a slash, not a mess

- **Straight edges only.** Every stroke is a straight-sided quadrilateral with a
  taper — no curves, no ribbon bends, no calligraphic swelling. Blade, not brush.
- **The ~3° rise** on the horizontals is the speed. Both strokes rise the same
  amount, keeping the mark parallel and intentional, not wobbly.
- **Overshoot is small.** 2–3 units past the join reads as velocity; more reads
  as sloppy.
- **No texture in the master.** The chalk idea is carried by the stroke
  behaviour, not by grain, dust or roughened edges. Master mark is flat vector
  with clean paths. (A textured "chalk dust" variant is permitted for marketing
  and splash use ONLY — see §9.)

### Small-size cut

Below 24 px the tapers close up. Supply a **small cut**: same silhouette, taper
reduced (10 → 6 instead of 10 → 3), overshoot removed. Used for favicon 16/32
and any UI use under 24 px. Verify legibility at 16 px before delivery.

---

## 5. Colour

Locked to the existing product palette. Do not introduce new hues.

| Token | Hex | Use |
|---|---|---|
| **Lime (primary)** | `#D4FF3A` | The mark on dark. Chalk under gym lights. |
| Lime pressed | `#C4EF2A` | Hover/active states only |
| **Ink** | `#0B0D12` | Dark background. Cool near-black, blue undertone. |
| Ink-on-lime | `#0F1508` | Anything sitting ON a lime fill. **Never white on lime.** |
| **Cobalt (secondary)** | `#3A6DFF` | Accent only. Never the mark itself. |
| **Warm off-white** | `#F4F0E6` | Type on dark — and the literal chalk-white variant. **Never pure `#FFFFFF`.** |
| Light background | `#F9F4E1` | Warm cream, for light mode |

**Primary**: lime `#D4FF3A` slash-Z on ink `#0B0D12`.
**Light mode**: ink `#0B0D12` slash-Z on warm cream `#F9F4E1`.
**Chalk variant**: warm off-white `#F4F0E6` slash-Z on ink — the most literal
version, good for splash screens and merch.

Single-colour and monochrome versions must both work. The mark never uses more
than one colour.

---

## 6. The squircle — app icon application

| Element | Spec |
|---|---|
| Tile | Full-bleed solid lime `#D4FF3A` |
| Corner radius | 22% of tile width (iOS-native squircle, superellipse) |
| Mark | Slash-Z knocked out in ink `#0B0D12`, centred, cap height 46% of tile |

A solid block of electric lime with a slashed-out Z: the tile supplies the
loudness, the slash supplies the memorability. Nothing else on a home screen
looks like it.

For **Android adaptive** and **PWA maskable** icons the OS crops to a circle:
keep the mark inside the centre **66% safe zone**. Standard icons fill 82%.
Adaptive/maskable icons use the **small cut** (reduced taper) so nothing thin
gets lost at launcher sizes.

---

## 7. Typography & wordmark

- **Display**: Clash Display (Space Grotesk is the current stand-in).
- Wordmark is **lowercase**: `zor`.
- Letterspacing: `-0.02em` at display sizes; `0` below 24 px.
- **The `z` IS the mark** — the slash-Z at text scale (small cut), leading the
  word like a signed initial. The `o` and `r` are set clean and geometric in the
  display face, deliberately calm so the slash does the talking.
- Contrast is the trick: one kinetic letter, two quiet ones. Do not slash the
  `o` or the `r`. Do not italicise the quiet letters to "match" the energy.

---

## 8. Lockups

Deliver all three.

1. **Mark only** — slash-Z in its 64×64 box. App icons, favicons, avatars.
2. **Horizontal** — mark, then `or` completing the word: the mark doubles as
   the wordmark's z. Gap between mark and `o` = 0.35 × cap height. This is the
   nav/header lockup.
3. **Stacked** — mark above the full `zor` wordmark, centred.
   Gap = 0.35 × cap height. Splash screens, marketing.

**Clear space**: minimum 0.5 × cap height on all sides — the overshoots need
air to read as motion.

**Minimum sizes**: mark 16 px (small cut); horizontal lockup 88 px wide;
stacked 64 px wide.

---

## 9. Chalk-dust variant & Devanagari mark (optional)

**Chalk-dust variant** — marketing, splash and merch ONLY: the slash-Z with a
fine dry-chalk edge texture and a little dust kicked off the stroke exits.
Never in the app icon, nav, favicon or any UI surface. The master stays flat.

**ज़ोर** may be used as a secondary/cultural mark — About screens, launch
marketing. Same lime, same stroke energy. Never combined with the Latin
wordmark in one lockup.

---

## 10. Deliverables

**Source**: master SVG on the 64×64 grid, outlined paths, transparent
background. Include both the **display cut** and the **small cut**.

⚠️ **Transparent background on every asset.** No baked-in colour tile behind
the mark. The only exceptions are the deliberately-tiled icons: `icon.png`, the
Android adaptive *background* layer, and the maskable PWA icon.

| File | Size | Notes |
|---|---|---|
| `zor-logo.svg` | vector | Master horizontal lockup, transparent |
| `zor-mark.svg` | vector | Slash-Z alone (display + small cuts), transparent |
| `logo-mark.png` | 760 × 290 | Horizontal lockup, transparent — in-app logo |
| `icon.png` | 1024 × 1024 | iOS icon — ink slash-Z on lime squircle, **82% fill** |
| `android-icon-foreground.png` | 1024 × 1024 | Ink slash-Z (small cut), **66% safe zone**, transparent |
| `android-icon-background.png` | 1024 × 1024 | Solid lime `#D4FF3A` |
| `android-icon-monochrome.png` | 1024 × 1024 | Solid white slash-Z on transparent, 66% safe zone |
| `splash-icon.png` | 1024 × 1024 | Lime slash-Z, transparent |
| `icon-192.png` | 192 × 192 | PWA — squircle |
| `icon-512.png` | 512 × 512 | PWA — squircle |
| `icon-512-maskable.png` | 512 × 512 | PWA maskable — **66% safe zone**, small cut |
| `apple-icon.png` | 180 × 180 | Web — squircle |
| `favicon.ico` | 16/32/48 | Multi-resolution — small cut, lime on transparent |
| `opengraph-image.png` | 1200 × 630 | Stacked lockup on ink |

---

## 11. Do not

- ❌ No curves. The strokes are straight-sided blade cuts — no swoosh, no
  ribbon, no calligraphy, no brush flicks that bend.
- ❌ No more than three strokes. No underline flourish, no fourth slash.
- ❌ No chalk texture, grain or dust in the master mark or any UI/icon asset —
  that lives only in the §9 marketing variant.
- ❌ No crossed swords, masks, hats or any Zorro pastiche. We borrow the
  gesture's memory, not the costume.
- ❌ No lightning bolt jags — the diagonal is one straight cut.
- ❌ No drawn gym equipment: no barbells, dumbbells, kettlebells, plates.
- ❌ No heart-rate line, pulse wave or ECG trace.
- ❌ No gradients, bevels, shadows, glows or outlines.
- ❌ No pure white `#FFFFFF` and no pure black `#000000`.
- ❌ Nothing white on the lime fill — use ink `#0F1508`.
- ❌ Do not over-taper into hairlines; exits stop at 3 units. Blade, not whip.

---

## 12. Ready-to-paste prompt

> Design a bold, kinetic logo for **Zor**, a fitness tracking app for strength
> training and cardio. "Zor" is Hindi/Urdu for *force, strength, exertion* —
> the idiom "zor lagao" means "give it everything you've got".
>
> The mark is the letter **Z slashed in three fast strokes**, as if swiped in
> gym chalk across a lifting platform: stroke one, the top bar, left to right;
> stroke two, the diagonal, cutting down from top-right to bottom-left; stroke
> three, the bottom bar, left to right. Each stroke is a straight-sided blade
> cut — thick where it starts (10 units on a 64×64 grid, 44 cap height) and
> tapering to 3 units over its final third, with an angled blade entry. The top
> and bottom strokes rise about 3° left-to-right, parallel to each other, and
> overshoot the diagonal's joins by 2–3 units. Where strokes meet they overlap
> like real slashes; they do not neatly mitre. Bottom stroke slightly longer
> than the top (42 vs 38 units) so the mark sits planted on its baseline.
>
> Critical: straight edges only — no curves, no swoosh, no ribbon, no
> calligraphic swelling, no lightning-bolt jags. The energy comes entirely from
> taper, tilt and overshoot. Flat vector, clean paths, no chalk texture or dust
> — the chalk idea is carried by the stroke behaviour alone. It must still read
> instantly as the letter Z.
>
> Colour: electric lime `#D4FF3A` on cool near-black `#0B0D12`. Also supply: an
> inverted light version (ink `#0B0D12` on warm cream `#F9F4E1`), a chalk-white
> version (`#F4F0E6` on ink), and a monochrome version. One colour per mark,
> never pure white or pure black.
>
> Also produce the app icon: a solid full-bleed lime `#D4FF3A` squircle
> (superellipse, 22% corner radius) with the slash-Z knocked out in ink
> `#0B0D12`, cap height 46% of the tile.
>
> Wordmark: lowercase `zor` where the slash-Z mark itself is the letter z,
> leading the word like a signed initial, followed by a calm, clean geometric
> `o` and `r` (Clash Display / Space Grotesk). One kinetic letter, two quiet
> ones — do not add energy to the o or r.
>
> Deliver: mark alone; a small-size cut with reduced taper (10→6) and no
> overshoot for favicon use; the squircle app icon; horizontal lockup (mark +
> "or"); stacked lockup. Transparent backgrounds on everything except the
> squircle icon. Must stay legible at 16 px.
