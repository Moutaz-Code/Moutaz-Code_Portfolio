import * as THREE from "three";
import { makeCanvas, drawFront, drawBack, drawCover, drawShadow, drawSlot, fontsReady, type CardData } from "./cardFace";
import { makeRenderer, watch, sizeOf, reduceMotion, onResize, ease } from "./common";

const CARD_W = 2.0, CARD_H = 2.8;
const TABLE_Z = -0.6;          // the plane shadows fall on
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/*
  DOM contract (see src/pages/index.astro):
    [data-deck]                      root
      script[data-deck-data]         JSON CardData[]
      [data-deck-stage]              the canvas host
      [data-filter="all|Games|…"]    filter buttons
      [data-deck-step="-1|1"]        previous / next
      [data-detail="<slug>"]         one detail panel per project (server-rendered)
      [data-pick="<slug>"]           index links; clicking plays that card
*/

/* Critically-damped-ish springs: every animated channel has a target, a value and a velocity.
   Integrated with fixed substeps so stiff springs stay stable at low frame rates. */
type Ch = { v: number; vel: number; t: number };
const ch = (v: number): Ch => ({ v, vel: 0, t: v });
function spring(c: Ch, k: number, zeta: number, dt: number) {
  const d = 2 * zeta * Math.sqrt(k);
  c.vel += (k * (c.t - c.v) - d * c.vel) * dt;
  c.v += c.vel * dt;
}

export function initDeck(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-deck-stage]")!;
  const data: CardData[] = JSON.parse(root.querySelector("[data-deck-data]")!.textContent || "[]");
  const details = [...root.querySelectorAll<HTMLElement>("[data-detail]")];
  const picks = [...root.querySelectorAll<HTMLElement>("[data-pick]")];
  const filters = [...root.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  const motion = !reduceMotion();

  const renderer = makeRenderer(stage, { alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);

  const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.anisotropy = aniso; return t; };
  const coverC = makeCanvas(); const coverT = tex(coverC.c);

  // shared shadow texture and the drop-zone outline
  const shC = document.createElement("canvas"); shC.width = 256; shC.height = 320;
  drawShadow(shC.getContext("2d")!, 256, 320);
  const shadowTex = new THREE.CanvasTexture(shC);
  const shadowGeo = new THREE.PlaneGeometry(CARD_W / 0.66, CARD_H / 0.74);
  const slotC = document.createElement("canvas"); slotC.width = 2 * 220; slotC.height = 2 * 300;
  const slotT = new THREE.CanvasTexture(slotC);
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.08, CARD_H * 1.06), new THREE.MeshBasicMaterial({ map: slotT, transparent: true, depthWrite: false, opacity: 0.9 }));
  slot.position.z = TABLE_Z; slot.renderOrder = -2; scene.add(slot);

  type Card = ReturnType<typeof makeCard>;
  function makeCard(d: CardData, i: number) {
    const front = makeCanvas(), back = makeCanvas();
    const fT = tex(front.c), bT = tex(back.c);
    let img: HTMLImageElement | null = null;
    const paint = () => { drawFront(front.ctx, d, img); fT.needsUpdate = true; drawBack(back.ctx, d); bT.needsUpdate = true; };
    if (d.cover) { img = new Image(); img.decoding = "async"; img.onload = paint; img.src = d.cover; }
    const fMat = new THREE.MeshBasicMaterial({ map: fT, alphaTest: 0.5 });
    const bMat = new THREE.MeshBasicMaterial({ map: coverT, alphaTest: 0.5 });
    const root = new THREE.Group(), flip = new THREE.Group(); root.add(flip);
    const fm = new THREE.Mesh(cardGeo, fMat), bm = new THREE.Mesh(cardGeo, bMat);
    bm.rotation.y = Math.PI; fm.userData.i = bm.userData.i = i;
    flip.add(fm, bm); scene.add(root);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
    shadow.renderOrder = -1; scene.add(shadow);
    return {
      d, i, root, flip, fm, bm, fMat, bMat, backTex: bT, paint, shadow,
      x: ch(4), y: ch(2), z: ch(-0.4), rz: ch(0.1), s: ch(0.4), f: ch(Math.PI),
      tiltX: 0, tiltY: 0, dim: 0, inPile: true, flipped: false, showInfo: false,
    };
  }
  const cards = data.map(makeCard);
  const repaint = () => {
    drawCover(coverC.ctx); coverT.needsUpdate = true;
    drawSlot(slotC.getContext("2d")!, slotC.width, slotC.height); slotT.needsUpdate = true;
    cards.forEach((c) => c.paint());
  };
  repaint(); fontsReady.then(repaint);
  window.addEventListener("themechange", repaint);

  let played: Card | null = null, hovered: Card | null = null, dragCard: Card | null = null;
  let dragging = false, downX = 0, downY = 0, dealt = false, filter = "all";
  const dragPos = new THREE.Vector3(), pointer = new THREE.Vector2(), ray = new THREE.Raycaster();
  const order = () => cards.filter((c) => filter === "all" || c.d.category === filter);

  function show(slug: string | null) {
    details.forEach((el) => { el.hidden = el.dataset.detail !== slug; });
    picks.forEach((el) => el.setAttribute("aria-current", String(el.dataset.pick === slug)));
  }
  function play(c?: Card | null) {
    if (!c || c === played) return;
    if (played) played.flipped = false;
    played = c; c.inPile = false; c.flipped = false; show(c.d.slug);
  }
  function step(dir: number) {
    const list = order(); if (!list.length) return;
    const k = played ? list.indexOf(played) : -1;
    play(list[(k + dir + list.length) % list.length]);
  }
  function toggleFlip(c: Card) { c.flipped = !c.flipped; if (c.flipped) c.showInfo = true; }
  function applyFilter(f: string) {
    filter = f;
    filters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === f)));
    picks.forEach((el) => { const c = cards.find((k) => k.d.slug === el.dataset.pick); (el.parentElement as HTMLElement).hidden = !!c && f !== "all" && c.d.category !== f; });
    if (!dealt) return;
    cards.forEach((c) => { const keep = f === "all" || c.d.category === f; c.inPile = !keep; if (!keep) { c.flipped = false; c.showInfo = false; } });
    if (played && played.inPile) { played = null; play(order()[0]); }
  }
  filters.forEach((b) => b.addEventListener("click", () => applyFilter(b.dataset.filter!)));
  root.querySelectorAll<HTMLElement>("[data-deck-step]").forEach((b) => b.addEventListener("click", () => step(+b.dataset.deckStep!)));
  picks.forEach((el) => el.addEventListener("click", (e) => {
    const c = cards.find((k) => k.d.slug === el.dataset.pick); if (!c) return;
    e.preventDefault();
    if (filter !== "all" && c.d.category !== filter) applyFilter("all");
    play(c);
  }));
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
    else if ((e.key === "Enter" || e.key === " ") && played && e.target === stage) { toggleFlip(played); e.preventDefault(); }
  });

  function deal() {
    if (dealt) return; dealt = true;
    const list = order();
    if (!motion) { list.forEach((c) => { c.inPile = false; }); play(list[0]); return; }
    list.forEach((c, j) => setTimeout(() => { c.inPile = false; }, 150 + j * 70));
    setTimeout(() => { if (!played) play(list[0]); }, 150 + list.length * 70 + 250);
  }
  new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) deal(); }, { threshold: 0.3 }).observe(stage);

  // Camera framing: the card on the table fills ~60% of the stage height, and ~70% of its width on narrow screens.
  let visH = 5, visW = 6, narrow = false;
  onResize(stage, () => {
    const [w, h] = sizeOf(stage);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    narrow = camera.aspect < 0.9;
    visH = Math.max(CARD_H / 0.6, CARD_W / 0.7 / camera.aspect); visW = visH * camera.aspect;
    camera.position.set(0, 0, visH / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
  });

  const ndc = (e: PointerEvent) => { const b = stage.getBoundingClientRect(); pointer.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); };
  const pick = (e: PointerEvent) => {
    ndc(e); ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(cards.filter((c) => !c.inPile).flatMap((c) => [c.fm, c.bm]), false)[0];
    return hit ? cards[hit.object.userData.i] : null;
  };
  const worldAt = (e: PointerEvent, z: number) => {
    ndc(e); ray.setFromCamera(pointer, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    return o.clone().addScaledVector(d, (z - o.z) / d.z);
  };
  stage.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("button, a")) return;
    const c = pick(e); if (!c) return;
    dragCard = c; dragging = false; downX = e.clientX; downY = e.clientY;
    if (e.pointerType === "mouse") stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (dragCard) {
      if (e.pointerType === "mouse" && !dragging && Math.hypot(e.clientX - downX, e.clientY - downY) > 6) { dragging = true; stage.classList.add("dragging"); }
      if (dragging) dragPos.copy(worldAt(e, 1.2));
      return;
    }
    if (e.pointerType !== "mouse") return;
    hovered = pick(e);
    stage.style.cursor = hovered ? "pointer" : "";
  });
  const end = (e: PointerEvent) => {
    if (!dragCard) return;
    const c = dragCard; dragCard = null; stage.classList.remove("dragging");
    const b = stage.getBoundingClientRect(), fy = (e.clientY - b.top) / b.height;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (!dragging) { if (moved < 10) { if (c === played) toggleFlip(c); else play(c); } }
    else if (c === played) { if (fy > 0.68) { played.flipped = false; played = null; } }
    else if (fy < 0.65) play(c);
    dragging = false;
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", () => { dragCard = null; dragging = false; stage.classList.remove("dragging"); });
  stage.addEventListener("pointerleave", () => { if (!dragCard) hovered = null; });

  const SUB = 1 / 120;
  watch(stage, (dt) => {
    const tableY = visH / 2 - 0.16 - CARD_H / 2;
    const handScale = narrow ? 0.56 : 0.6;
    const handH = CARD_H * handScale, handW = CARD_W * handScale;
    const handY = -visH / 2 + handH * 0.7 - handH / 2;
    const pileX = Math.max(visW / 2 - 0.55, CARD_W / 2 + 0.55);
    const RAD = narrow ? 6 : 9;
    // the drop zone sits on the table plane, scaled so it lines up with the played card on screen; it fades out once a card is down
    const cz = camera.position.z, ratio = (cz - TABLE_Z) / (cz - 0.25);
    slot.position.set(0, tableY * ratio, TABLE_Z); slot.scale.setScalar(ratio);
    const slotMat = slot.material as THREE.MeshBasicMaterial;
    slotMat.opacity += ((dealt && (!played || (dragCard === played && dragging)) ? 0.9 : 0) - slotMat.opacity) * ease(10, dt);

    const hand = cards.filter((c) => !c.inPile && c !== played), n = hand.length;
    const span = Math.max(0, visW - 0.5 - handW);
    const stepA = n > 1 ? Math.min(0.13, span / RAD / (n - 1)) : 0;
    const hi = !dragCard && hovered ? hand.indexOf(hovered) : -1;
    const pile = cards.filter((c) => c.inPile);

    for (const c of cards) {
      let x: number, y: number, z: number, rz: number, s: number, f: number, dim = 0;
      if (c === dragCard && dragging) { x = dragPos.x; y = dragPos.y; z = 1.2; rz = 0; s = c === played ? 1.03 : 0.8; f = c === played && c.flipped ? Math.PI : 0; }
      else if (c.inPile) { const j = pile.indexOf(c); x = pileX; y = tableY + 0.4 + j * 0.02; z = -0.5 + j * 0.01; rz = 0.06 - j * 0.015; s = 0.38; f = Math.PI; dim = 0.25; }
      else if (c === played) { x = 0; y = tableY; z = 0.25; rz = 0; s = 1; f = c.flipped ? Math.PI : 0; }
      else {
        const j = hand.indexOf(c);
        let a = (j - (n - 1) / 2) * stepA;
        if (hi >= 0 && j !== hi) a += (Math.sign(j - hi) * stepA * 0.9) / Math.max(1, Math.abs(j - hi) * 0.8);
        x = Math.sin(a) * RAD; y = Math.cos(a) * RAD - RAD + handY; z = -0.2 + 0.02 * j; rz = -a; s = handScale; f = 0;
        if (j === hi) { y += handH * 0.42; z += 0.9; rz *= 0.3; s = handScale * 1.12; }
      }
      c.x.t = x; c.y.t = y; c.z.t = z; c.rz.t = rz; c.s.t = s; c.f.t = f;

      if (!motion) { for (const k of [c.x, c.y, c.z, c.rz, c.s, c.f]) { k.v = k.t; k.vel = 0; } }
      else {
        const held = c === dragCard && dragging;
        for (let t = 0; t < dt; t += SUB) {
          const h = Math.min(SUB, dt - t);
          const kPos = held ? 700 : 170, zPos = held ? 1 : 0.8;
          spring(c.x, kPos, zPos, h); spring(c.y, kPos, zPos, h); spring(c.z, 200, 0.9, h);
          spring(c.rz, 160, 0.75, h); spring(c.s, 240, 0.7, h); spring(c.f, 110, 0.82, h);
        }
      }
      // a flip lifts the card off the table at the half-way point, so it never clips through
      const flipLift = Math.sin(clamp(c.f.v, 0, Math.PI)) * 0.55;

      if (!c.flipped && c.f.v < 0.2) c.showInfo = false;
      const want = c.showInfo ? c.backTex : coverT;
      if (c.bMat.map !== want) { c.bMat.map = want; c.bMat.needsUpdate = true; }

      // sway: cards lean into their motion, plus a gentle look-at-cursor tilt on hover
      const isHover = motion && c === hovered && !dragCard;
      const tx = clamp(-c.y.vel * 0.035, -0.35, 0.35) + (isHover ? pointer.y * 0.12 : 0);
      const ty = clamp(c.x.vel * 0.035, -0.35, 0.35) + (isHover ? pointer.x * 0.18 : 0);
      c.tiltX += (tx - c.tiltX) * ease(14, dt); c.tiltY += (ty - c.tiltY) * ease(14, dt);

      const zz = c.z.v + flipLift;
      c.root.position.set(c.x.v, c.y.v, zz); c.root.rotation.z = c.rz.v; c.root.scale.setScalar(c.s.v);
      c.flip.rotation.set(-c.tiltX, c.f.v + c.tiltY, 0);
      c.dim += (dim - c.dim) * ease(8, dt);
      const shade = 1 - c.dim * 0.5;
      c.fMat.color.setScalar(shade); c.bMat.color.setScalar(shade);

      // shadow on the table plane: drifts away and softens as the card rises
      const lift = Math.max(0, zz - TABLE_Z);
      const sh = c.shadow, m = sh.material as THREE.MeshBasicMaterial;
      sh.position.set(c.x.v + lift * 0.08, c.y.v - lift * 0.16, TABLE_Z - 0.01);
      sh.rotation.z = c.rz.v;
      sh.scale.setScalar(c.s.v * (1 + lift * 0.06));
      m.opacity = (c.inPile ? 0.35 : 0.7) / (1 + lift * 0.9);
    }
    renderer.render(scene, camera);
  });
  applyFilter("all");
}

