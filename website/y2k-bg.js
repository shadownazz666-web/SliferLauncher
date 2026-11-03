(() => {
  const root = document.getElementById("y2k-bg");
  if (!root) return;

  const chromeCanvas = root.querySelector(".chrome");
  const starCanvas = root.querySelector(".stars");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener(
    "pointermove",
    (e) => {
      mouse.tx = (e.clientX / innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  let T = 14;

  const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
  const FRAG = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 r; uniform float t; uniform vec2 m;

  float hs(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(hs(i), hs(i + vec2(1., 0.)), f.x), mix(hs(i + vec2(0., 1.)), hs(i + vec2(1., 1.)), f.x), f.y);
  }
  float fbm(vec2 p){
    float v = 0., a = .5;
    mat2 R = mat2(.8, .6, -.6, .8);
    for (int i = 0; i < 4; i++){ v += a * vn(p); p = R * p * 2.02 + 7.3; a *= .5; }
    return v;
  }
  float field(vec2 p){
    float s = t * .05;
    vec2 q = vec2(fbm(p + vec2(0., s)), fbm(p + vec2(5.2, 1.3) - s * .7));
    vec2 w = vec2(fbm(p + 2.2 * q + vec2(1.7, 9.2) + s), fbm(p + 2.2 * q + vec2(8.3, 2.8) - s * .8));
    return fbm(p + 2.4 * w);
  }
  float g(float x){ return exp(-x * x); }

  vec3 env(vec3 d){
    float a = d.y - m.y * .12, b = d.x - m.x * .12;
    vec3 c = mix(vec3(.004, .006, .02), vec3(.07, .12, .32), smoothstep(-.6, .8, a));
    c += vec3(.85, .93, 1.) * g((a - .05) * 9.) * 1.5;
    c += vec3(.45, .6, 1.) * g((a + .45) * 14.) * .75;
    vec3 irid = .5 + .5 * cos(6.2831 * (b * .6 + a * .4 + vec3(0., .33, .67)));
    c += irid * vec3(.40, .28, .60) * g((a - .38) * 7.) * .75;
    c += vec3(.9, .95, 1.) * g((b - .25) * 6.) * smoothstep(.2, .7, a) * .4;
    return c;
  }

  void main(){
    vec2 uv = (gl_FragCoord.xy - .5 * r) / r.y;
    vec2 p = uv * 1.9 + vec2(3.1, 1.7);
    float e = .012;
    float f = field(p), fx = field(p + vec2(e, 0.)), fy = field(p + vec2(0., e));
    vec3 N = normalize(vec3(-(fx - f) / e * .55, -(fy - f) / e * .55, 1.));
    vec3 rd = reflect(vec3(0., 0., -1.), N);

    vec3 col = env(rd);
    vec3 L = normalize(vec3(-.4 + m.x * .4, .6 - m.y * .4, .7));
    col += vec3(.8, .9, 1.) * pow(max(dot(N, L), 0.), 70.) * .9;
    col += pow(1. - N.z, 3.) * vec3(.30, .45, .90) * .5;

    col *= mix(.5, 1., smoothstep(.25, .7, f));
    col = col / (1. + col);
    col = pow(col, vec3(.92)) * .82;
    gl_FragColor = vec4(col, 1.);
  }`;

  const gl = chromeCanvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  let uR, uT, uM, glReady = false;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }

  if (gl) {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (vs && fs) {
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        uR = gl.getUniformLocation(prog, "r");
        uT = gl.getUniformLocation(prog, "t");
        uM = gl.getUniformLocation(prog, "m");
        glReady = true;
      }
    }
  }
  if (!glReady) chromeCanvas.style.display = "none";

  function drawChrome() {
    if (!glReady) return;
    gl.uniform2f(uR, chromeCanvas.width, chromeCanvas.height);
    gl.uniform1f(uT, T);
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const sc = starCanvas.getContext("2d");
  const COLORS = ["255,255,255", "205,222,255", "228,208,255", "192,240,255"];
  let W = 0;
  let H = 0;
  let DPR = 1;
  let stars = [];

  function seedStars() {
    const n = Math.min(Math.round((W * H) / 7500), 240);
    stars = Array.from({ length: n }, () => {
      const z = Math.random();
      const big = Math.random() < 0.13;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        big,
        r: big ? 4 + z * 8 : 0.4 + z * 1.3,
        ph: Math.random() * 6.283,
        sp: 0.4 + Math.random() * 1.1,
        vx: (Math.random() - 0.5) * 3 * (0.3 + z),
        vy: -(1 + Math.random() * 3) * (0.3 + z),
        col: COLORS[(Math.random() * COLORS.length) | 0],
      };
    });
  }

  function sparkle(x, y, r, a, col) {
    const gr = sc.createRadialGradient(x, y, 0, x, y, r * 2.4);
    gr.addColorStop(0, `rgba(${col},${a * 0.45})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    sc.fillStyle = gr;
    sc.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    sc.fillStyle = `rgba(${col},${a})`;
    sc.beginPath();
    sc.moveTo(x, y - r);
    sc.quadraticCurveTo(x, y, x + r, y);
    sc.quadraticCurveTo(x, y, x, y + r);
    sc.quadraticCurveTo(x, y, x - r, y);
    sc.quadraticCurveTo(x, y, x, y - r);
    sc.fill();
  }

  function drawStars(dt) {
    sc.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x += s.vx * dt + Math.sin(T * 0.12 + s.ph) * 0.06;
      s.y += s.vy * dt;
      if (s.y < -20) {
        s.y = H + 20;
        s.x = Math.random() * W;
      }
      if (s.x < -20) s.x = W + 20;
      else if (s.x > W + 20) s.x = -20;

      const x = s.x - mouse.x * 16 * s.z;
      const y = s.y - mouse.y * 16 * s.z;
      const tw = 0.5 + 0.5 * Math.sin(T * s.sp + s.ph);
      const a = (0.3 + 0.7 * tw) * (0.3 + 0.7 * s.z);

      if (s.big) {
        sparkle(x, y, s.r * (0.78 + 0.22 * tw), Math.min(1, a + 0.15), s.col);
      } else {
        sc.fillStyle = `rgba(${s.col},${a})`;
        sc.beginPath();
        sc.arc(x, y, s.r, 0, 6.283);
        sc.fill();
      }
    }
  }

  function resize() {
    W = innerWidth;
    H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, 2);
    starCanvas.width = W * DPR;
    starCanvas.height = H * DPR;
    sc.setTransform(DPR, 0, 0, DPR, 0, 0);
    const scale = W > 900 ? 0.5 : 0.65;
    chromeCanvas.width = Math.max(2, (W * scale) | 0);
    chromeCanvas.height = Math.max(2, (H * scale) | 0);
    if (glReady) gl.viewport(0, 0, chromeCanvas.width, chromeCanvas.height);
    seedStars();
    drawChrome();
    drawStars(0);
  }
  addEventListener("resize", resize);
  resize();

  if (!reduceMotion) {
    let last = performance.now();
    (function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      T += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      drawChrome();
      drawStars(dt);
      requestAnimationFrame(frame);
    })(last);
  }
})();
