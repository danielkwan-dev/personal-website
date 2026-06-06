initStars();

document.getElementById('enter-btn').addEventListener('click', () => {
  const splash = document.getElementById('splash');
  const main   = document.getElementById('main');
  const iframe = document.getElementById('music');

  splash.classList.add('fade-out');
  main.removeAttribute('aria-hidden');
  main.classList.add('visible');

  // Set src on click so the user gesture satisfies browser autoplay policy
  const id = 'vPA6T0la6uI';
  iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&loop=1&playlist=${id}&rel=0`;

  setTimeout(() => splash.remove(), 900);
});

function initStars() {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];
  let w, h;

  function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
    stars = Array.from({ length: 180 }, () => ({
      x:     Math.random() * w,
      y:     Math.random() * h,
      r:     Math.random() * 1.1 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.5 + 0.3
    }));
  }

  let start = null;
  function draw(ts) {
    if (!start) start = ts;
    const t = (ts - start) / 1000;
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
