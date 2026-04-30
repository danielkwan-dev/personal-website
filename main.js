// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Set current year in footer (if element exists)
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Initialize all functionality
  initNavigation();
  initMobileMenu();
  initScrollAnimations();
  const sf = initStarField();
  initTypewriter();
  initNameScramble();
  initThemeToggle(sf && sf.setDayMode);
});

// Day/Night theme toggle
function initThemeToggle(setDayMode) {
  const btn = document.getElementById('themeToggle');
  const sunIcon = document.getElementById('iconSun');
  const moonIcon = document.getElementById('iconMoon');
  if (!btn) return;

  let isDay = false;

  btn.addEventListener('click', function() {
    isDay = !isDay;
    document.body.classList.toggle('day-mode', isDay);
    sunIcon.style.display = isDay ? 'none' : 'block';
    moonIcon.style.display = isDay ? 'block' : 'none';
    if (setDayMode) setDayMode(isDay);
  });
}

// Typewriter effect for "Computer Engineering @ uWaterloo"
function initTypewriter() {
  const el = document.getElementById('waterloo-typewriter');
  if (!el) return;

  const text = 'Computer Engineering @ uWaterloo';
  const splitAt = 'Computer Engineering @ '.length; // muted up to here, colored after
  let i = 0;

  function render(len) {
    if (len <= splitAt) {
      el.innerHTML = `<span class="tagline-muted">${text.slice(0, len)}</span>`;
    } else {
      el.innerHTML = `<span class="tagline-muted">${text.slice(0, splitAt)}</span><span class="tagline-colored">${text.slice(splitAt, len)}</span>`;
    }
  }

  function tick() {
    render(i + 1);
    i++;
    if (i < text.length) {
      setTimeout(tick, 40);
    }
  }

  setTimeout(tick, 800);
}

// Scramble / split-flap effect for hero name
function initNameScramble() {
  const el = document.querySelector('.hero-name');
  if (!el) return;

  const finalText = el.textContent.trim().toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const flipHalf       = 42;  // ms per half-flip — fast, visible
  const flipsPerLetter = 9;   // random flips before each letter locks in
  const letterDelay    = 160; // ms between each letter appearing/starting

  el.classList.add('name-scrambling');

  // Build tile structure; store full-text index on each span
  el.innerHTML = finalText.split('').map((ch, idx) => {
    const rand = chars[Math.floor(Math.random() * chars.length)];
    return ch === ' '
      ? `<span class="name-letter name-letter-space" data-idx="${idx}"> </span>`
      : `<span class="name-letter" data-final="${ch}" data-idx="${idx}">
           <span class="l-flap"><span class="l-text">${rand}</span></span>
           <span class="l-base"><span class="l-text">${rand}</span></span>
           <span class="l-line"></span>
         </span>`;
  }).join('');

  const allSpans    = Array.from(el.querySelectorAll('.name-letter'));
  const letterSpans = Array.from(el.querySelectorAll('.name-letter[data-final]'));
  let resolvedCount = 0;

  // Fold top flap down, swap char, fold back up
  function flipTo(span, newChar, done) {
    const flap = span.querySelector('.l-flap');
    flap.style.transition = `transform ${flipHalf}ms ease-in`;
    flap.style.transform  = 'perspective(400px) rotateX(-90deg)';
    setTimeout(() => {
      flap.querySelector('.l-text').textContent    = newChar;
      span.querySelector('.l-base .l-text').textContent = newChar;
      flap.style.transition = `transform ${flipHalf}ms ease-out`;
      flap.style.transform  = 'perspective(400px) rotateX(0deg)';
      if (done) setTimeout(done, flipHalf);
    }, flipHalf);
  }

  function scramble(span, remaining, onDone) {
    if (remaining <= 0) { onDone(); return; }
    flipTo(span, chars[Math.floor(Math.random() * chars.length)], () =>
      scramble(span, remaining - 1, onDone)
    );
  }

  // Fade each tile in at its natural position in the sequence
  allSpans.forEach(span => {
    const idx = parseInt(span.dataset.idx);
    setTimeout(() => span.classList.add('name-letter-visible'), idx * letterDelay);
  });

  // Scramble each letter tile (delay matches its position in the word)
  letterSpans.forEach(span => {
    const idx = parseInt(span.dataset.idx);
    setTimeout(() => {
      span.classList.add('name-letter-active');
      scramble(span, flipsPerLetter, () => {
        flipTo(span, span.dataset.final, () => {
          // Clear inline transform so CSS idle-flutter animation can take over
          const flap = span.querySelector('.l-flap');
          flap.style.transition = '';
          flap.style.transform  = '';
          span.classList.remove('name-letter-active');
          span.classList.add('name-letter-resolved');

          resolvedCount++;
          if (resolvedCount === letterSpans.length) {
            // All letters locked — fade out borders/lines, keep layout in place
            setTimeout(() => el.classList.add('name-scramble-done'), 500);
          }
        });
      });
    }, idx * letterDelay);
  });
}

// Navigation
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  const sections = document.querySelectorAll('.section');

  // Smooth scroll to sections
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');

      // Only handle pure anchor links (#section) on the current page
      if (href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
          const offsetTop = targetSection.offsetTop - 64;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }

        closeMobileMenu();
      }
      // For links like ../index.html#about, let the browser navigate normally
    });
  });

  // Update active nav link on scroll
  window.addEventListener('scroll', function() {
    let current = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;

      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-section') === current) {
        link.classList.add('active');
      }
    });
  });
}

// Mobile Menu
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  mobileMenuBtn.addEventListener('click', function() {
    this.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });
}

function closeMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  mobileMenuBtn.classList.remove('active');
  mobileMenu.classList.remove('active');
}

// Scroll Animations
function initScrollAnimations() {
  const fadeElements = document.querySelectorAll('.fade-in-up');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '-50px'
  });

  fadeElements.forEach(el => observer.observe(el));
}

// Star Field
function initStarField() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Configuration - REDUCED for performance
  const config = {
    starCount: 0,
    dustCount: 15,        // Reduced from 30
    shootingStarCount: 2, // Reduced from 3
    targetFPS: 24         // Reduced from 30
  };

  // State
  let farStars = [];      // Pre-separated for no filtering
  let nearStars = [];     // Pre-separated for no filtering
  let shootingStars = [];
  let spaceships = [];
  let nebulae = [];
  let dust = [];
  let planet = null;
  let time = 0;

  const earthImg = new Image();
  earthImg.src = './earth.png';
  const marsImg = new Image();
  marsImg.src = './mars.jpg';
  let animationId = null;
  let lastTime = 0;
  let bgGradient = null;  // Cache background gradient
  const frameInterval = 1000 / config.targetFPS;

  // Theme transition state
  let themeTransition = null; // { from, to, progress, duration, oldPlanet, newPlanet }

  // Theme definitions
  let isDayMode = false;
  const nightTheme = {
    background: { h: 220, s: 20, l: 10 },
    foreground: { h: 210, s: 40, l: 98 },
    primary: { h: 180, s: 70, l: 50 },
    accent: { h: 280, s: 70, l: 60 }
  };
  const dayTheme = {
    background: { h: 230, s: 15, l: 6 },
    foreground: { h: 40, s: 20, l: 90 },
    primary: { h: 38, s: 60, l: 55 },
    accent: { h: 22, s: 45, l: 52 }
  };
  const theme = {
    background: { ...nightTheme.background },
    foreground: { ...nightTheme.foreground },
    primary: { ...nightTheme.primary },
    accent: { ...nightTheme.accent }
  };

  // Helper functions
  function hsl(c, a = 1) {
    return `hsl(${c.h} ${c.s}% ${c.l}% / ${a})`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function mixLightness(c, delta) {
    return {
      h: c.h,
      s: c.s,
      l: clamp(c.l + delta, 0, 100)
    };
  }

  function lerpVal(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(a, b, t) {
    // Handle hue wrapping (shortest path)
    let dh = b.h - a.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    return {
      h: (a.h + dh * t + 360) % 360,
      s: lerpVal(a.s, b.s, t),
      l: lerpVal(a.l, b.l, t)
    };
  }

  function lerpTheme(from, to, t) {
    theme.background = lerpColor(from.background, to.background, t);
    theme.foreground = lerpColor(from.foreground, to.foreground, t);
    theme.primary = lerpColor(from.primary, to.primary, t);
    theme.accent = lerpColor(from.accent, to.accent, t);
    // Invalidate cached gradient so it rebuilds
    bgGradient = null;
  }

  // Initialize scene
  function initScene() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25); // Reduced DPR
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cache background gradient
    bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, hsl(mixLightness(theme.background, -2), 1));
    bgGradient.addColorStop(0.55, hsl(mixLightness(theme.background, -6), 1));
    bgGradient.addColorStop(1, hsl(mixLightness(theme.background, -12), 1));

    const area = w * h;
    config.starCount = Math.floor(area / 4000); // Reduced star density

    // Create stars - pre-separate into layers
    const starTints = [
      mixLightness(theme.foreground, -6),
      mixLightness(theme.primary, 18),
      mixLightness(theme.accent, 10)
    ];

    farStars = [];
    nearStars = [];

    for (let i = 0; i < config.starCount; i++) {
      const isFar = Math.random() < 0.85; // More far stars (simpler to draw)
      const base = isFar ? 0.25 : 0.4;
      const alphaMul = 1;
      const star = {
        x: Math.random() * w,
        y: Math.random() * h,
        r: isFar ? Math.random() * 0.8 + 0.3 : Math.random() * 1.5 + 0.5,
        baseAlpha: (Math.random() * 0.4 + base) * alphaMul,
        twinkleSpeed: Math.random() * 0.01 + 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
        tint: starTints[Math.floor(Math.random() * starTints.length)]
      };
      if (isFar) {
        farStars.push(star);
      } else {
        nearStars.push(star);
      }
    }

    // Reset spaceships — spawn one immediately so the user sees it on load
    spaceships = [createSpaceship(w, h)];

    // Create shooting stars
    shootingStars = Array.from({ length: config.shootingStarCount }, () => ({
      x: 0,
      y: 0,
      length: 0,
      speed: 0,
      alpha: 0,
      angle: 0,
      active: false
    }));

    // Create nebulae
    nebulae = [
      {
        x: w * 0.25,
        y: h * 0.35,
        radius: Math.min(w, h) * 0.35,
        tint: mixLightness(theme.primary, 6),
        baseAlpha: 0.06,
        pulsePhase: 0
      },
      {
        x: w * 0.75,
        y: h * 0.65,
        radius: Math.min(w, h) * 0.3,
        tint: mixLightness(theme.accent, -4),
        baseAlpha: 0.05,
        pulsePhase: Math.PI
      }
    ];

    // Create dust
    dust = Array.from({ length: config.dustCount }, () => createDust(w, h));

    // Create planet — Earth = dark/default (bottom-left), Mars = light (top-right)
    if (isDayMode) {
      planet = {
        x: w * 0.82,
        y: h * 0.13,
        r: Math.min(w, h) * 0.12,
        wobblePhase: Math.random() * Math.PI * 2,
        isEarth: false
      };
    } else {
      planet = {
        x: w * 0.12,
        y: h * 0.7,
        r: Math.min(w, h) * 0.18,
        wobblePhase: Math.random() * Math.PI * 2,
        isEarth: true
      };
    }
  }

  function createDust(w, h) {
    const choices = [
      mixLightness(theme.primary, 10),
      mixLightness(theme.primary, -5),
      mixLightness(theme.accent, 5),
      mixLightness(theme.accent, -10)
    ];

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 2.6 + 0.7,
      alpha: Math.random() * 0.35 + 0.08,
      tint: choices[Math.floor(Math.random() * choices.length)],
      life: Math.random() * 500,
      maxLife: 550 + Math.random() * 650
    };
  }

  function createSpaceship(w, h) {
    // Pick a random edge: 0=left, 1=right, 2=top, 3=bottom
    const edge = Math.floor(Math.random() * 4);
    let x, y, angle;

    switch (edge) {
      case 0: // from left
        x = -30;
        y = Math.random() * h * 0.7 + h * 0.1;
        angle = (Math.random() - 0.5) * 0.5; // mostly rightward
        break;
      case 1: // from right
        x = w + 30;
        y = Math.random() * h * 0.7 + h * 0.1;
        angle = Math.PI + (Math.random() - 0.5) * 0.5; // mostly leftward
        break;
      case 2: // from top
        x = Math.random() * w * 0.8 + w * 0.1;
        y = -30;
        angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6; // mostly downward
        break;
      default: // from bottom
        x = Math.random() * w * 0.8 + w * 0.1;
        y = h + 30;
        angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6; // mostly upward
        break;
    }

    return {
      x: x,
      y: y,
      speed: Math.random() * 0.8 + 1.4,
      size: Math.random() * 3 + 6,
      alpha: Math.random() * 0.15 + 0.5,
      angle: angle,
      drift: 0,
      driftTarget: 0,
      driftTimer: 0,
      engineFlicker: Math.random() * Math.PI * 2,
      smokeTrail: [],
      active: true
    };
  }

  function spawnSpaceship(w, h) {
    if (spaceships.length >= 2) return;
    if (Math.random() < 0.003) {
      spaceships.push(createSpaceship(w, h));
    }
  }

  function spawnShootingStar(w, h) {
    const s = shootingStars.find(st => !st.active);
    if (!s) return;

    if (Math.random() < 0.018) {
      s.x = Math.random() * w * 0.85;
      s.y = Math.random() * h * 0.35;
      s.length = Math.random() * 160 + 120;
      s.speed = Math.random() * 22 + 16;
      s.alpha = 1;
      s.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.35;
      s.active = true;
    }
  }

  function animate(currentTime) {
    const delta = currentTime - lastTime;
    if (delta < frameInterval) {
      animationId = requestAnimationFrame(animate);
      return;
    }
    lastTime = currentTime - (delta % frameInterval);

    const w = window.innerWidth;
    const h = window.innerHeight;
    time += 0.02;

    // Advance theme transition if active
    if (themeTransition) {
      const tt = themeTransition;
      tt.progress += 1 / tt.duration;
      if (tt.progress >= 1) {
        tt.progress = 1;
        lerpTheme(tt.from, tt.to, 1);
        planet = tt.newPlanet;
        planet.transAlpha = 1;
        if (nebulae.length >= 2) {
          nebulae[0].tint = mixLightness(theme.primary, 6);
          nebulae[1].tint = mixLightness(theme.accent, -4);
        }
        themeTransition = null;
      } else {
        const ease = tt.progress < 0.5
          ? 2 * tt.progress * tt.progress
          : 1 - Math.pow(-2 * tt.progress + 2, 2) / 2;
        lerpTheme(tt.from, tt.to, ease);
        if (nebulae.length >= 2) {
          nebulae[0].tint = mixLightness(theme.primary, 6);
          nebulae[1].tint = mixLightness(theme.accent, -4);
        }
        // Fade out all old planets from their current alpha
        for (const op of tt.oldPlanets) {
          op.transAlpha = Math.max(0, op.transAlpha - 1.5 / tt.duration);
        }
        // Remove fully faded old planets
        tt.oldPlanets = tt.oldPlanets.filter(op => op.transAlpha > 0.01);
        // Fade in new planet
        if (tt.newPlanet) tt.newPlanet.transAlpha = Math.min(1, tt.newPlanet.transAlpha + 1.2 / tt.duration);
      }
    }

    // Rebuild background gradient if invalidated
    if (!bgGradient) {
      bgGradient = ctx.createLinearGradient(0, 0, 0, h);
      bgGradient.addColorStop(0, hsl(mixLightness(theme.background, -2), 1));
      bgGradient.addColorStop(0.55, hsl(mixLightness(theme.background, -6), 1));
      bgGradient.addColorStop(1, hsl(mixLightness(theme.background, -12), 1));
    }

    // Clear and draw background
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw nebula - simplified, no drift
    for (const n of nebulae) {
      const pulse = Math.sin(time * 0.5 + n.pulsePhase);
      const a = n.baseAlpha * (0.85 + 0.15 * pulse);

      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      g.addColorStop(0, hsl(mixLightness(n.tint, 12), a));
      g.addColorStop(0.5, hsl(n.tint, a * 0.4));
      g.addColorStop(1, 'hsl(0 0% 0% / 0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw far stars - SIMPLE circles, no gradients
    for (const s of farStars) {
      const tw = Math.sin(time * s.twinkleSpeed * 40 + s.twinklePhase);
      const a = clamp(s.baseAlpha * (0.6 + 0.4 * tw), 0, 1);

      ctx.globalAlpha = a;
      ctx.fillStyle = hsl(s.tint, 1);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw dust - simplified
    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      d.x += d.vx;
      d.y += d.vy;
      d.life += 1;

      const t = d.life / d.maxLife;
      let a = d.alpha;
      if (t < 0.15) a *= t / 0.15;
      if (t > 0.85) a *= (1 - t) / 0.15;

      if (d.life >= d.maxLife || d.x < -20 || d.x > w + 20 || d.y < -20 || d.y > h + 20) {
        dust[i] = createDust(w, h);
        continue;
      }

      ctx.globalAlpha = a;
      ctx.fillStyle = hsl(d.tint, 1);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw Earth or Mars using a photo texture
    function drawPlanetBody(p, alphaOverride) {
      const alpha = alphaOverride !== undefined ? alphaOverride : 1;
      if (alpha <= 0.01) return;

      const slideOffset = (1 - alpha) * h * 0.3;
      const wobble = Math.sin(time * 0.15 + p.wobblePhase) * (p.r * 0.008);
      const cx = p.x + wobble;
      const cy = p.y + wobble * 0.5 + (p.isEarth ? slideOffset : -slideOffset);

      const img = p.isEarth ? earthImg : marsImg;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer atmospheric glow
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glowStop = p.isEarth ? 'rgba(70, 140, 255, 0.22)' : 'rgba(200, 80, 30, 0.2)';
      const outerGlow = ctx.createRadialGradient(cx, cy, p.r * 0.82, cx, cy, p.r * 1.5);
      outerGlow.addColorStop(0, glowStop);
      outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, p.r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Planet image clipped to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
      ctx.clip();
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, cx - p.r, cy - p.r, p.r * 2, p.r * 2);
      } else {
        ctx.fillStyle = p.isEarth ? '#1a4a8a' : '#7a3520';
        ctx.fill();
      }
      ctx.restore();

      // Terminator shadow (dark side)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
      ctx.clip();
      const terminator = ctx.createLinearGradient(cx - p.r, cy, cx + p.r, cy);
      terminator.addColorStop(0,    'rgba(0,0,0,0)');
      terminator.addColorStop(0.45, 'rgba(0,0,0,0)');
      terminator.addColorStop(0.78, 'rgba(0,0,0,0.28)');
      terminator.addColorStop(1,    'rgba(0,0,0,0.7)');
      ctx.fillStyle = terminator;
      ctx.fillRect(cx - p.r, cy - p.r, p.r * 2, p.r * 2);
      ctx.restore();

      // Atmosphere rim glow
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rimStop = p.isEarth ? 'rgba(100, 180, 255, 0.2)' : 'rgba(220, 110, 50, 0.18)';
      const rim = ctx.createRadialGradient(cx, cy, p.r * 0.88, cx, cy, p.r * 1.1);
      rim.addColorStop(0,   'rgba(0,0,0,0)');
      rim.addColorStop(0.5, rimStop);
      rim.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, p.r * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    // Draw planets (handle transition: draw all old + new)
    if (themeTransition) {
      for (const op of themeTransition.oldPlanets) {
        drawPlanetBody(op, op.transAlpha);
      }
      if (themeTransition.newPlanet) drawPlanetBody(themeTransition.newPlanet, themeTransition.newPlanet.transAlpha);
    } else if (planet) {
      drawPlanetBody(planet);
    }

    // Draw near stars - with simple glow
    for (const s of nearStars) {
      const tw = Math.sin(time * s.twinkleSpeed * 40 + s.twinklePhase);
      const a = clamp(s.baseAlpha * (0.55 + 0.45 * tw), 0, 1);

      // Glow
      ctx.globalAlpha = a * 0.3;
      ctx.fillStyle = hsl(s.tint, 1);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw shooting stars (night only)
    spawnShootingStar(w, h);
    for (const st of shootingStars) {
      if (!st.active) continue;

      const tailX = st.x - Math.cos(st.angle) * st.length;
      const tailY = st.y - Math.sin(st.angle) * st.length;

      const g = ctx.createLinearGradient(st.x, st.y, tailX, tailY);
      g.addColorStop(0, `rgba(255,255,255,${st.alpha})`);
      g.addColorStop(0.3, hsl(theme.primary, st.alpha * 0.6));
      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      st.x += Math.cos(st.angle) * st.speed;
      st.y += Math.sin(st.angle) * st.speed;
      st.alpha -= 0.018;

      if (st.alpha <= 0 || st.x > w + 200 || st.y > h + 200) {
        st.active = false;
      }
    }

    // Draw spaceships
    spawnSpaceship(w, h);
    for (let i = spaceships.length - 1; i >= 0; i--) {
      const ship = spaceships[i];
      // Random wandering — nudge the angle periodically
      ship.driftTimer--;
      if (ship.driftTimer <= 0) {
        ship.driftTarget = (Math.random() - 0.5) * 0.012;
        ship.driftTimer = Math.floor(Math.random() * 80 + 40);
      }
      ship.drift += (ship.driftTarget - ship.drift) * 0.03;
      ship.angle += ship.drift;

      ship.x += Math.cos(ship.angle) * ship.speed;
      ship.y += Math.sin(ship.angle) * ship.speed;
      ship.engineFlicker += 0.12;

      // Remove if off screen (any edge with padding)
      if (ship.x < -80 || ship.x > w + 80 || ship.y < -80 || ship.y > h + 80) {
        spaceships.splice(i, 1);
        continue;
      }

      const s = ship.size;
      const cx = ship.x;
      const cy = ship.y;

      // Add smoke puff
      if (Math.random() < 0.35) {
        const smokeAngle = ship.angle + Math.PI; // behind the ship
        ship.smokeTrail.push({
          x: cx + Math.cos(smokeAngle) * s * 2.5 + (Math.random() - 0.5) * s * 0.3,
          y: cy + Math.sin(smokeAngle) * s * 2.5 + (Math.random() - 0.5) * s * 0.5,
          r: s * 0.3 + Math.random() * s * 0.25,
          alpha: 0.2 + Math.random() * 0.1,
          vx: Math.cos(smokeAngle) * (Math.random() * 0.2 + 0.08),
          vy: Math.sin(smokeAngle) * (Math.random() * 0.2 + 0.08) + (Math.random() - 0.5) * 0.05,
          decay: 0.003 + Math.random() * 0.003
        });
      }

      // Draw smoke trail (behind ship)
      for (let j = ship.smokeTrail.length - 1; j >= 0; j--) {
        const p = ship.smokeTrail[j];
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.06;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          ship.smokeTrail.splice(j, 1);
          continue;
        }

        ctx.globalAlpha = p.alpha * ship.alpha;
        ctx.fillStyle = 'rgba(150, 155, 165, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ship.angle);

      const a = ship.alpha;

      // --- Main fuselage ---
      ctx.fillStyle = `rgba(155, 160, 170, ${a})`;
      ctx.beginPath();
      // Pointed nose tapering to wider rear
      ctx.moveTo(s * 3.2, 0);                         // nose tip
      ctx.lineTo(s * 1.5, -s * 0.35);                 // upper nose
      ctx.lineTo(-s * 0.5, -s * 0.5);                 // upper mid
      ctx.lineTo(-s * 2, -s * 0.55);                  // upper rear
      ctx.lineTo(-s * 2.2, -s * 0.4);                 // rear top edge
      ctx.lineTo(-s * 2.2, s * 0.4);                  // rear bottom edge
      ctx.lineTo(-s * 2, s * 0.55);                   // lower rear
      ctx.lineTo(-s * 0.5, s * 0.5);                  // lower mid
      ctx.lineTo(s * 1.5, s * 0.35);                  // lower nose
      ctx.closePath();
      ctx.fill();

      // Lighter top panel
      ctx.fillStyle = `rgba(180, 185, 195, ${a * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(s * 3.2, 0);
      ctx.lineTo(s * 1.5, -s * 0.35);
      ctx.lineTo(-s * 0.5, -s * 0.5);
      ctx.lineTo(-s * 2, -s * 0.55);
      ctx.lineTo(-s * 2, 0);
      ctx.lineTo(s * 1.5, 0);
      ctx.closePath();
      ctx.fill();

      // Cockpit window
      ctx.fillStyle = `rgba(140, 210, 255, ${a * 0.8})`;
      ctx.beginPath();
      ctx.ellipse(s * 1.6, -s * 0.08, s * 0.5, s * 0.18, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Window glint
      ctx.fillStyle = `rgba(220, 245, 255, ${a * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(s * 1.75, -s * 0.12, s * 0.15, s * 0.07, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Top wing
      ctx.fillStyle = `rgba(120, 125, 138, ${a})`;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.5);
      ctx.lineTo(-s * 1.2, -s * 1.6);
      ctx.lineTo(-s * 2, -s * 1.5);
      ctx.lineTo(-s * 2.2, -s * 1.2);
      ctx.lineTo(-s * 1.5, -s * 0.55);
      ctx.closePath();
      ctx.fill();

      // Bottom wing
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.5);
      ctx.lineTo(-s * 1.2, s * 1.6);
      ctx.lineTo(-s * 2, s * 1.5);
      ctx.lineTo(-s * 2.2, s * 1.2);
      ctx.lineTo(-s * 1.5, s * 0.55);
      ctx.closePath();
      ctx.fill();

      // Wing detail lines
      ctx.strokeStyle = `rgba(95, 100, 115, ${a * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.52);
      ctx.lineTo(-s * 1.6, -s * 1.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, s * 0.52);
      ctx.lineTo(-s * 1.6, s * 1.35);
      ctx.stroke();

      // Engine nozzles (two small rectangles at rear)
      ctx.fillStyle = `rgba(90, 95, 105, ${a})`;
      ctx.fillRect(-s * 2.5, -s * 0.3, s * 0.35, s * 0.25);
      ctx.fillRect(-s * 2.5, s * 0.05, s * 0.35, s * 0.25);

      // Exhaust flames
      const flicker = Math.sin(ship.engineFlicker) * 0.15 + 0.55;
      const exLen = s * 1.8 + Math.sin(ship.engineFlicker * 2.3) * s * 0.5;

      // Top engine flame
      ctx.fillStyle = `rgba(255, 180, 80, ${flicker * a * 0.7})`;
      ctx.beginPath();
      ctx.moveTo(-s * 2.5, -s * 0.28);
      ctx.lineTo(-s * 2.5 - exLen, -s * 0.17);
      ctx.lineTo(-s * 2.5, -s * 0.07);
      ctx.closePath();
      ctx.fill();

      // Bottom engine flame
      ctx.beginPath();
      ctx.moveTo(-s * 2.5, s * 0.07);
      ctx.lineTo(-s * 2.5 - exLen, s * 0.17);
      ctx.lineTo(-s * 2.5, s * 0.28);
      ctx.closePath();
      ctx.fill();

      // Bright inner flame cores
      ctx.fillStyle = `rgba(255, 240, 200, ${flicker * a * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(-s * 2.5, -s * 0.22);
      ctx.lineTo(-s * 2.5 - exLen * 0.4, -s * 0.17);
      ctx.lineTo(-s * 2.5, -s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 2.5, s * 0.12);
      ctx.lineTo(-s * 2.5 - exLen * 0.4, s * 0.17);
      ctx.lineTo(-s * 2.5, s * 0.22);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    animationId = requestAnimationFrame(animate);
  }

  // Initialize and start animation
  initScene();
  animationId = requestAnimationFrame(animate);

  // Handle resize
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initScene, 100);
  });

  function setDayMode(isDay) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Snapshot current theme colors (already mid-lerp if transitioning)
    const fromTheme = {
      background: { ...theme.background },
      foreground: { ...theme.foreground },
      primary: { ...theme.primary },
      accent: { ...theme.accent }
    };
    const toTheme = isDay ? dayTheme : nightTheme;

    isDayMode = isDay;

    // Build the new planet that will fade in
    let newPlanet;
    if (isDay) {
      newPlanet = {
        x: w * 0.82, y: h * 0.13,
        r: Math.min(w, h) * 0.12,
        wobblePhase: Math.random() * Math.PI * 2,
        isEarth: false, transAlpha: 0
      };
    } else {
      newPlanet = {
        x: w * 0.12, y: h * 0.7,
        r: Math.min(w, h) * 0.18,
        wobblePhase: Math.random() * Math.PI * 2,
        isEarth: true, transAlpha: 0
      };
    }

    // Collect all currently visible planets
    const visiblePlanets = [];
    if (themeTransition) {
      for (const op of themeTransition.oldPlanets) {
        if (op.transAlpha > 0.01) visiblePlanets.push(op);
      }
      if (themeTransition.newPlanet && themeTransition.newPlanet.transAlpha > 0.01) {
        visiblePlanets.push(themeTransition.newPlanet);
      }
    } else if (planet) {
      visiblePlanets.push({ ...planet, transAlpha: 1 });
    }

    // If a visible planet matches the type we need, reclaim it as the new planet
    const needsEarth = !isDay;
    const reclaimIdx = visiblePlanets.findIndex(p => !!p.isEarth === needsEarth);
    if (reclaimIdx !== -1) {
      newPlanet = visiblePlanets.splice(reclaimIdx, 1)[0];
      // Keep its current alpha — it just stays/grows visible
    }

    // Everything else fades out
    themeTransition = {
      from: fromTheme,
      to: toTheme,
      progress: 0,
      duration: 90,
      oldPlanets: visiblePlanets,
      newPlanet: newPlanet
    };
  }

  return { setDayMode };
}
