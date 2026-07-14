const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

// the nebula is soft — rendering at 70% resolution and letting CSS
// upscale is invisible to the eye but cuts fragment work in half
const RES_SCALE = 0.7;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() {
    canvas.width = window.innerWidth * RES_SCALE;
    canvas.height = window.innerHeight * RES_SCALE;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resize();
window.addEventListener('resize', () => {
    resize();
    resizeStarfield();
    drawStarfield();
});

const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 iMouse;

    void main() {
        vec2 F = gl_FragCoord.xy;
        vec4 O;

        vec2 p = (F*2. - iResolution.xy) / (iResolution.x * 0.4);

        float mx = iMouse.z > 0.0 ? (iMouse.x / iResolution.x) : 0.5;
        float my = iMouse.z > 0.0 ? (iMouse.y / iResolution.y) : 0.5;
        float yRange = mix(0.9, 1.1, my);
        float xRange = mix(0.9, 1.1, mx);

        float angle = mix(-0.05, 0.05, mx);
        float ca = cos(angle);
        float sa = sin(angle);
        mat2 R = mat2(ca, -sa, sa, ca);

        vec2 pr = p;
        vec2 d = vec2(0.0, 1.0);
        vec2 c = pr * mat2(1., 1., d / (.1 + 5. / dot(5.*pr - d, 5.*pr - d)));
        vec2 v = c;
        v *= mat2(cos(log(length(v)) + iTime*.2 + vec4(0,33,11,0))) * 5.;

        vec4 o = vec4(0.0);
        for (float i = 1.0; i < 10.0; i++) {
            o += sin(v.xyyx) + yRange;
            v += .7 * sin(v.yx * i + iTime) / i + .5;
        }

        float radial = length(pr);
        O = 1. - exp(
            -exp(vec4(-0.1,-0.15,-0.4,0)) / o
            / (.1 + .1 * pow(length(sin(v/.3)*.2 + c*vec2(1,2)) - 1., 2.))
            / (1. * xRange + 5. * exp(.3*c.y - dot(c,c)))
            / (.03 + abs(radial - .7)) * .2
        );

        // Collapse the procedural glow to luminance and rebuild its colour
        // from a controlled warm ramp — this keeps the flowing structure but
        // removes the stray green/red the raw per-channel output produced.
        // The blinding white-hot flash now belongs to the glowing ring itself
        // (around radial ≈ 0.7, where the base shader already concentrates
        // its brightness); elsewhere it settles into a soft creamy orange.
        float lum     = dot(O.rgb, vec3(0.299, 0.587, 0.114));
        float ringMix = exp(-pow((radial - 0.7) * 3.2, 2.0));
        vec3  cBlind  = vec3(1.30, 1.27, 1.18);
        vec3  cWarm   = vec3(1.00, 0.78, 0.55);
        O.rgb = mix(cWarm, cBlind, ringMix) * lum
              + cBlind * pow(ringMix, 3.0) * 0.9;
        O.rgb *= mix(1.0, 0.5, smoothstep(0.8, 1.7, radial));

        // soft rays around the bright ring — angle is taken from the same
        // warped coordinate field (and nudged by the turbulence already
        // driving the nebula) so the rays bend, swirl and drift with the
        // flow instead of sitting as a rigid, rotating overlay
        float ang     = atan(c.y, c.x);
        float spokesA = pow(abs(sin(ang * 9.0  + v.x * 0.35 + iTime * 0.22)), 5.0);
        float spokesB = pow(abs(sin(ang * 16.0 - v.y * 0.30 - iTime * 0.15)), 7.0);
        float spokes  = spokesA * 0.65 + spokesB * 0.45;
        O.rgb += cBlind * spokes * ringMix * 0.16;

        // dark silhouette at the very centre
        float shadow = smoothstep(0.15, 0.34, radial);
        O.rgb *= shadow;

        // a flowing ray through the centre — noticeably dimmer than the
        // ring's blinding glow, confined to a finite stretch so it ends
        // short of the screen edges, and narrow enough that the silhouette's
        // top and bottom stay dark — reading as two clear semicircles
        // separated cleanly by the band
        float yPos   = mix(pr.y, c.y, 0.25);
        float band   = exp(-pow(yPos * 4.4, 2.0));
        float extent = exp(-pow(pr.x * 0.95, 2.0));
        float ray    = band * extent * (0.85 + 0.18 * sin(iTime * 0.35));
        O.rgb += vec3(1.1, 0.98, 0.84) * ray;

        gl_FragColor = O;
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, 'position');
const resolutionLocation = gl.getUniformLocation(program, 'iResolution');
const timeLocation = gl.getUniformLocation(program, 'iTime');
const mouseLocation = gl.getUniformLocation(program, 'iMouse');

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
]), gl.STATIC_DRAW);

let startTime = Date.now();
let mouse = [0, 0, 0, 0];

// listen on window (the hero content sits above the canvas, so the canvas
// itself no longer receives most pointer events); the /2 preserves the
// original halved-influence range the shader was tuned against
window.addEventListener('mousemove', (e) => {
    mouse[0] = e.clientX * RES_SCALE / 2;
    mouse[1] = (window.innerHeight - e.clientY) * RES_SCALE / 2;
    mouse[2] = 1;
});

document.addEventListener('mouseleave', () => {
    mouse[2] = 0;
});

// --- Starfield: sparse static backdrop, revealed while a view is open ---

const starfield = document.getElementById('starfield');
const sfCtx = starfield.getContext('2d');
let stars = [];

function resizeStarfield() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    starfield.width = window.innerWidth * dpr;
    starfield.height = window.innerHeight * dpr;
    sfCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = [];
    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: 0.6 + Math.random() * 0.5,
            alpha: 0.18 + Math.random() * 0.25
        });
    }
    for (let i = 0; i < 25; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: 1.1 + Math.random() * 0.6,
            alpha: 0.35 + Math.random() * 0.3
        });
    }
}

function drawStarfield() {
    sfCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const s of stars) {
        sfCtx.fillStyle = 'rgba(232, 234, 242, ' + s.alpha + ')';
        sfCtx.fillRect(s.x, s.y, s.size, s.size);
    }
}

resizeStarfield();
drawStarfield();

// --- Music ---

const audio = document.getElementById('music');
const TARGET_VOLUME = 0.35;

let fadeFrame = null;

audio.volume = TARGET_VOLUME;

// Try to play with sound immediately — works if the browser allows it
// (returning visitors, high media engagement, or lenient browser).
// If blocked (most common on first visit), start muted so buffering
// begins, then unmute when the visitor clicks "enter".
audio.play().catch(() => {
    audio.muted = true;
    audio.play().catch(() => {});
});

// Gapless-ish looping: decode the track once to find where the audio
// actually starts and stops being audible, then loop between those
// points — skipping the encoder padding and silent tails that make
// the native loop attribute pause between repeats.
let loopStart = 0;
let loopEnd = 0;

(function analyseLoopPoints() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !window.fetch) return;
    fetch('interstellar.mp3')
        .then((r) => r.arrayBuffer())
        .then((buf) => {
            const ctx = new AC();
            return ctx.decodeAudioData(buf).then((decoded) => {
                const data = decoded.getChannelData(0);
                const rate = decoded.sampleRate;
                const threshold = 0.01;
                let s = 0;
                let e = data.length - 1;
                while (s < e && Math.abs(data[s]) < threshold) s++;
                while (e > s && Math.abs(data[e]) < threshold) e--;
                loopStart = Math.max(0, s / rate - 0.05);
                loopEnd = e / rate;
                ctx.close();
            });
        })
        .catch(() => {});
})();

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        audio.pause();
    } else if (document.body.classList.contains('revealed')) {
        audio.play().catch(() => {});
    }
});

audio.addEventListener('timeupdate', () => {
    // jump back just before the silence at the end; the 0.3s margin
    // covers the coarse rate at which timeupdate fires
    if (loopEnd && audio.currentTime >= loopEnd - 0.3) {
        audio.currentTime = loopStart;
    }
});

function fadeVolumeTo(target, ms) {
    cancelAnimationFrame(fadeFrame);
    const from = audio.volume;
    const start = performance.now();
    function step(now) {
        // rAF timestamps can land a hair before the captured start time —
        // clamp both ends or volume goes fractionally negative and throws
        const t = Math.max(0, Math.min(1, (now - start) / ms));
        audio.volume = from + (target - from) * t;
        if (t < 1) fadeFrame = requestAnimationFrame(step);
    }
    fadeFrame = requestAnimationFrame(step);
}

// --- Interaction: entering ---

const enterOverlay = document.getElementById('enter-overlay');

function enterSite() {
    if (enterOverlay.classList.contains('entering')) return;
    enterOverlay.classList.add('entering');

    // the score swells in as the void expands — never slamming to full
    if (audio.muted) {
        audio.muted = false;
        audio.volume = 0;
        audio.play().catch(() => {});
        fadeVolumeTo(TARGET_VOLUME, 2000);
    }

    // the door's void rushes forward and fills the screen with black —
    // once it has, reveal the scene behind it, then let the door fade away
    setTimeout(() => {
        document.body.classList.add('revealed');
        setTimeout(startTyping, 1400);
    }, 1300);

    setTimeout(() => {
        enterOverlay.classList.add('hidden');
    }, 1700);
}

enterOverlay.addEventListener('click', enterSite);

enterOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        enterSite();
    }
});

// --- Subtitle: types once, then the caret rests and fades ---

function startTyping() {
    const subtitleText = document.querySelector('.subtitle-text');
    const caret = document.querySelector('.caret');
    const text = 'Computer Engineering @ uWaterloo';

    function finish() {
        setTimeout(() => caret.classList.add('caret-done'), 3000);
    }

    if (reducedMotion) {
        subtitleText.textContent = text;
        finish();
        return;
    }

    let i = 0;
    function tick() {
        subtitleText.textContent = text.slice(0, ++i);
        if (i < text.length) {
            setTimeout(tick, 65);
        } else {
            finish();
        }
    }
    tick();
}

// --- Views: earth opens About, rocket opens Projects ---

const earthBtn = document.getElementById('earth-btn');
const rocketBtn = document.getElementById('rocket-btn');

const views = {
    about: { view: document.getElementById('about-view'), button: earthBtn },
    projects: { view: document.getElementById('projects-view'), button: rocketBtn }
};

let activeView = null;
let shaderIdle = false;
let shaderIdleTimer = null;

function openView(name) {
    if (activeView === name) return;

    if (activeView) {
        const prev = views[activeView];
        prev.view.classList.remove('open');
        prev.view.setAttribute('aria-hidden', 'true');
        prev.button.classList.remove('active');
        prev.button.setAttribute('aria-expanded', 'false');
    }

    const next = views[name];
    next.view.classList.add('open');
    next.view.setAttribute('aria-hidden', 'false');
    next.view.scrollTop = 0;
    next.button.classList.add('active');
    next.button.setAttribute('aria-expanded', 'true');
    document.body.classList.add('view-open');
    activeView = name;

    const focusTarget = next.view.querySelector('[tabindex="-1"]');
    if (focusTarget) focusTarget.focus({ preventScroll: true });

    // once the black hole has fully faded behind the view, stop drawing it
    clearTimeout(shaderIdleTimer);
    shaderIdle = false;
    shaderIdleTimer = setTimeout(() => { shaderIdle = true; }, 900);
}

function closeView() {
    if (!activeView) return;
    const current = views[activeView];
    current.view.classList.remove('open');
    current.view.setAttribute('aria-hidden', 'true');
    current.button.classList.remove('active');
    current.button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('view-open');
    aboutView.classList.remove('inside');

    clearTimeout(shaderIdleTimer);
    shaderIdle = false;

    current.button.focus({ preventScroll: true });
    activeView = null;
}

function toggleView(name) {
    if (activeView === name) {
        closeView();
    } else {
        openView(name);
    }
}

earthBtn.addEventListener('click', () => toggleView('about'));
rocketBtn.addEventListener('click', () => toggleView('projects'));

document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', closeView);
});

// --- The moon outpost: click the station to step inside ---

const aboutView = document.getElementById('about-view');
const stationBtn = document.getElementById('station-btn');
const stepOutsideBtn = document.getElementById('step-outside');

function enterStation() {
    aboutView.classList.add('inside');
    aboutView.querySelector('.station-room').scrollTop = 0;
    aboutView.querySelector('.room-inner').focus({ preventScroll: true });
}

function exitStation() {
    aboutView.classList.remove('inside');
    stationBtn.focus({ preventScroll: true });
}

stationBtn.addEventListener('click', enterStation);
stepOutsideBtn.addEventListener('click', exitStation);

// escape peels back one layer at a time: room, then view
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (activeView === 'about' && aboutView.classList.contains('inside')) {
        exitStation();
    } else {
        closeView();
    }
});

// --- Cursor trail: comet stardust ---
//
// The cursor sheds dust along its path — born warm gold, cooling to faint
// starlight as each grain twinkles, drifts and dies. Additive blending over
// pre-rendered sprites keeps the whole thing to a few drawImage calls per
// grain. Skipped on touch devices and for reduced-motion visitors.

(function cursorTrail() {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!finePointer || reducedMotion) return;

    const trail = document.getElementById('cursor-trail');
    const ctx = trail.getContext('2d');
    let trailDpr = 1;

    function resizeTrail() {
        trailDpr = Math.min(window.devicePixelRatio || 1, 2);
        trail.width = window.innerWidth * trailDpr;
        trail.height = window.innerHeight * trailDpr;
        ctx.setTransform(trailDpr, 0, 0, trailDpr, 0, 0);
    }
    resizeTrail();
    window.addEventListener('resize', resizeTrail);

    function makeSprite(r, g, b) {
        const s = document.createElement('canvas');
        s.width = s.height = 64;
        const c = s.getContext('2d');
        const grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
        grad.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',0.5)');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        c.fillStyle = grad;
        c.fillRect(0, 0, 64, 64);
        return s;
    }
    const goldSprite = makeSprite(232, 168, 92);   // --gold
    const starSprite = makeSprite(232, 234, 242);  // --starlight

    const MAX_GRAINS = 400;
    const grains = [];
    let curX = -100;
    let curY = -100;
    let onPage = false;

    function spawn(x, y, vx, vy) {
        if (grains.length >= MAX_GRAINS) grains.shift();
        const a = Math.random() * Math.PI * 2;
        const drift = 6 + Math.random() * 18;
        grains.push({
            x: x + (Math.random() - 0.5) * 3,
            y: y + (Math.random() - 0.5) * 3,
            // a whisper of the cursor's velocity plus its own slow drift
            vx: vx * 0.06 + Math.cos(a) * drift,
            vy: vy * 0.06 + Math.sin(a) * drift,
            size: 9 + Math.random() * 13,
            life: 0.8 + Math.random() * 0.7,
            age: 0,
            phase: Math.random() * Math.PI * 2,
            twinkle: 5 + Math.random() * 7
        });
    }

    window.addEventListener('mousemove', (e) => {
        const px = onPage ? curX : e.clientX;
        const py = onPage ? curY : e.clientY;
        const dx = e.clientX - px;
        const dy = e.clientY - py;
        const dist = Math.hypot(dx, dy);
        onPage = true;
        curX = e.clientX;
        curY = e.clientY;

        // seed grains along the travelled segment so fast flicks leave a
        // continuous streak instead of scattered clumps
        const steps = Math.min(Math.ceil(dist / 3), 36);
        for (let i = 1; i <= steps; i++) {
            spawn(px + dx * (i / steps), py + dy * (i / steps), dx, dy);
        }
    });

    document.addEventListener('mouseleave', () => { onPage = false; });

    let prev = performance.now();

    function drawTrail(now) {
        // clamped so a background-tab pause doesn't age everything at once
        const dt = Math.min((now - prev) / 1000, 0.05);
        prev = now;
        const t = now / 1000;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // pass 1 — physics plus the soft additive halo around each grain
        ctx.globalCompositeOperation = 'lighter';
        for (let i = grains.length - 1; i >= 0; i--) {
            const g = grains[i];
            g.age += dt;
            if (g.age >= g.life) {
                grains.splice(i, 1);
                continue;
            }
            g.x += g.vx * dt;
            g.y += g.vy * dt;
            g.vx *= Math.exp(-2.5 * dt);
            g.vy *= Math.exp(-2.5 * dt);

            const frac = 1 - g.age / g.life;                       // 1 → 0 over life
            const glow = Math.pow(frac, 1.5) * (0.8 + 0.2 * Math.sin(t * g.twinkle + g.phase));
            const d = g.size * (0.35 + 0.65 * frac);
            const warm = frac;                                     // gold young, pale old

            ctx.globalAlpha = glow * warm;
            ctx.drawImage(goldSprite, g.x - d / 2, g.y - d / 2, d, d);
            ctx.globalAlpha = glow * (1 - warm) + glow * 0.2;
            ctx.drawImage(starSprite, g.x - d / 2, g.y - d / 2, d, d);
        }

        // pass 2 — a small solid core with normal blending; the additive halo
        // vanishes over the shader's white-hot ring, the core does not
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < grains.length; i++) {
            const g = grains[i];
            const frac = 1 - g.age / g.life;
            const glow = Math.pow(frac, 1.5) * (0.8 + 0.2 * Math.sin(t * g.twinkle + g.phase));
            const d = g.size * (0.35 + 0.65 * frac) * 0.4;

            ctx.globalAlpha = glow * 0.9;
            ctx.drawImage(frac > 0.5 ? goldSprite : starSprite, g.x - d / 2, g.y - d / 2, d, d);
        }

        // at rest the comet settles into a soft ember breathing under the cursor
        if (onPage) {
            const pulse = 0.3 + 0.1 * Math.sin(t * 2.2);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = pulse;
            ctx.drawImage(goldSprite, curX - 14, curY - 14, 28, 28);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = pulse * 0.8;
            ctx.drawImage(goldSprite, curX - 6, curY - 6, 12, 12);
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        requestAnimationFrame(drawTrail);
    }

    requestAnimationFrame(drawTrail);
})();

// --- Render loop ---

function render() {
    // skip the draw while a view hides the hero or the tab is hidden —
    // the shader is by far the most expensive thing on the page
    if (!shaderIdle && !document.hidden) {
        const time = (Date.now() - startTime) / 1000;

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform1f(timeLocation, time);
        gl.uniform4f(mouseLocation, mouse[0], mouse[1], mouse[2], mouse[3]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    requestAnimationFrame(render);
}

render();
