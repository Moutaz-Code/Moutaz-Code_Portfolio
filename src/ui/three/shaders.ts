import * as THREE from "three";
import { makeRenderer, watch, sizeOf, reduceMotion, onResize } from "./common";

/*
  DOM contract (see src/ui/components/home/ShaderRow.astro):
    [data-shader="outline|cube|sky"]   one row
      [data-view]                      the live window (canvas host)
      input[data-param="name"]         range, checkbox or radio group; a sibling <output> shows range values
*/
type Params = Record<string, (v: number) => void>;

function bindParams(root: HTMLElement, params: Params) {
  root.querySelectorAll<HTMLInputElement>("input[data-param]").forEach((input) => {
    const fn = params[input.dataset.param!]; if (!fn) return;
    const out = input.closest("label")?.querySelector("output");
    const digits = +(input.dataset.digits ?? 2);
    const set = () => {
      if (input.type === "radio") { if (input.checked) fn(+input.value); return; }
      const v = input.type === "checkbox" ? (input.checked ? 1 : 0) : +input.value;
      if (out) out.textContent = v.toFixed(digits);
      fn(v);
    };
    input.addEventListener(input.type === "range" ? "input" : "change", set);
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
function drag(el: HTMLElement, onMove: (dx: number, dy: number) => void) {
  const s = { down: false, x: 0, y: 0, idle: 9 };
  el.addEventListener("pointerdown", (e) => { s.down = true; s.x = e.clientX; s.y = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => { if (!s.down) return; onMove(e.clientX - s.x, e.clientY - s.y); s.x = e.clientX; s.y = e.clientY; s.idle = 0; });
  const up = () => { s.down = false; };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  return s;
}
/** Colours are authored as sRGB hex and lit in linear space. */
const lin = (hex: number) => new THREE.Color(hex).convertSRGBToLinear();
const FULL_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

/* ── 1. Outline and posterise ────────────────────────
   The scene is drawn twice: once with MeshNormalMaterial as an override into a normals target, once lit into a
   colour target. A full-screen pass converts the lit colour to sRGB, runs Sobel on both buffers (normals catch
   silhouettes and creases, luminance catches shading and texture edges), bands the colour and inks the edges.     */
function outline(root: HTMLElement, view: HTMLElement) {
  const renderer = makeRenderer(view, { maxDpr: 1.5 });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.5, 40);
  camera.position.set(0, 3.5, 8.8); camera.lookAt(0, 0.75, 0);
  scene.add(new THREE.HemisphereLight(lin(0xfff1f6), lin(0x6b4a7a), 1.25));
  const sun = new THREE.DirectionalLight(lin(0xffe2cf), 2.0); sun.position.set(4, 7, 3); scene.add(sun);

  const mat = (c: number, rough = 0.7) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: rough });
  const world = new THREE.Group(); scene.add(world);
  const add = <T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0, parent: THREE.Object3D = world) => { o.position.set(x, y, z); parent.add(o); return o; };

  // floor and a baggage carousel: an oval belt around a central island, as in Duck Around's hall
  add(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.12, 64), mat(0xefe6ee, 0.9)), 0, -0.06);
  const A = 2.0, B = 1.15;                                    // belt ellipse radii
  const beltShape = new THREE.Shape(); beltShape.absellipse(0, 0, A + 0.42, B + 0.42, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path(); hole.absellipse(0, 0, A - 0.42, B - 0.42, 0, Math.PI * 2, true, 0); beltShape.holes.push(hole);
  const belt = add(new THREE.Mesh(new THREE.ExtrudeGeometry(beltShape, { depth: 0.32, bevelEnabled: false, curveSegments: 48 }), mat(0x5a4470, 0.5)), 0, 0.32, 0);
  belt.rotation.x = Math.PI / 2;
  const islandShape = new THREE.Shape(); islandShape.absellipse(0, 0, A - 0.5, B - 0.5, 0, Math.PI * 2, false, 0);
  const island = add(new THREE.Mesh(new THREE.ExtrudeGeometry(islandShape, { depth: 0.5, bevelEnabled: false, curveSegments: 48 }), mat(0x8c6aa3, 0.8)), 0, 0.5, 0);
  island.rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.6, 0.55), mat(0x3b2f52)), 0, 1.3, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.2), mat(0x2a2238)), 0, 2.45, 0.38);

  // suitcases ride the belt
  const bagColours = [0xd9518f, 0x3e68d6, 0xf2b53a, 0x58b98a, 0x9b6bd6, 0xe0703a, 0x2fb5c9, 0xf06a6a];
  const bags = bagColours.map((c, i) => {
    const g = new THREE.Group();
    const w = 0.5 + (i % 3) * 0.08, h = 0.32 + (i % 2) * 0.08;
    add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), mat(c, 0.55)), 0, h / 2, 0, g);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.05), mat(0x2a2238)), 0, h + 0.03, 0, g);
    add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.05, 0.31), mat(0x2a2238)), 0, h * 0.5, 0, g);
    g.userData.phase = (i / bagColours.length) * Math.PI * 2;
    world.add(g); return g;
  });

  // the duck, on a little round table by the belt
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 32), mat(0xe9e2ee)), 2.9, 0.82, 1.3);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 12), mat(0x3b2f52)), 2.9, 0.4, 1.3);
  const duck = add(new THREE.Group(), 2.9, 0.85, 1.3);
  const body = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat(0x2f4fd0, 0.5)), 0, 0.24, 0, duck); body.scale.set(1.25, 0.85, 1);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), mat(0x2f4fd0, 0.5)), 0.24, 0.55, 0, duck);
  const beak = add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), mat(0xf2a23a, 0.5)), 0.48, 0.52, 0, duck); beak.rotation.z = -Math.PI / 2;
  duck.rotation.y = -0.9;

  const rt = new THREE.WebGLRenderTarget(4, 4), rtN = new THREE.WebGLRenderTarget(4, 4);
  const normalMat = new THREE.MeshNormalMaterial();
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rt.texture }, tNormal: { value: rtN.texture }, uTexel: { value: new THREE.Vector2() },
      uBands: { value: 4 }, uLine: { value: 0.35 }, uWidth: { value: 1.2 }, uView: { value: 0 }, uSplit: { value: 0 },
    },
    vertexShader: FULL_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor, tNormal; uniform vec2 uTexel; uniform float uBands, uLine, uWidth, uView, uSplit; varying vec2 vUv;
      vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      // background: a warm gradient where nothing was drawn (alpha 0)
      vec3 lit(vec2 uv) {
        vec4 c = texture2D(tColor, uv);
        vec3 bg = mix(vec3(0.98, 0.74, 0.66), vec3(0.83, 0.45, 0.66), uv.y);
        return mix(bg, toSRGB(c.rgb), c.a);
      }
      vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).rgb; }
      float lum(vec2 uv) { return dot(lit(uv), vec3(0.299, 0.587, 0.114)); }
      void main() {
        vec2 o = uTexel * uWidth;
        vec2 a = vUv + vec2(-o.x, o.y), b = vUv + vec2(0.0, o.y), c = vUv + vec2(o.x, o.y);
        vec2 d = vUv + vec2(-o.x, 0.0), f = vUv + vec2(o.x, 0.0);
        vec2 g = vUv + vec2(-o.x, -o.y), h = vUv + vec2(0.0, -o.y), i = vUv + vec2(o.x, -o.y);
        vec3 nx = -nrm(a) - 2.0 * nrm(d) - nrm(g) + nrm(c) + 2.0 * nrm(f) + nrm(i);
        vec3 ny = -nrm(g) - 2.0 * nrm(h) - nrm(i) + nrm(a) + 2.0 * nrm(b) + nrm(c);
        float cx = -lum(a) - 2.0 * lum(d) - lum(g) + lum(c) + 2.0 * lum(f) + lum(i);
        float cy = -lum(g) - 2.0 * lum(h) - lum(i) + lum(a) + 2.0 * lum(b) + lum(c);
        float nEdge = smoothstep(uLine, uLine + 0.15, length(nx) + length(ny));
        float cEdge = smoothstep(uLine + 0.3, uLine + 0.45, length(vec2(cx, cy)));
        float edge = max(nEdge, cEdge);
        vec3 base = lit(vUv);
        vec3 post = mix(floor(base * uBands + 0.5) / uBands, vec3(0.14, 0.07, 0.2), edge);
        vec3 col = post;
        if (uView > 0.5 && uView < 1.5) col = base;
        else if (uView > 1.5 && uView < 2.5) col = nrm(vUv);
        else if (uView > 2.5) col = mix(vec3(0.96), vec3(0.12), nEdge) * (1.0 - cEdge * 0.55) + vec3(0.9, 0.3, 0.5) * cEdge * 0.55 * (1.0 - nEdge);
        if (uView < 0.5 && vUv.x < uSplit) col = base;
        if (uView < 0.5 && uSplit > 0.001) col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, uTexel.x * 1.5, abs(vUv.x - uSplit)));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  bindParams(root, {
    bands: (v) => { post.uniforms.uBands.value = v; },
    line: (v) => { post.uniforms.uLine.value = v; },
    width: (v) => { post.uniforms.uWidth.value = v; },
    split: (v) => { post.uniforms.uSplit.value = v; },
    view: (v) => { post.uniforms.uView.value = v; },
  });
  onResize(view, () => {
    const [w, h] = sizeOf(view); renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio(), pw = Math.floor(w * pr), ph = Math.floor(h * pr);
    rt.setSize(pw, ph); rtN.setSize(pw, ph); post.uniforms.uTexel.value.set(1 / pw, 1 / ph);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  });
  let rotY = 0.35, beltT = 0;
  const held = drag(view, (dx) => { rotY += dx * 0.008; });
  const motion = !reduceMotion();
  watch(view, (dt, t) => {
    held.idle += dt;
    if (!held.down && motion && held.idle > 2) rotY += dt * 0.12;
    world.rotation.y = rotY;
    if (motion) beltT += dt * 0.22;
    bags.forEach((g) => {
      const a = g.userData.phase + beltT;
      g.position.set(Math.cos(a) * A, 0.33, Math.sin(a) * B);
      g.rotation.y = -Math.atan2(Math.cos(a) * B, -Math.sin(a) * A);
    });
    duck.position.y = 0.85 + (motion ? Math.abs(Math.sin(t * 2.2)) * 0.05 : 0);
    renderer.setRenderTarget(rtN); scene.overrideMaterial = normalMat; renderer.render(scene, camera);
    renderer.setRenderTarget(rt); scene.overrideMaterial = null; renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  });
}

/* ── 2. Stencil portals ──────────────────────────────
   Each face is a quad with colorWrite and depthWrite off that writes its own ID (1–6) into the stencil buffer.
   Every material in a world tests stencil == its ID, so a world only appears through its own face. The frame is
   ungated and the backdrop tests 0. Back faces are culled, so far faces never overwrite near ones.                 */
const SKY_VERT = "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_FRAG = /* glsl */ `uniform vec3 uTop, uBottom; uniform float uStars; varying vec3 vDir;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  void main(){
    vec3 d = normalize(vDir);
    vec3 col = mix(uBottom, uTop, smoothstep(-0.4, 0.8, d.y));
    vec3 q = d * 60.0;
    col += uStars * step(0.985, hash(floor(q))) * smoothstep(0.35, 0.0, length(fract(q) - 0.5));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;
const skyMat = (top: number, bottom: number, stars: number) => new THREE.ShaderMaterial({
  uniforms: { uTop: { value: lin(top) }, uBottom: { value: lin(bottom) }, uStars: { value: stars } },
  vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
});
function gate(m: THREE.Material, ref: number, on = true) {
  Object.assign(m, {
    stencilWrite: on, stencilRef: ref, stencilFuncMask: 0x07, stencilWriteMask: 0, stencilFunc: THREE.EqualStencilFunc,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  m.needsUpdate = true;
  return m;
}

function cube(root: HTMLElement, view: HTMLElement) {
  const renderer = makeRenderer(view, { maxDpr: 1.5 });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x0d0b16, 1);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(lin(0xffffff), lin(0x40385a), 1.1));
  const dl = new THREE.DirectionalLight(lin(0xffffff), 2.2); dl.position.set(3, 4, 5); scene.add(dl);
  const camera = new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 100); camera.position.set(0, 0.4, 8); camera.lookAt(0, 0, 0);

  const S = 2.2, h = S / 2, T = S * 0.06;
  const backdrop = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), skyMat(0x1b1636, 0x3a2350, 1));
  backdrop.renderOrder = 7; gate(backdrop.material as THREE.Material, 0); scene.add(backdrop);
  const g = new THREE.Group(); scene.add(g);
  const barMat = new THREE.MeshStandardMaterial({ color: lin(0xece6f2), roughness: 0.35, metalness: 0.05 });
  const bar = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), barMat); m.position.set(x, y, z); m.renderOrder = 8; g.add(m);
  };
  [-h, h].forEach((a) => [-h, h].forEach((b) => { bar(S + T, T, T, 0, a, b); bar(T, S + T, T, a, 0, b); bar(T, T, S + T, a, b, 0); }));

  // six small worlds: each has its own sky colours, a floor and one object
  const faces = [[0, 0, 1, 0, 0, 0], [0, 0, -1, 0, Math.PI, 0], [1, 0, 0, 0, Math.PI / 2, 0], [-1, 0, 0, 0, -Math.PI / 2, 0], [0, 1, 0, -Math.PI / 2, 0, 0], [0, -1, 0, Math.PI / 2, 0, 0]];
  const worldsDef = [
    { top: 0xff9a8b, bottom: 0x6a2c70, obj: 0xffd166, geo: new THREE.TorusKnotGeometry(S * 0.15, S * 0.045, 96, 12) },
    { top: 0x7ad3ff, bottom: 0x1d3a8a, obj: 0xffffff, geo: new THREE.IcosahedronGeometry(S * 0.24, 0) },
    { top: 0xc4f5b0, bottom: 0x1f6b52, obj: 0xff6b9a, geo: new THREE.OctahedronGeometry(S * 0.24, 0) },
    { top: 0xffe29a, bottom: 0xb3541e, obj: 0x3e68d6, geo: new THREE.TorusGeometry(S * 0.19, S * 0.06, 16, 48) },
    { top: 0xd7b8ff, bottom: 0x3b1f6b, obj: 0x7af0d0, geo: new THREE.DodecahedronGeometry(S * 0.23, 0) },
    { top: 0x9af0ff, bottom: 0x0f4c5c, obj: 0xffb347, geo: new THREE.ConeGeometry(S * 0.2, S * 0.38, 5) },
  ];
  const IDS = [0xff4d6d, 0x4d8dff, 0x58e0a0, 0xffc24d, 0xb36bff, 0x4de3ff];
  const portalMats: THREE.MeshBasicMaterial[] = [], gated: THREE.Material[] = [], spinners: THREE.Object3D[] = [];
  faces.forEach((f, i) => {
    const id = i + 1;
    const m = new THREE.MeshBasicMaterial({
      color: lin(IDS[i]), colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: id, stencilWriteMask: 0x07,
      stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
    });
    portalMats.push(m);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(S, S), m);
    q.position.set(f[0] * h, f[1] * h, f[2] * h); q.rotation.set(f[3], f[4], f[5]); q.renderOrder = 6; g.add(q);
    const w = worldsDef[i];
    // the sky is a large sphere: the stencil already limits it to the face, so it must cover the whole window
    const sky = new THREE.Mesh(new THREE.SphereGeometry(4.5, 32, 16), skyMat(w.top, w.bottom, 0.6));
    sky.renderOrder = 9; g.add(sky);
    // orient each world's floor to sit "below" relative to its face, so every face looks into an upright room
    const room = new THREE.Group(); room.rotation.set(f[3], f[4], f[5]); g.add(room);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.8, h * 0.8, 0.04, 40), new THREE.MeshStandardMaterial({ color: lin(w.bottom), roughness: 0.9 }));
    floor.position.set(0, -h * 0.55, -h * 0.1); floor.renderOrder = 10; room.add(floor);
    const obj = new THREE.Mesh(w.geo, new THREE.MeshStandardMaterial({ color: lin(w.obj), roughness: 0.35, emissive: lin(w.obj).multiplyScalar(0.12) }));
    obj.position.set(0, -h * 0.05, -h * 0.1); obj.renderOrder = 10; room.add(obj); spinners.push(obj);
    for (const mm of [sky.material, floor.material, obj.material] as THREE.Material[]) { gate(mm, id); gated.push(mm); }
  });

  let speed = 0.3, rx = -0.35, ry = 0.7, mode = 0;
  const setMode = (v: number) => {
    mode = v;
    portalMats.forEach((m) => { m.colorWrite = v === 1; m.needsUpdate = true; });
    gated.forEach((m) => { m.stencilWrite = v !== 2; m.needsUpdate = true; });
    g.children.forEach((c) => { if ((c as THREE.Mesh).renderOrder >= 9 || c.type === "Group") c.visible = v !== 1; });
  };
  bindParams(root, { spin: (v) => { speed = v; }, view: setMode });
  const held = drag(view, (dx, dy) => { ry += dx * 0.01; rx = Math.max(-1.3, Math.min(1.3, rx + dy * 0.01)); });
  onResize(view, () => { const [w, hh] = sizeOf(view); renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); });
  const motion = !reduceMotion();
  watch(view, (dt, t) => {
    if (motion && !held.down) ry += dt * speed;
    g.rotation.set(rx + (motion ? Math.sin(t / 3) * 0.12 : 0), ry, 0);
    if (motion) spinners.forEach((o, j) => { o.rotation.y += dt * (0.5 + j * 0.08); o.rotation.x += dt * 0.2; });
    renderer.render(scene, camera);
  });
  void mode;
}

/* ── 3. Cartoon sky ──────────────────────────────────
   A banded vertical gradient driven by time of day, a sun and moon on an arc, stars from a hashed grid, clouds made
   of four ellipse SDFs per grid cell, and two layers of hills. The cloud shadow is the same SDF sampled again with a
   vertical offset, so the two-tone look costs one extra evaluation.                                                */
function sky(root: HTMLElement, view: HTMLElement) {
  const renderer = makeRenderer(view, { maxDpr: 1.25 });
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = { uTime: { value: 0 }, uDay: { value: 0.8 }, uCover: { value: 0.5 }, uBands: { value: 14 }, uAspect: { value: 4 / 3 }, uView: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: FULL_VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDay, uCover, uBands, uAspect, uView; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      // cheap ellipse distance (Inigo Quilez's approximation): negative inside
      float ellipse(vec2 p, vec2 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
      float cloud(vec2 q, vec2 id) {
        float s = mix(0.8, 1.15, h21(id + 3.7)); q /= s;
        float d = ellipse(q - vec2(-0.18, 0.0), vec2(0.24, 0.13));
        d = min(d, ellipse(q - vec2(0.05, 0.06), vec2(0.22, 0.17)));
        d = min(d, ellipse(q - vec2(0.24, -0.01), vec2(0.2, 0.11)));
        d = min(d, ellipse(q - vec2(0.03, -0.05), vec2(0.4, 0.08)));
        return d * s;
      }
      float hills(float x, float f, float a, float o) { return o + a * (sin(x * f) * 0.6 + sin(x * f * 2.3 + 1.7) * 0.3 + sin(x * f * 5.1 + 0.4) * 0.1); }
      void main() {
        vec2 uv = vUv;
        vec2 p = vec2(uv.x * uAspect, uv.y);
        float sun = smoothstep(0.22, 0.32, uDay) * (1.0 - smoothstep(0.7, 0.8, uDay));
        float dusk = exp(-pow((uDay - 0.27) * 9.0, 2.0)) + exp(-pow((uDay - 0.76) * 9.0, 2.0));
        vec3 top = mix(vec3(0.05, 0.05, 0.16), vec3(0.24, 0.52, 0.92), sun);
        vec3 bot = mix(mix(vec3(0.18, 0.13, 0.34), vec3(0.72, 0.87, 1.0), sun), vec3(1.0, 0.56, 0.4), clamp(dusk, 0.0, 1.0) * 0.9);
        vec3 col = floor(mix(bot, top, uv.y) * uBands + 0.5) / uBands;

        // sun and moon ride opposite ends of one arc across the sky
        float ang = (uDay - 0.25) * 6.2831;
        vec2 arc = vec2(0.5 * uAspect - cos(ang) * 0.42 * uAspect, 0.18 + sin(ang) * 0.62);
        vec2 marc = vec2(0.5 * uAspect + cos(ang) * 0.42 * uAspect, 0.18 - sin(ang) * 0.62);
        float sd = length(p - arc), md = length(p - marc);
        col = mix(col, vec3(1.0, 0.93, 0.7), smoothstep(0.075, 0.07, sd));
        col += vec3(1.0, 0.7, 0.4) * 0.25 * smoothstep(0.2, 0.07, sd) * (1.0 - step(sd, 0.07));
        float moon = smoothstep(0.052, 0.048, md) * (1.0 - smoothstep(0.052, 0.048, length(p - marc - vec2(0.025, 0.012))));
        col = mix(col, vec3(0.95, 0.95, 1.0), moon * (1.0 - sun));

        vec2 sp = p * 60.0;
        float st = step(0.975, h21(floor(sp))) * smoothstep(0.3, 0.0, length(fract(sp) - 0.5));
        col += st * (1.0 - sun) * smoothstep(0.25, 0.6, uv.y);

        vec3 lit = mix(vec3(0.44, 0.4, 0.64), vec3(1.0), sun), shade = mix(vec3(0.28, 0.24, 0.46), vec3(0.78, 0.83, 0.95), sun);
        lit = mix(lit, vec3(1.0, 0.78, 0.66), clamp(dusk, 0.0, 1.0) * 0.6);
        float sdfMin = 1.0; float cellLine = 0.0; float cellOn = 0.0;
        for (int layer = 0; layer < 2; layer++) {
          vec2 q = p * vec2(2.2, 4.0) * (1.0 + float(layer) * 0.6) + vec2(uTime * 0.04 * (1.0 + float(layer) * 0.5), 0.0) + float(layer) * 7.3;
          q.x += h21(vec2(floor(q.y), 3.1 + float(layer))) * 5.0;
          vec2 id = floor(q); vec2 f = fract(q) - 0.5;
          if (layer == 0) { vec2 e = abs(f); cellLine = step(0.48, max(e.x, e.y)); cellOn = step(h21(id + 1.3), uCover); }
          if (h21(id + 1.3) > uCover) continue;
          f -= (vec2(h21(id + 9.1), h21(id + 4.2)) - 0.5) * 0.35;
          float d = cloud(f, id);
          sdfMin = min(sdfMin, d);
          if (d < 0.0) col = mix(lit, shade, 1.0 - step(cloud(f + vec2(0.0, 0.05), id), 0.0));
        }

        // two layers of hills in flat colour, darker at night
        float x = p.x;
        vec3 far = mix(vec3(0.16, 0.13, 0.3), vec3(0.42, 0.62, 0.62), sun), near = mix(vec3(0.09, 0.08, 0.18), vec3(0.24, 0.45, 0.36), sun);
        far = mix(far, vec3(0.55, 0.32, 0.42), clamp(dusk, 0.0, 1.0) * 0.5);
        if (uv.y < hills(x + 3.0, 3.1, 0.05, 0.2)) col = far;
        if (uv.y < hills(x, 2.2, 0.06, 0.11)) col = near;

        if (uView > 0.5 && uView < 1.5) {
          // the distance field: blue outside, orange inside, contour lines every 0.05
          float d = sdfMin;
          vec3 c = d < 0.0 ? vec3(0.95, 0.6, 0.3) : vec3(0.3, 0.5, 0.9);
          c *= 0.75 + 0.25 * cos(d * 125.0);
          c = mix(c, vec3(1.0), 1.0 - smoothstep(0.0, 0.006, abs(d)));
          col = c;
        } else if (uView > 1.5) {
          col = mix(col * 0.45, col, cellOn);
          col = mix(col, vec3(1.0, 0.85, 0.3), cellLine * 0.8);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  bindParams(root, {
    time: (v) => { uniforms.uDay.value = v; }, cover: (v) => { uniforms.uCover.value = v; },
    bands: (v) => { uniforms.uBands.value = v; }, view: (v) => { uniforms.uView.value = v; },
  });
  drag(view, (dx) => {
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
