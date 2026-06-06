const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resize();
window.addEventListener('resize', resize);

const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2  iResolution;
    uniform float iTime;

    // ---- noise ----
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
                   mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
        return v;
    }

    // domain-warped fbm: feeds noise through noise so the result reads as
    // continuously flowing plasma rather than a static speckled texture
    float flow(vec2 p, float t) {
        vec2 q = vec2(fbm(p - 0.6 * t), fbm(p + vec2(5.2, 1.3) + 0.5 * t));
        vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + 0.35 * t),
                      fbm(p + 3.5 * q + vec2(8.3, 2.8) - 0.28 * t));
        return fbm(p + 3.0 * r);
    }

    // ---- accretion disk colour ----
    vec3 diskColor(float r, float phi, float t) {
        float rn = clamp((r - 1.5) / 4.5, 0.0, 1.0);

        // Keplerian shear: inner gas swirls faster than outer gas, giving the
        // turbulence an organic, advected flow rather than a rigid spin
        float omega    = 1.4 / pow(r, 1.5);
        float flowPhi  = phi - omega * t * 6.0;

        // smooth, continuously-flowing plasma turbulence (two scales)
        float fl  = flow(vec2(r * 0.9,        flowPhi * 1.1), t);
        float fl2 = flow(vec2(r * 2.4 - t * 0.2, flowPhi * 2.6), t * 0.6);

        // whitish-yellow core -> golden orange -> deep amber -> void
        vec3 cCore  = vec3(1.05, 1.00, 0.80);
        vec3 cGold  = vec3(1.00, 0.74, 0.32);
        vec3 cAmber = vec3(0.65, 0.30, 0.07);
        vec3 cVoid  = vec3(0.04, 0.02, 0.01);

        vec3 c;
        if (rn < 0.25)      c = mix(cCore,  cGold,  rn / 0.25);
        else if (rn < 0.65) c = mix(cGold,  cAmber, (rn - 0.25) / 0.4);
        else                c = mix(cAmber, cVoid,  (rn - 0.65) / 0.35);

        c *= 0.55 + 0.7 * fl + 0.35 * fl2;

        float bright = exp(-rn * 2.2) * 3.0;
        // relativistic beaming: side rotating toward viewer glows brighter
        float beam   = 1.0 + 0.6 * cos(phi - t * 0.05);
        return max(c * bright * beam, vec3(0.0));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
        float t  = iTime * 0.4;

        // fixed camera, slightly above the equatorial plane
        vec3 ro = vec3(0.0, 0.9, 7.0);
        vec3 ta = vec3(0.0, 0.05, 0.0);
        vec3 fw = normalize(ta - ro);
        vec3 rt = normalize(cross(fw, vec3(0, 1, 0)));
        vec3 up = cross(rt, fw);
        vec3 rd = normalize(fw + uv.x * rt + uv.y * up);

        // ---- ray march through curved spacetime ----
        vec3  pos      = ro;
        vec3  vel      = rd;
        float dt       = 0.07;
        float rs       = 1.0;   // Schwarzschild radius
        float diskIn   = 1.5;
        float diskOut  = 6.0;

        vec3  col      = vec3(0.0);
        float prevY    = pos.y;
        float minR     = 22.0;
        int   hits     = 0;
        bool  absorbed = false;

        for (int i = 0; i < 200; i++) {
            float r = length(pos);
            minR = min(minR, r);
            if (r < rs)    { absorbed = true; break; }
            if (r > 22.0)  { break; }

            // gravity bends the ray toward the black hole — strong enough that
            // light from the far side of the disk wraps up and over the shadow
            vel += -normalize(pos) * (2.2 * rs / (r * r)) * dt;

            vec3  npos = pos + vel * dt;
            float rXZ  = length(npos.xz);

            // detect crossing of the equatorial disk plane (y = 0). Cap at two
            // hits — the direct near-side image and the lensed far-side image —
            // so rays that spiral near the photon sphere don't cross the plane
            // repeatedly and blow the picture out to white/pink.
            if (hits < 2 && prevY * npos.y < 0.0 && rXZ > diskIn && rXZ < diskOut) {
                float frac = prevY / (prevY - npos.y);
                vec3  hit  = pos + vel * dt * frac;
                float phi  = atan(hit.z, hit.x);
                float hitR = length(hit.xz);
                // the lensed far-side image (reached later in the march) is dimmer
                float vis  = (hits == 0) ? 1.0 : 0.55;
                col += diskColor(hitR, phi, t) * vis;
                hits++;
            }

            prevY = npos.y;
            pos   = npos;
        }

        // soft aura: glow tied to how close each ray's closest approach came
        // to the photon sphere. It peaks just outside the silhouette and fades
        // smoothly on both sides, so the boundary reads as radiance bleeding
        // outward and inward — an aura — rather than a crisp geometric ring.
        float edgeDist = abs(minR - rs * 1.45);
        float auraCore = exp(-edgeDist * edgeDist * 9.0);
        float auraHalo = exp(-edgeDist * edgeDist * 1.8) * 0.55;
        vec3  aura     = vec3(1.0, 0.9, 0.7) * (auraCore * 1.3 + auraHalo);

        if (absorbed) {
            // glow bleeds softly into the shadow, fading to true black at its core
            col = aura * 0.7;
        } else {
            col += aura;
            // plain deep-space void — keeps focus on the black hole itself
            col += vec3(0.004, 0.005, 0.012);
        }

        // tone map + gamma
        col = 1.0 - exp(-col * 0.85);
        col = pow(max(col, 0.0), vec3(1.0 / 2.2));

        gl_FragColor = vec4(col, 1.0);
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

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
]), gl.STATIC_DRAW);

let startTime = Date.now();

// --- Music (Interstellar Main Theme via YouTube) ---

const VIDEO_ID = 'vPA6T0la6uI';
const iframe = document.getElementById('music');
let musicStarted = false;

function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    // Setting src inside a click handler satisfies browser autoplay policy
    iframe.src = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&controls=0&loop=1&playlist=${VIDEO_ID}&rel=0&enablejsapi=1`;
}

function sendCommand(func) {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        '*'
    );
}

document.addEventListener('visibilitychange', () => {
    if (!musicStarted) return;
    sendCommand(document.hidden ? 'pauseVideo' : 'playVideo');
});

// --- Interaction ---

const enterOverlay = document.getElementById('enter-overlay');

enterOverlay.addEventListener('click', () => {
    enterOverlay.classList.add('hidden');
    startMusic();
    setTimeout(() => {
        document.body.classList.add('revealed');
    }, 200);
});

// --- Render loop ---

function render() {
    const time = (Date.now() - startTime) / 1000;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

render();
