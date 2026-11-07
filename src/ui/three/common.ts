import * as THREE from "three";

// Raw sRGB in, raw sRGB out: card faces and shader colours are authored as sRGB values.
THREE.ColorManagement.enabled = false;

export const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
export const sizeOf = (el: Element): [number, number] => {
  const b = el.getBoundingClientRect();
  return [Math.max(1, b.width), Math.max(1, b.height)];
};

export function makeRenderer(container: HTMLElement, opts: { alpha?: boolean; maxDpr?: number } = {}) {
  const canvas = document.createElement("canvas");
  container.prepend(canvas);
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !!opts.alpha, stencil: true, powerPreference: "high-performance" });
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr ?? 2));
  if (opts.alpha) r.setClearColor(0x000000, 0);
  return r;
}

type Loop = { visible: boolean; tick: (dt: number, t: number) => void };
const loops = new Set<Loop>();
let started = false;
let last = 0;
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!document.hidden) loops.forEach((l) => { if (l.visible) l.tick(dt, now / 1000); });
  requestAnimationFrame(frame);
}
/** Adds a view to the shared loop; it only ticks while its element is on screen. */
export function watch(el: Element, tick: Loop["tick"]) {
  const loop: Loop = { visible: false, tick };
  new IntersectionObserver((es) => es.forEach((e) => { loop.visible = e.isIntersecting; }), { rootMargin: "80px" }).observe(el);
  loops.add(loop);
  if (!started) { started = true; last = performance.now(); requestAnimationFrame(frame); }
  return loop;
}

/** Calls fn once, the first time el comes near the viewport. */
export function whenNear(el: Element, fn: () => void, margin = "400px") {
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin });
  io.observe(el);
}

export function onResize(el: Element, fn: () => void) {
  new ResizeObserver(fn).observe(el);
  fn();
}
