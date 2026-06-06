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
    uniform vec4  iMouse;

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

    // ---- accretion disk colour ----
    vec3 diskColor(float r, float phi, float t) {
        float rn = clamp((r - 1.5) / 4.5, 0.0, 1.0);

        // Keplerian shear: inner gas swirls faster than outer gas, giving the
        // turbulence an organic, advected flow rather than a rigid spin
        float omega    = 1.4 / pow(r, 1.5);
        float flowPhi  = phi - omega * t * 6.0;

        float n1 = fbm(vec2(r * 1.6 - t * 0.3, flowPhi * 1.4));
        float n2 = noise(vec2(r * 10.0, flowPhi * 5.0 + t * 0.8));
        float n3 = fbm(vec2(r * 0.6 + flowPhi * 0.5, t * 0.05));

        // blinding white-hot inner edge -> fiery copper -> deep ember -> void
        vec3 cWhite  = vec3(1.05, 1.02, 0.96);
        vec3 cCopper = vec3(1.00, 0.52, 0.20);
        vec3 cEmber  = vec3(0.55, 0.12, 0.02);
        vec3 cVoid   = vec3(0.05, 0.01, 0.01);

        vec3 c;
        if (rn < 0.22)      c = mix(cWhite,  cCopper, rn / 0.22);
        else if (rn < 0.6)  c = mix(cCopper, cEmber,  (rn - 0.22) / 0.38);
        else                c = mix(cEmber,  cVoid,   (rn - 0.6) / 0.4);

        c *= 0.5 + 0.85 * n1 + 0.35 * n2 + 0.25 * n3;

        float bright = exp(-rn * 2.2) * 4.5;
        // relativistic beaming: side rotating toward viewer glows brighter
        float beam   = 1.0 + 0.85 * cos(phi - t * 0.05);
        return max(c * bright * beam, vec3(0.0));
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
        float t  = iTime * 0.4;

        // mouse: correct for the /2 applied in JS
        float mx = iMouse.z > 0.0 ? clamp(iMouse.x * 2.0 / iResolution.x, 0.0, 1.0) : 0.5;
        float my = iMouse.z > 0.0 ? clamp(iMouse.y * 2.0 / iResolution.y, 0.0, 1.0) : 0.5;

        // camera slightly above equatorial plane; mouse tilts view
        vec3 ro = vec3(0.0, 0.9 + (my - 0.5) * 1.0, 7.0);
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

            // detect crossing of equatorial disk plane (y = 0)
            if (prevY * npos.y < 0.0 && rXZ > diskIn && rXZ < diskOut) {
                float frac = prevY / (prevY - npos.y);
                vec3  hit  = pos + vel * dt * frac;
                float phi  = atan(hit.z, hit.x);
                float hitR = length(hit.xz);
                // back side of disk (lensed over the top) is slightly dimmer
                float vis  = (i < 60) ? 1.0 : 0.5;
                col += diskColor(hitR, phi, t) * vis;
            }

            prevY = npos.y;
            pos   = npos;
        }

        if (absorbed) {
            col = vec3(0.0);
        } else {
            // photon-ring glow: light grazing the photon sphere piles up into
            // a thin, brilliant rim tracing the silhouette
            float ringDist = abs(minR - rs * 1.5);
            col += vec3(1.0, 0.85, 0.65) * exp(-ringDist * ringDist * 14.0) * 1.4;

            // deep-space background: faint nebula + stars
            vec2 bg = vec2(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0)));
            float n  = fbm(bg * 2.5 + 0.015 * t);
            float n2 = fbm(bg * 7.0 - 0.025 * t);
            vec3 sky = vec3(0.004, 0.008, 0.035)
                     + vec3(0.03,  0.01,  0.08 ) * n
                     + vec3(0.06,  0.02,  0.14 ) * n2;

            // sparse stars
            vec2  sc = floor(bg * 280.0);
            float s  = hash(sc);
            if (s > 0.995) sky += vec3(0.85, 0.9, 1.0) * (s - 0.995) * 200.0;

            col += sky;
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

canvas.addEventListener('mousemove', (e) => {
    mouse[0] = e.clientX / 2;
    mouse[1] = (canvas.height - e.clientY) / 2;
    mouse[2] = 1;
});

canvas.addEventListener('mouseleave', () => {
    mouse[2] = 0;
});

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
    gl.uniform4f(mouseLocation, mouse[0], mouse[1], mouse[2], mouse[3]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

render();
