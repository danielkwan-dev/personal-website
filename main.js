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
  let nebulae = [];
  let dust = [];
  let planet = null;
  let time = 0;
  let animationId = null;
  let lastTime = 0;
  let bgGradient = null;  // Cache background gradient
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
      const star = {
        x: Math.random() * w,
        y: Math.random() * h,
        r: isFar ? Math.random() * 0.8 + 0.3 : Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.4 + base,
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

    // Create planet
    planet = {
      x: w * 0.12,
      y: h * 0.7,
      r: Math.min(w, h) * 0.18,
      tint: mixLightness(theme.primary, -10),
      wobblePhase: Math.random() * Math.PI * 2,
      ring: {
        tilt: -0.35,
        width: 0.35,
        alpha: 0.18
      }
    };
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

    // Clear and draw cached background
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

    // Draw planet
    if (planet) {
      const p = planet;
      const wobble = Math.sin(time * 0.15 + p.wobblePhase) * (p.r * 0.008);
      const cx = p.x + wobble;
      const cy = p.y + wobble * 0.5;

      // Atmospheric glow
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = hsl(mixLightness(p.tint, 20), 1);
      ctx.beginPath();
      ctx.arc(cx, cy, p.r * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body gradient
      const g = ctx.createRadialGradient(cx - p.r * 0.3, cy - p.r * 0.3, p.r * 0.1, cx, cy, p.r);
      g.addColorStop(0, hsl(mixLightness(p.tint, 18), 0.95));
      g.addColorStop(0.5, hsl(mixLightness(p.tint, 4), 0.95));
      g.addColorStop(1, hsl(mixLightness(p.tint, -15), 0.95));

      ctx.beginPath();
      ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // Ring
      if (p.ring) {
        const ringR = p.r * (1.1 + p.ring.width);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(p.ring.tilt);
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = hsl(mixLightness(p.tint, 25), p.ring.alpha);
        ctx.lineWidth = p.r * 0.12;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringR, ringR * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
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

    // Draw shooting stars
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
