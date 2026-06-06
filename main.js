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

        // radial colour grading: a blinding white-hot flash near the glow's
        // inner edge, softening outward into a translucent, fluid blend of
        // creamy / orange / white that fades toward the dark void
        float innerMix = 1.0 - smoothstep(0.35, 0.95, radial);
        vec3  cInner   = vec3(1.25, 1.18, 1.08);
        vec3  cOuter   = vec3(1.00, 0.80, 0.58);
        O.rgb *= mix(cOuter, cInner, innerMix);
        O.rgb += cInner * pow(innerMix, 5.0) * 0.7;
        O.rgb *= mix(1.0, 0.55, smoothstep(0.8, 1.7, radial));

        // dark silhouette at the very centre — the ray below cuts it in two
        float shadow = smoothstep(0.13, 0.3, radial);
        O.rgb *= shadow;

        // a prominent, flowing ray through the centre — riding the same
        // warped coordinate field as the nebula so it bends and drifts with
        // it, splitting the dark silhouette into two arcing semicircles
        float ray = exp(-pow(c.y * 2.0, 2.0)) * (0.85 + 0.2 * sin(iTime * 0.35));
        O.rgb += vec3(1.2, 1.05, 0.8) * ray;

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
