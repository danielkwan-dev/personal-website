// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Set current year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Initialize all functionality
  initNavigation();
  initMobileMenu();
  initScrollAnimations();
  initStarField();
});

// Navigation
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  const sections = document.querySelectorAll('.section');

  // Smooth scroll to sections
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 64; // Account for navbar height
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }

      // Close mobile menu if open
      closeMobileMenu();
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

  // Configuration
  const config = {
    starCount: 0,
    dustCount: 30,
    shootingStarCount: 3,
    targetFPS: 30
  };

  // State
  let stars = [];
  let shootingStars = [];
  let nebulae = [];
  let dust = [];
  let planets = [];
  let time = 0;
  let animationId = null;
  let lastTime = 0;
  const frameInterval = 1000 / config.targetFPS;

  // Theme colors
  const theme = {
    background: { h: 220, s: 20, l: 10 },
    foreground: { h: 210, s: 40, l: 98 },
    primary: { h: 180, s: 70, l: 50 },
    accent: { h: 280, s: 70, l: 60 }
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

  // Initialize scene
  function initScene() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = w * h;
    config.starCount = Math.floor(area / 2500);

    // Create stars
    const starTints = [
      mixLightness(theme.foreground, -6),
      mixLightness(theme.primary, 18),
      mixLightness(theme.accent, 10)
    ];

    stars = Array.from({ length: config.starCount }, () => {
      const layer = Math.random() < 0.8 ? 0 : 1;
      const base = layer === 0 ? 0.25 : 0.4;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: layer === 0 ? Math.random() * 1 + 0.3 : Math.random() * 1.8 + 0.5,
        baseAlpha: Math.random() * 0.5 + base,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        tint: starTints[Math.floor(Math.random() * starTints.length)],
        layer
      };
    });

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
        x: w * 0.2,
        y: h * 0.3,
        radius: Math.min(w, h) * 0.35,
        tint: mixLightness(theme.primary, 6),
        baseAlpha: 0.06,
        pulseSpeed: 0.0008,
        pulsePhase: 0,
        driftX: 0.04,
        driftY: 0.02
      },
      {
        x: w * 0.8,
        y: h * 0.65,
        radius: Math.min(w, h) * 0.4,
        tint: mixLightness(theme.accent, -4),
        baseAlpha: 0.05,
        pulseSpeed: 0.001,
        pulsePhase: Math.PI,
        driftX: -0.04,
        driftY: 0.015
      }
    ];

    // Create dust
    dust = Array.from({ length: config.dustCount }, () => createDust(w, h));

    // Create planet
    planets = [
      {
        x: w * 0.1,
        y: h * 0.75,
        r: Math.min(w, h) * 0.22,
        tint: mixLightness(theme.primary, -10),
        driftX: 0.008,
        driftY: -0.004,
        wobblePhase: Math.random() * Math.PI * 2,
        ring: {
          tilt: -0.35,
          width: 0.4,
          alpha: 0.2
        }
      }
    ];
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

  function drawPlanet(p, w, h) {
    p.x += p.driftX;
    p.y += p.driftY;
    const wobble = Math.sin(time * 0.18 + p.wobblePhase) * (p.r * 0.01);

    const pad = p.r * 1.2;
    if (p.x < -pad) p.x = w + pad;
    if (p.x > w + pad) p.x = -pad;
    if (p.y < -pad) p.y = h + pad;
    if (p.y > h + pad) p.y = -pad;

    const cx = p.x + wobble;
    const cy = p.y + wobble * 0.6;

    // Atmospheric glow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(cx, cy, p.r * 0.72, cx, cy, p.r * 1.25);
    glow.addColorStop(0, hsl(mixLightness(p.tint, 22), 0.0));
    glow.addColorStop(0.65, hsl(mixLightness(p.tint, 20), 0.12));
    glow.addColorStop(1, hsl(mixLightness(p.tint, 18), 0.0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, p.r * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body gradient
    const g = ctx.createRadialGradient(cx - p.r * 0.35, cy - p.r * 0.35, p.r * 0.2, cx, cy, p.r);
    g.addColorStop(0, hsl(mixLightness(p.tint, 20), 0.98));
    g.addColorStop(0.45, hsl(mixLightness(p.tint, 6), 0.98));
    g.addColorStop(1, hsl(mixLightness(p.tint, -18), 0.98));

    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Surface bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = hsl(mixLightness(p.tint, 28), 0.4);
    ctx.lineWidth = 1;

    const bands = 10;
    for (let i = 0; i < bands; i++) {
      const y = cy - p.r + (i / bands) * (p.r * 2);
      const wob = Math.sin(time * 0.25 + i * 0.7 + p.wobblePhase) * (p.r * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - p.r, y);
      ctx.bezierCurveTo(cx - p.r * 0.2, y + wob, cx + p.r * 0.2, y - wob, cx + p.r, y);
      ctx.stroke();
    }

    // Shadow vignette
    const shadow = ctx.createRadialGradient(cx + p.r * 0.3, cy + p.r * 0.3, p.r * 0.2, cx, cy, p.r);
    shadow.addColorStop(0, 'hsl(0 0% 0% / 0)');
    shadow.addColorStop(1, 'hsl(0 0% 0% / 0.35)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Ring
    if (p.ring) {
      const ringR = p.r * (1.08 + p.ring.width);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(p.ring.tilt);

      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = hsl(mixLightness(p.tint, 28), p.ring.alpha);
      ctx.lineWidth = p.r * 0.18;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.33, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
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
    time += 0.016;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, hsl(mixLightness(theme.background, -2), 1));
    bgGradient.addColorStop(0.55, hsl(mixLightness(theme.background, -6), 1));
    bgGradient.addColorStop(1, hsl(mixLightness(theme.background, -12), 1));
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Draw nebulae
    nebulae.forEach(n => {
      const pulse = Math.sin(time * n.pulseSpeed * 60 + n.pulsePhase);
      const a = n.baseAlpha * (0.8 + 0.2 * pulse);

      n.x += n.driftX;
      n.y += n.driftY;

      const pad = n.radius;
      if (n.x < -pad) n.x = w + pad;
      if (n.x > w + pad) n.x = -pad;
      if (n.y < -pad) n.y = h + pad;
      if (n.y > h + pad) n.y = -pad;

      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      g.addColorStop(0, hsl(mixLightness(n.tint, 12), a * 1.4));
      g.addColorStop(0.45, hsl(n.tint, a * 0.7));
      g.addColorStop(0.75, hsl(mixLightness(n.tint, -8), a * 0.25));
      g.addColorStop(1, 'hsl(0 0% 0% / 0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw far stars (layer 0)
    stars.filter(s => s.layer === 0).forEach(s => {
      const tw = Math.sin(time * s.twinkleSpeed * 60 + s.twinklePhase);
      const a = clamp(s.baseAlpha * (0.6 + 0.4 * tw), 0, 1);

      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
      g.addColorStop(0, hsl(s.tint, a));
      g.addColorStop(0.4, hsl(s.tint, a * 0.35));
      g.addColorStop(1, 'hsl(0 0% 0% / 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hsl({ h: 0, s: 0, l: 100 }, a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw planets
    planets.forEach(p => drawPlanet(p, w, h));

    // Draw dust
    dust.forEach((d, idx) => {
      d.x += d.vx;
      d.y += d.vy;
      d.life += 1;

      const t = d.life / d.maxLife;
      let a = d.alpha;
      if (t < 0.12) a *= t / 0.12;
      if (t > 0.88) a *= (1 - t) / 0.12;

      if (d.life >= d.maxLife || d.x < -20 || d.x > w + 20 || d.y < -20 || d.y > h + 20) {
        dust[idx] = createDust(w, h);
        return;
      }

      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 6);
      g.addColorStop(0, hsl(d.tint, a));
      g.addColorStop(0.45, hsl(d.tint, a * 0.25));
      g.addColorStop(1, 'hsl(0 0% 0% / 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw near stars (layer 1)
    stars.filter(s => s.layer === 1).forEach(s => {
      const tw = Math.sin(time * s.twinkleSpeed * 60 + s.twinklePhase);
      const a = clamp(s.baseAlpha * (0.55 + 0.45 * tw), 0, 1);

      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
      g.addColorStop(0, hsl(s.tint, a));
      g.addColorStop(0.4, hsl(s.tint, a * 0.32));
      g.addColorStop(1, 'hsl(0 0% 0% / 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hsl({ h: 0, s: 0, l: 100 }, a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Cross sparkle for bright stars
      if (s.r > 1.4 && a > 0.55) {
        ctx.save();
        ctx.globalAlpha = a * 0.45;
        ctx.strokeStyle = hsl(s.tint, 1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x - s.r * 3.2, s.y);
        ctx.lineTo(s.x + s.r * 3.2, s.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.r * 3.2);
        ctx.lineTo(s.x, s.y + s.r * 3.2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw shooting stars
    spawnShootingStar(w, h);
    shootingStars.filter(st => st.active).forEach(st => {
      const tailX = st.x - Math.cos(st.angle) * st.length;
      const tailY = st.y - Math.sin(st.angle) * st.length;

      const g = ctx.createLinearGradient(st.x, st.y, tailX, tailY);
      g.addColorStop(0, 'hsl(0 0% 100% / 0.95)');
      g.addColorStop(0.2, hsl(mixLightness(theme.primary, 18), st.alpha * 0.8));
      g.addColorStop(0.55, hsl(mixLightness(theme.primary, 5), st.alpha * 0.35));
      g.addColorStop(1, 'hsl(0 0% 0% / 0)');

      ctx.strokeStyle = g;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const head = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, 7);
      head.addColorStop(0, 'hsl(0 0% 100% / 0.95)');
      head.addColorStop(0.55, hsl(mixLightness(theme.primary, 18), st.alpha * 0.35));
      head.addColorStop(1, 'hsl(0 0% 0% / 0)');
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(st.x, st.y, 7, 0, Math.PI * 2);
      ctx.fill();

      st.x += Math.cos(st.angle) * st.speed;
      st.y += Math.sin(st.angle) * st.speed;
      st.alpha -= 0.014;

      if (st.alpha <= 0 || st.x > w + 200 || st.y > h + 200) {
        st.active = false;
      }
    });

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
}
