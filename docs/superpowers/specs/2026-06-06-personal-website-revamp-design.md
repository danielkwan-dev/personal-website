# Personal Website Revamp — Design Spec
**Date:** 2026-06-06

## Overview

Full revamp of `daniel.uwce.ca` to a minimal, space-themed single-page site inspired by aadikulshrestha.ca. All existing multi-section content (About, Blog, Resume section, skills, etc.) is removed. Only four links are preserved: LinkedIn, Email, GitHub, Resume.

---

## Architecture

**Files changed:**
- `index.html` — completely replaced
- `styles.css` — completely replaced
- `main.js` — completely replaced
- `blog-post.css` — deleted
- `blog/` folder — deleted

**Files kept:**
- `Daniel_Kwan_Resume.pdf` — linked from RESUME button
- `favicon.jpg` — kept
- `CNAME` — kept
- `robots.txt` — kept

No build step. No frameworks. Pure HTML/CSS/JS.

---

## Page Flow

### 1. Splash Screen
- Fullscreen dark overlay covering the entire viewport.
- Centered vertically and horizontally:
  - Name: `DANIEL KWAN` in Bebas Neue, ~10–14vw, white, uppercase
  - Below name: `ENTER` button — small caps monospace, minimal border, white
- Clicking ENTER:
  1. Fades out the splash overlay (CSS opacity transition, ~0.8s)
  2. Triggers Interstellar theme music (YouTube iframe `src` is set on click to avoid autoplay block)
  3. Main page content fades in

### 2. Main Page
After splash fades, user sees:
- Full-viewport dark space background (canvas stars)
- Central animated nebula element (CSS)
- Name + subtitle centered
- Bottom links bar

---

## Visual Design

### Background
- `body` background: `#050810` (near-black with slight blue tint)
- Canvas element fixed to viewport, full-size, z-index 0
- Canvas draws: ~150–200 sparse white dots (stars) that twinkle slowly via sine-wave alpha animation. No shooting stars, no spaceships, no dust.

### Central Animated Element (Nebula / Blackhole)
Pure CSS, centered absolutely on the page, behind the text (z-index 1).

Structure (nested divs):
- `.nebula-core` — small circle (~80px), white/bright-blue radial gradient, `box-shadow` glow, slow pulse animation (scale 0.95↔1.05, 3s ease-in-out infinite)
- `.nebula-ring-1` — larger circle (~280px), conic-gradient (deep blue → purple → transparent → deep blue), `border-radius: 50%`, slow clockwise rotation (60s linear infinite), low opacity (~0.35), blurred
- `.nebula-ring-2` — larger circle (~420px), conic-gradient offset, counter-clockwise rotation (90s), lower opacity (~0.2), more blur
- `.nebula-glow` — largest circle (~600px), radial-gradient (blue-purple → transparent), no rotation, slow pulse opacity (0.15↔0.3, 4s ease-in-out infinite)

The overall effect: a glowing nucleus surrounded by slowly drifting colored halos, like a nebula or accretion disk.

### Typography
- **Name:** `DANIEL KWAN` — Bebas Neue, `clamp(4rem, 10vw, 9rem)`, white, letter-spacing 0.05em
- **Subtitle:** `Computer Engineering @ uWaterloo` — JetBrains Mono, `clamp(0.75rem, 1.5vw, 1rem)`, `rgba(255,255,255,0.5)`, letter-spacing 0.1em
- Both centered horizontally, positioned at ~35% from the top of the viewport (above the nebula's visual center so they don't compete). The nebula is centered at 50% viewport height. There is ~4rem gap between the subtitle and the top of the nebula glow.

### Bottom Links
Fixed to the bottom of the viewport, centered horizontally. Order: `LINKEDIN` `EMAIL` `GITHUB` `RESUME`

- Font: JetBrains Mono, ~0.8rem, uppercase, letter-spacing 0.15em
- Color: `rgba(255,255,255,0.55)` at rest
- Hover: `rgba(255,255,255,1)`, underline
- Spacing: `gap: 2.5rem` between links
- No icons — text labels only (matching Aadi's style)
- RESUME links to `Daniel_Kwan_Resume.pdf` (download attribute)
- EMAIL uses `mailto:d35kwan@uwaterloo.ca`
- LINKEDIN opens `https://www.linkedin.com/in/daniel-kwan-923071220/` in new tab
- GITHUB opens `https://github.com/danielkwan-dev` in new tab

---

## Music

Hidden YouTube iframe (`width=0`, `height=0`, `display:none`), inserted into the DOM on ENTER click with the Interstellar main theme video URL and `autoplay=1&mute=0` parameters. The iframe `src` is set dynamically (not on page load) to bypass browser autoplay restrictions — the user gesture from clicking ENTER satisfies the browser's autoplay policy.

YouTube search query to find video at implementation time: `Interstellar Main Theme Hans Zimmer`. Use the official Warner Bros. or Hans Zimmer channel upload if available for stability. Set iframe `allow="autoplay"` attribute.

---

## Animations Summary

| Element | Animation | Duration |
|---|---|---|
| Splash overlay | Fade out (opacity 1→0) | 0.8s ease |
| Main content | Fade in (opacity 0→1) | 1s ease, 0.4s delay |
| Nebula core | Pulse scale (0.95↔1.05) | 3s ease-in-out infinite |
| Nebula ring 1 | Clockwise rotate | 60s linear infinite |
| Nebula ring 2 | Counter-clockwise rotate | 90s linear infinite |
| Nebula glow | Pulse opacity (0.15↔0.3) | 4s ease-in-out infinite |
| Stars (canvas) | Twinkle via sine alpha | Per-star random phase |

---

## Links / Data

| Label | Value |
|---|---|
| LINKEDIN | `https://www.linkedin.com/in/daniel-kwan-923071220/` |
| EMAIL | `mailto:d35kwan@uwaterloo.ca` |
| GITHUB | `https://github.com/danielkwan-dev` |
| RESUME | `Daniel_Kwan_Resume.pdf` (download) |
