import * as THREE from "three";
import { makeRenderer, watch, sizeOf, reduceMotion, onResize } from "./common";

/*
  DOM contract (see src/ui/components/home/ShaderRow.astro):
    [data-shader="outline|cube|sky"]   one row
      [data-view]                      the live window (canvas host)
      input[data-param="name"]         range or checkbox; a sibling <output> shows the value
*/
type Params = Record<string, (v: number) => void>;

function bindParams(root: HTMLElement, params: Params) {
  root.querySelectorAll<HTMLInputElement>("input[data-param]").forEach((input) => {
    const fn = params[input.dataset.param!]; if (!fn) return;
    const out = input.closest("label")?.querySelector("output");
    const digits = +(input.dataset.digits ?? 2);
    const set = () => {
      const v = input.type === "checkbox" ? (input.checked ? 1 : 0) : +input.value;
      if (out) out.textContent = v.toFixed(digits);
      fn(v);
    };
    input.addEventListener(input.type === "checkbox" ? "change" : "input", set);
    set();
  });
}
function setParam(root: HTMLElement, name: string, v: number) {
  const input = root.querySelector<HTMLInputElement>(`input[data-param="${name}"]`);
  if (!input) return;
  input.value = String(v);
  const out = input.closest("label")?.querySelector("output");
  if (out) out.textContent = v.toFixed(+(input.dataset.digits ?? 2));
}
/** Horizontal drag on the window. Returns the "is held" flag. */
function dragX(el: HTMLElement, onMove: (dx: number, dy: number) => void) {
  const s = { down: false, x: 0, y: 0 };
  el.addEventListener("pointerdown", (e) => { s.down = true; s.x = e.clientX; s.y = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => { if (!s.down) return; onMove(e.clientX - s.x, e.clientY - s.y); s.x = e.clientX; s.y = e.clientY; });
  const up = () => { s.down = false; };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  return s;
}
const FULL_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

/* ── Outline and posterise ───────────────────────────
   The scene is drawn twice: once with MeshNormalMaterial as an override into a normals target, once lit into a
   colour target. A full-screen pass runs Sobel on both (normals catch silhouettes and creases, luminance catches
   texture and shading edges), posterises the colour and inks the edges.                                         */
function outline(root: HTMLElement, view: HTMLElement) {
  const renderer = makeRenderer(view, { maxDpr: 1.5 });
  const scene = new THREE.Scene();
  const bg = new THREE.Color(0xf3c9d8), black = new THREE.Color(0x000000);
  scene.background = bg;
  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.5, 30);
  camera.position.set(0, 2.2, 6); camera.lookAt(0, 0.4, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a9a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(3, 5, 2); scene.add(sun);

  const props = new THREE.Group(); scene.add(props);
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const add = (m: THREE.Mesh, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); props.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 48), mat(0xe9e2ee)), 0, -0.1);
  add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 10, 48), mat(0x5c4a6e)), 0, 0.2).rotation.x = Math.PI / 2;
  [0xd9518f, 0x3e68d6, 0xf2b53a, 0x58b98a, 0x9b6bd6, 0xe0703a].forEach((c, i) => {
    const a = (i / 6) * Math.PI * 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.32), mat(c)), Math.cos(a) * 1.5, 0.55, Math.sin(a) * 1.5).rotation.y = -a + 0.3;
  });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.6), mat(0x3a2f4f)), 0, 1.1);
  const duck = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), mat(0x2f4fd0)); body.scale.set(1.2, 0.9, 1); duck.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0x2f4fd0)); head.position.set(0.28, 0.32, 0); duck.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 10), mat(0xf2a23a)); beak.rotation.z = -Math.PI / 2; beak.position.set(0.52, 0.3, 0); duck.add(beak);
  duck.position.set(0.9, 0.35, 0.6); props.add(duck);

  const rt = new THREE.WebGLRenderTarget(4, 4), rtN = new THREE.WebGLRenderTarget(4, 4);
  const normalMat = new THREE.MeshNormalMaterial();
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rt.texture }, tNormal: { value: rtN.texture }, uTexel: { value: new THREE.Vector2() },
      uBands: { value: 4 }, uLine: { value: 0.35 }, uWidth: { value: 1.2 },
    },
    vertexShader: FULL_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor, tNormal; uniform vec2 uTexel; uniform float uBands, uLine, uWidth; varying vec2 vUv;
      vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).rgb; }
      float lum(vec2 uv) { return dot(texture2D(tColor, uv).rgb, vec3(0.299, 0.587, 0.114)); }
      void main() {
        vec2 o = uTexel * uWidth;
        vec2 a = vUv + vec2(-o.x, o.y), b = vUv + vec2(0.0, o.y), c = vUv + vec2(o.x, o.y);
        vec2 d = vUv + vec2(-o.x, 0.0), f = vUv + vec2(o.x, 0.0);
        vec2 g = vUv + vec2(-o.x, -o.y), h = vUv + vec2(0.0, -o.y), i = vUv + vec2(o.x, -o.y);
        vec3 nx = -nrm(a) - 2.0 * nrm(d) - nrm(g) + nrm(c) + 2.0 * nrm(f) + nrm(i);
        vec3 ny = -nrm(g) - 2.0 * nrm(h) - nrm(i) + nrm(a) + 2.0 * nrm(b) + nrm(c);
        float cx = -lum(a) - 2.0 * lum(d) - lum(g) + lum(c) + 2.0 * lum(f) + lum(i);
        float cy = -lum(g) - 2.0 * lum(h) - lum(i) + lum(a) + 2.0 * lum(b) + lum(c);
        float edge = max(smoothstep(uLine, uLine + 0.15, length(nx) + length(ny)),
                         smoothstep(uLine + 0.3, uLine + 0.45, length(vec2(cx, cy))));
        vec3 col = floor(texture2D(tColor, vUv).rgb * uBands + 0.5) / uBands;
        gl_FragColor = vec4(mix(col, vec3(0.1, 0.06, 0.16), edge), 1.0);
      }`,
  });
  const postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  bindParams(root, {
    bands: (v) => { post.uniforms.uBands.value = v; },
    line: (v) => { post.uniforms.uLine.value = v; },
    width: (v) => { post.uniforms.uWidth.value = v; },
  });
  onResize(view, () => {
    const [w, h] = sizeOf(view); renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio(), pw = Math.floor(w * pr), ph = Math.floor(h * pr);
    rt.setSize(pw, ph); rtN.setSize(pw, ph); post.uniforms.uTexel.value.set(1 / pw, 1 / ph);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  });
  let rotY = 0.4, idle = 2;
  const held = dragX(view, (dx) => { rotY += dx * 0.01; idle = 0; });
  const motion = !reduceMotion();
  watch(view, (dt, t) => {
    idle += dt;
    if (!held.down && motion && idle > 1.5) rotY += dt * 0.25;
    props.rotation.y = rotY;
    duck.position.y = 0.35 + (motion ? Math.sin(t * 2) * 0.04 : 0);
    scene.overrideMaterial = normalMat; scene.background = black; renderer.setRenderTarget(rtN); renderer.render(scene, camera);
    scene.overrideMaterial = null; scene.background = bg; renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  });
}

/* ── Stencil portals ─────────────────────────────────
   Each face is a quad with colorWrite and depthWrite off that writes its own value (1–6) into the stencil buffer.
   Each world's materials test stencil == their value, so a world only appears through its own face. The frame and
   the backdrop are ungated / test 0. Back faces are culled, so the far faces never overwrite the near ones.        */
const STAR_VERT = "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const STAR_FRAG = /* glsl */ `uniform vec3 uTint; varying vec3 vDir;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  void main(){ vec3 d = normalize(vDir) * 70.0; float s = step(0.982, hash(floor(d))) * smoothstep(0.35, 0.0, length(fract(d) - 0.5));
    gl_FragColor = vec4(uTint * (0.18 + 0.22 * (0.5 + 0.5 * normalize(vDir).y)) + vec3(s), 1.0); }`;
const starMaterial = (tint: number) => new THREE.ShaderMaterial({
  uniforms: { uTint: { value: new THREE.Color(tint) } }, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, side: THREE.BackSide, depthWrite: false,
});
const gate = <M extends THREE.Material>(m: M, ref: number) => Object.assign(m, {
  stencilWrite: true, stencilRef: ref, stencilFuncMask: 0x07, stencilWriteMask: 0, stencilFunc: THREE.EqualStencilFunc,
  stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
});

function cube(root: HTMLElement, view: HTMLElement) {
  const renderer = makeRenderer(view, { maxDpr: 1.5 }); renderer.setClearColor(0x0d0b16, 1);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(2, 3, 6); scene.add(dl);
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 100); camera.position.set(0, 0.3, 7.2); camera.lookAt(0, 0, 0);

  const S = 2.1, h = S / 2, T = S * 0.05;
  const g = new THREE.Group(); scene.add(g);
  const backdrop = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 12), gate(starMaterial(0x2a2050), 0));
  backdrop.renderOrder = 7; scene.add(backdrop);
  const spin = new THREE.Group(); g.add(spin);
  const barMat = new THREE.MeshStandardMaterial({ color: 0xe9e4f0, roughness: 0.35 });
  const bar = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), barMat); m.position.set(x, y, z); m.renderOrder = 8; spin.add(m);
  };
  [-h, h].forEach((a) => [-h, h].forEach((b) => { bar(S + T, T, T, 0, a, b); bar(T, S + T, T, a, 0, b); bar(T, T, S + T, a, b, 0); }));
  const faces = [[0, 0, 1, 0, 0, 0], [0, 0, -1, 0, Math.PI, 0], [1, 0, 0, 0, Math.PI / 2, 0], [-1, 0, 0, 0, -Math.PI / 2, 0], [0, 1, 0, -Math.PI / 2, 0, 0], [0, -1, 0, Math.PI / 2, 0, 0]];
  const tints = [0xff4d6d, 0x4d8dff, 0x58e0a0, 0xffc24d, 0xb36bff, 0x4de3ff];
  const geos = [
    new THREE.TorusKnotGeometry(S * 0.16, S * 0.05, 64, 8), new THREE.IcosahedronGeometry(S * 0.25, 0), new THREE.OctahedronGeometry(S * 0.25, 0),
    new THREE.TorusGeometry(S * 0.2, S * 0.05, 8, 32), new THREE.DodecahedronGeometry(S * 0.24, 0), new THREE.TetrahedronGeometry(S * 0.3, 0),
  ];
  const portalMats: THREE.MeshBasicMaterial[] = [], worlds: THREE.Mesh[] = [];
  faces.forEach((f, i) => {
    const m = new THREE.MeshBasicMaterial({
      color: tints[i], colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: i + 1, stencilWriteMask: 0x07,
      stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
    });
    portalMats.push(m);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(S, S), m);
    q.position.set(f[0] * h, f[1] * h, f[2] * h); q.rotation.set(f[3], f[4], f[5]); q.renderOrder = 6; spin.add(q);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(h * 0.98, 20, 10), gate(starMaterial(tints[i]), i + 1));
    sky.renderOrder = 9; spin.add(sky); worlds.push(sky);
    const std = gate(new THREE.MeshStandardMaterial({ color: tints[i], emissive: new THREE.Color(tints[i]).multiplyScalar(0.25), roughness: 0.4 }), i + 1);
    const o = new THREE.Mesh(geos[i], std); o.renderOrder = 10; spin.add(o); worlds.push(o);
  });

  let speed = 0.35, rx = -0.3, ry = 0.6;
  bindParams(root, {
    spin: (v) => { speed = v; },
    masks: (v) => {
      const on = v > 0.5;
      portalMats.forEach((m) => { m.colorWrite = on; m.needsUpdate = true; });
      worlds.forEach((w) => { w.visible = !on; });
    },
  });
  const held = dragX(view, (dx, dy) => { ry += dx * 0.01; rx += dy * 0.01; });
  onResize(view, () => { const [w, hh] = sizeOf(view); renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); });
  const motion = !reduceMotion();
  watch(view, (dt, t) => {
    if (motion && !held.down) { ry += dt * speed; }
    g.rotation.set(rx + (motion ? Math.sin(t / 4) * 0.2 : 0), ry, 0);
    if (motion) worlds.forEach((w, j) => { if (j % 2) w.rotation.y += dt * 0.8; });
    renderer.render(scene, camera);
  });
}

/* ── Cartoon sky ─────────────────────────────────────
   Banded vertical gradient driven by time of day, stars from a hashed grid, and clouds made of four ellipse SDFs
   per grid cell. The shadow band is the same SDF sampled with a vertical offset, so it costs one extra evaluation. */
function sky(root: HTMLElement, view: HTMLElement) {
  const renderer = makeRenderer(view, { maxDpr: 1.25 });
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = { uTime: { value: 0 }, uDay: { value: 0.86 }, uCover: { value: 0.5 }, uAspect: { value: 4 / 3 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: FULL_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDay, uCover, uAspect; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float ellipse(vec2 p, vec2 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
      float cloud(vec2 q, vec2 id) {
        float s = mix(0.8, 1.15, h21(id + 3.7)); q /= s;
        float d = ellipse(q - vec2(-0.18, 0.0), vec2(0.24, 0.13));
        d = min(d, ellipse(q - vec2(0.05, 0.06), vec2(0.22, 0.17)));
        d = min(d, ellipse(q - vec2(0.24, -0.01), vec2(0.2, 0.11)));
        d = min(d, ellipse(q - vec2(0.03, -0.05), vec2(0.4, 0.08)));
        return d * s;
      }
      void main() {
        vec2 uv = vUv;
        float sun = smoothstep(0.25, 0.5, uDay) * (1.0 - smoothstep(0.75, 0.95, uDay));
        float dusk = exp(-pow((uDay - 0.38) * 7.0, 2.0)) + exp(-pow((uDay - 0.85) * 7.0, 2.0));
        vec3 top = mix(vec3(0.05, 0.05, 0.16), vec3(0.24, 0.52, 0.92), sun);
        vec3 bot = mix(mix(vec3(0.17, 0.12, 0.33), vec3(0.70, 0.86, 1.0), sun), vec3(1.0, 0.58, 0.42), clamp(dusk, 0.0, 1.0) * 0.85);
        vec3 col = floor(mix(bot, top, uv.y) * 14.0 + 0.5) / 14.0;
        vec2 p = vec2(uv.x * uAspect, uv.y);
        vec2 sp = p * 60.0;
        float st = step(0.975, h21(floor(sp))) * smoothstep(0.3, 0.0, length(fract(sp) - 0.5));
        col += st * (1.0 - sun) * smoothstep(0.2, 0.6, uv.y);
        vec3 lit = mix(vec3(0.42, 0.38, 0.62), vec3(1.0), sun), shade = mix(vec3(0.27, 0.23, 0.45), vec3(0.78, 0.83, 0.95), sun);
        for (int layer = 0; layer < 2; layer++) {
          vec2 q = p * vec2(2.2, 4.0) * (1.0 + float(layer) * 0.6) + vec2(uTime * 0.04, 0.0) + float(layer) * 7.3;
          q.x += h21(vec2(floor(q.y), 3.1 + float(layer))) * 5.0;
          vec2 id = floor(q); vec2 f = fract(q) - 0.5;
          if (h21(id + 1.3) > uCover) continue;
          f -= (vec2(h21(id + 9.1), h21(id + 4.2)) - 0.5) * 0.35;
          if (cloud(f, id) < 0.0) col = mix(lit, shade, 1.0 - step(cloud(f + vec2(0.0, 0.05), id), 0.0));
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  bindParams(root, { time: (v) => { uniforms.uDay.value = v; }, cover: (v) => { uniforms.uCover.value = v; } });
  dragX(view, (dx) => {
    const v = (uniforms.uDay.value + dx / view.getBoundingClientRect().width + 1) % 1;
    uniforms.uDay.value = v; setParam(root, "time", v);
  });
  onResize(view, () => { const [w, h] = sizeOf(view); renderer.setSize(w, h, false); uniforms.uAspect.value = w / h; });
  const motion = !reduceMotion();
  watch(view, (dt) => { if (motion) uniforms.uTime.value += dt; renderer.render(scene, camera); });
}

const INITS: Record<string, (root: HTMLElement, view: HTMLElement) => void> = { outline, cube, sky };

export function initShader(root: HTMLElement) {
  const view = root.querySelector<HTMLElement>("[data-view]")!;
  const fn = INITS[root.dataset.shader!];
  if (!fn || !view) return;
  try { fn(root, view); view.dataset.live = "true"; }
  catch (e) { console.error(e); view.dataset.live = "false"; }
}
