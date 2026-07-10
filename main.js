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

canvas.addEventListener('mousemove', (e) => {
    mouse[0] = e.clientX / 2;
    mouse[1] = (canvas.height - e.clientY) / 2;
    mouse[2] = 1;
});

canvas.addEventListener('mouseleave', () => {
    mouse[2] = 0;
});

// --- Music ---

const audio = document.getElementById('music');
audio.volume = 1;

// Try to play with sound immediately — works if the browser allows it
// (returning visitors, high media engagement, or lenient browser).
// If blocked (most common on first visit), start muted so buffering
// begins, then unmute when the visitor clicks "enter".
audio.play().catch(() => {
    audio.muted = true;
    audio.play().catch(() => {});
});

document.addEventListener('visibilitychange', () => {
    document.hidden ? audio.pause() : audio.play().catch(() => {});
});

// --- Interaction ---

const enterOverlay = document.getElementById('enter-overlay');

enterOverlay.addEventListener('click', () => {
    if (audio.muted) {
        audio.muted = false;
        audio.play().catch(() => {});
    }

    if (enterOverlay.classList.contains('entering')) return;
    enterOverlay.classList.add('entering');

    // the door's void rushes forward and fills the screen with black —
    // once it has, reveal the scene behind it, then let the door fade away
    setTimeout(() => {
        document.body.classList.add('revealed');
        setTimeout(startTyping, 1400);
    }, 1300);

    setTimeout(() => {
        enterOverlay.classList.add('hidden');
    }, 1700);
});

// --- Subtitle typing effect ---

function startTyping() {
    const subtitle = document.querySelector('.subtitle');
    const text = 'Computer Engineering @ uWaterloo';
    const typeDelay = 65;
    const eraseDelay = 35;
    const pauseAfterType = 2000;
    const pauseBeforeRetype = 400;
    let i = 0;
    let erasing = false;

    function tick() {
        if (!erasing) {
            subtitle.textContent = text.slice(0, ++i);
            if (i === text.length) {
                setTimeout(() => { erasing = true; tick(); }, pauseAfterType);
            } else {
                setTimeout(tick, typeDelay);
            }
        } else {
            subtitle.textContent = text.slice(0, --i);
            if (i === 0) {
                erasing = false;
                setTimeout(tick, pauseBeforeRetype);
            } else {
                setTimeout(tick, eraseDelay);
            }
        }
    }

    tick();
}

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
