# Personal Website Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing multi-section portfolio with a minimal, space-themed single-page site featuring a splash screen, animated nebula, Interstellar music, and four bottom links.

**Architecture:** Pure HTML/CSS/JS, no build step, no frameworks. Three files (index.html, styles.css, main.js) are completely replaced. Blog files are deleted. The nebula is CSS-only; the star field is a lightweight canvas animation; music plays via a hidden YouTube iframe triggered on ENTER click.

**Tech Stack:** HTML5, CSS3 (conic-gradient, keyframe animations), vanilla JS (Canvas 2D API), Google Fonts (Bebas Neue, JetBrains Mono), YouTube iframe API (no SDK needed)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Delete | `blog-post.css` | No longer needed |
| Delete | `blog/intro-to-ml.html` | No longer needed |
| Delete | `blog/1a-review.html` | No longer needed |
| Replace | `index.html` | HTML structure: splash, canvas, nebula, content, links, iframe |
| Replace | `styles.css` | All visual styles and animations |
| Replace | `main.js` | Star canvas + ENTER click handler (fade splash, start music) |
| Keep | `Daniel_Kwan_Resume.pdf` | Linked from RESUME button |
| Keep | `favicon.jpg` | Page icon |
| Keep | `CNAME` | GitHub Pages domain |
| Keep | `robots.txt` | SEO |

---

## Task 1: Delete old files

**Files:**
- Delete: `blog-post.css`
- Delete: `blog/intro-to-ml.html`
- Delete: `blog/1a-review.html`
- Delete: `blog/` (directory, if empty after above)

- [ ] **Step 1: Delete blog files**

```bash
rm personal-website/blog-post.css
rm personal-website/blog/intro-to-ml.html
rm personal-website/blog/1a-review.html
rmdir personal-website/blog
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete blog files and blog-post.css"
```

---

## Task 2: Write index.html

**Files:**
- Modify: `index.html` (complete replacement)

- [ ] **Step 1: Replace index.html with the following**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daniel Kwan</title>
  <link rel="canonical" href="https://daniel.uwce.ca">
  <link rel="icon" type="image/jpeg" href="favicon.jpg">
  <meta property="og:title" content="Daniel Kwan">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://daniel.uwce.ca">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <div id="splash">
    <h1 class="splash-name">Daniel Kwan</h1>
    <button id="enter-btn">ENTER</button>
  </div>

  <main id="main" aria-hidden="true">
    <canvas id="stars"></canvas>
    <div class="nebula">
      <div class="nebula-glow"></div>
      <div class="nebula-ring-2"></div>
      <div class="nebula-ring-1"></div>
      <div class="nebula-core"></div>
    </div>
    <div class="content">
      <h2 class="name">Daniel Kwan</h2>
      <p class="subtitle">Computer Engineering @ uWaterloo</p>
    </div>
    <nav class="bottom-links">
      <a href="https://www.linkedin.com/in/daniel-kwan-923071220/" target="_blank" rel="noopener noreferrer">LINKEDIN</a>
      <a href="mailto:d35kwan@uwaterloo.ca">EMAIL</a>
      <a href="https://github.com/danielkwan-dev" target="_blank" rel="noopener noreferrer">GITHUB</a>
      <a href="Daniel_Kwan_Resume.pdf" download>RESUME</a>
    </nav>
    <iframe id="music" allow="autoplay" title="background music"></iframe>
  </main>

  <script src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open index.html in a browser**

Verify: page is completely blank/black (no styles yet). No errors in the browser console. Confirm the file loaded.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add minimal HTML structure"
```

---

## Task 3: Write CSS — base, splash, and ENTER button

**Files:**
- Modify: `styles.css` (complete replacement — start fresh, paste the blocks below one task at a time)

- [ ] **Step 1: Replace styles.css with the base + splash styles**

```css
/* === Reset & Base === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  background: #050810;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}

/* === Splash === */
#splash {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #050810;
  transition: opacity 0.8s ease;
}

#splash.fade-out {
  opacity: 0;
  pointer-events: none;
}

.splash-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(4rem, 12vw, 10rem);
  letter-spacing: 0.05em;
  color: #fff;
  margin-bottom: 2.5rem;
}

#enter-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.65);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.6rem 2.2rem;
  cursor: pointer;
  text-transform: uppercase;
  transition: color 0.3s, border-color 0.3s;
}

#enter-btn:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.65);
}

/* === Main (hidden until ENTER clicked) === */
#main {
  position: fixed;
  inset: 0;
  opacity: 0;
  transition: opacity 1s ease 0.4s;
}

#main.visible {
  opacity: 1;
}

/* === Music iframe (invisible) === */
#music {
  display: none;
  width: 0;
  height: 0;
  border: none;
}
```

- [ ] **Step 2: Open index.html in browser**

Verify: dark background, "DANIEL KWAN" name in large Bebas Neue, "ENTER" button beneath it with subtle border. Hovering ENTER brightens text and border.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add splash and base CSS"
```

---

## Task 4: Write CSS — canvas stars

**Files:**
- Modify: `styles.css` (append to end of file)

- [ ] **Step 1: Append star canvas styles to styles.css**

```css
/* === Star canvas === */
#stars {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
```

No visual verification needed yet — canvas is drawn by JS in Task 6.

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat: add star canvas CSS"
```

---

## Task 5: Write CSS — nebula

**Files:**
- Modify: `styles.css` (append to end of file)

- [ ] **Step 1: Append nebula styles to styles.css**

```css
/* === Nebula === */
.nebula {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  width: 600px;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.nebula-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(30, 60, 140, 0.25) 0%,
    rgba(80, 20, 120, 0.12) 45%,
    transparent 70%
  );
  animation: pulse-glow 4s ease-in-out infinite;
}

.nebula-ring-2 {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    rgba(60, 20, 100, 0.25) 25%,
    rgba(100, 50, 180, 0.18) 50%,
    rgba(20, 60, 140, 0.12) 75%,
    transparent 100%
  );
  filter: blur(18px);
  opacity: 0.55;
  animation: rotate-ccw 90s linear infinite;
}

.nebula-ring-1 {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: conic-gradient(
    from 90deg,
    transparent 0%,
    rgba(80, 30, 160, 0.35) 25%,
    rgba(140, 60, 220, 0.25) 50%,
    rgba(40, 90, 200, 0.18) 75%,
    transparent 100%
  );
  filter: blur(10px);
  opacity: 0.65;
  animation: rotate-cw 60s linear infinite;
}

.nebula-core {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(210, 225, 255, 0.95) 0%,
    rgba(130, 165, 255, 0.6) 40%,
    rgba(60, 80, 200, 0.2) 70%,
    transparent 100%
  );
  box-shadow:
    0 0 40px 10px rgba(120, 160, 255, 0.45),
    0 0 80px 25px rgba(80, 100, 200, 0.2);
  animation: pulse-core 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.06); }
}

@keyframes rotate-cw {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes rotate-ccw {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}

@keyframes pulse-core {
  0%, 100% {
    transform: scale(0.95);
    box-shadow: 0 0 40px 10px rgba(120,160,255,0.45), 0 0 80px 25px rgba(80,100,200,0.2);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 60px 16px rgba(150,190,255,0.65), 0 0 110px 35px rgba(80,100,200,0.3);
  }
}
```

- [ ] **Step 2: Temporarily make #main visible for testing**

In browser DevTools console, run:
```js
document.getElementById('main').classList.add('visible');
```

Verify: animated nebula visible at center — glowing white core, two slowly rotating colored rings, pulsing outer glow. All CSS animations running.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add nebula CSS animations"
```

---

## Task 6: Write CSS — content and bottom links

**Files:**
- Modify: `styles.css` (append to end of file)

- [ ] **Step 1: Append content and bottom link styles to styles.css**

```css
/* === Main content (name + subtitle) === */
.content {
  position: fixed;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  text-align: center;
  pointer-events: none;
}

.name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(3.5rem, 9vw, 8rem);
  letter-spacing: 0.05em;
  color: #fff;
  line-height: 1;
  margin-bottom: 0.75rem;
}

.subtitle {
  font-size: clamp(0.65rem, 1.4vw, 0.85rem);
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

/* === Bottom links === */
.bottom-links {
  position: fixed;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 2.5rem;
  white-space: nowrap;
}

.bottom-links a {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  text-transform: uppercase;
  transition: color 0.25s;
}

.bottom-links a:hover {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

- [ ] **Step 2: Verify in browser DevTools**

Run in console:
```js
document.getElementById('main').classList.add('visible');
```

Verify:
- "DANIEL KWAN" in large Bebas Neue in the upper portion of the page
- "COMPUTER ENGINEERING @ UWATERLOO" in small muted mono below name
- Bottom: LINKEDIN EMAIL GITHUB RESUME spaced evenly, dimmed white
- Hovering a link brightens it to full white with underline
- Nebula still animating behind text

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add content and bottom links CSS"
```

---

## Task 7: Write main.js — star field

**Files:**
- Modify: `main.js` (complete replacement)

- [ ] **Step 1: Replace main.js with the following**

```js
initStars();

function initStars() {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w, h;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.1 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.5 + 0.3  // rad/s — gives 8–20s twinkle periods
    }));
  }

  let start = null;
  function draw(ts) {
    if (!start) start = ts;
    const t = (ts - start) / 1000;  // seconds since page load
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
}
```

- [ ] **Step 2: Verify in browser DevTools**

Run in console:
```js
document.getElementById('main').classList.add('visible');
```

Verify: ~180 stars twinkling gently across the dark background. Stars should vary slightly in brightness over time. No flickering or performance issues.

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add canvas star field"
```

---

## Task 8: Write main.js — ENTER button handler and music

**Files:**
- Modify: `main.js` (append to end of file)

**Before this task:** Find the Interstellar Main Theme on YouTube.
1. Go to YouTube and search: `Interstellar Main Theme Hans Zimmer`
2. Pick a stable upload (preferably from WaterTower Music or an official channel)
3. Copy the video ID — it's the part after `?v=` in the URL, e.g. for `https://www.youtube.com/watch?v=RxabLA7UQ9k` the ID is `RxabLA7UQ9k`
4. Paste it in as the value of `VIDEO_ID` below

- [ ] **Step 1: Append ENTER handler to main.js**

```js
(function initEnter() {
  const VIDEO_ID = 'PASTE_VIDEO_ID_HERE';

  document.getElementById('enter-btn').addEventListener('click', () => {
    const splash = document.getElementById('splash');
    const main   = document.getElementById('main');
    const iframe = document.getElementById('music');

    splash.classList.add('fade-out');
    main.removeAttribute('aria-hidden');
    main.classList.add('visible');

    iframe.src = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&controls=0&loop=1&playlist=${VIDEO_ID}&rel=0`;

    setTimeout(() => splash.remove(), 900);
  });
}());
```

- [ ] **Step 2: Verify end-to-end in browser**

Open `index.html` in the browser (or visit the deployed URL):

1. See splash: "DANIEL KWAN" + ENTER button
2. Click ENTER
3. Splash fades out over ~0.8s
4. Main page fades in — stars, nebula, name, subtitle, bottom links all visible
5. Interstellar theme begins playing within 1–2 seconds
6. Click LINKEDIN → opens LinkedIn in new tab
7. Click EMAIL → opens email client with `d35kwan@uwaterloo.ca`
8. Click GITHUB → opens GitHub in new tab
9. Click RESUME → downloads `Daniel_Kwan_Resume.pdf`

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "feat: add ENTER handler with splash fade and music"
```

---

## Task 9: Final cleanup and deploy

- [ ] **Step 1: Verify no leftover files from old site**

```bash
ls personal-website/
```

Expected output should NOT include: `blog-post.css`, `blog/`, `placeholder.svg`, `daniel-profile-nobg.png` (the profile image is no longer used).

Delete unused assets:
```bash
rm personal-website/placeholder.svg
rm personal-website/daniel-profile-nobg.png
```

- [ ] **Step 2: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove unused assets"
```

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```

- [ ] **Step 4: Verify deployed site**

Visit `https://daniel.uwce.ca` (allow 1–2 minutes for GitHub Pages to update if needed).

Run through the full end-to-end check from Task 8 Step 2 on the live URL.
