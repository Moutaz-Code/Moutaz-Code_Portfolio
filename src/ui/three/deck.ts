import * as THREE from "three";
import { CW, CH, drawFront, drawBack, drawCover, fontsReady, type CardData } from "./cardFace";
import { makeRenderer, watch, ease, sizeOf, reduceMotion, onResize } from "./common";

const CARD_W = 2.0, CARD_H = 2.8;

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
export function initDeck(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-deck-stage]")!;
  const data: CardData[] = JSON.parse(root.querySelector("[data-deck-data]")!.textContent || "[]");
  const details = [...root.querySelectorAll<HTMLElement>("[data-detail]")];
  const picks = [...root.querySelectorAll<HTMLElement>("[data-pick]")];
  const filters = [...root.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  const motion = !reduceMotion();

  const renderer = makeRenderer(stage, { alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);

  const canvasTex = () => {
    const c = document.createElement("canvas"); c.width = CW; c.height = CH;
    const t = new THREE.CanvasTexture(c); t.anisotropy = aniso;
    return { ctx: c.getContext("2d")!, t };
  };
  const cover = canvasTex();
  const paintCover = () => { drawCover(cover.ctx); cover.t.needsUpdate = true; };

  const slot = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W * 1.12, CARD_H * 1.1),
    new THREE.MeshBasicMaterial({ color: 0x8a8496, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  scene.add(slot);

  type Card = ReturnType<typeof makeCard>;
  function makeCard(d: CardData, i: number) {
    const front = canvasTex(), back = canvasTex();
    let img: HTMLImageElement | null = null;
    const paint = () => { drawFront(front.ctx, d, img); front.t.needsUpdate = true; drawBack(back.ctx, d); back.t.needsUpdate = true; };
    if (d.cover) { img = new Image(); img.decoding = "async"; img.onload = paint; img.src = d.cover; }
    const fMat = new THREE.MeshBasicMaterial({ map: front.t, alphaTest: 0.5 });
    const bMat = new THREE.MeshBasicMaterial({ map: cover.t, alphaTest: 0.5 });
    const root = new THREE.Group(), flip = new THREE.Group(); root.add(flip);
    const fm = new THREE.Mesh(geo, fMat), bm = new THREE.Mesh(geo, bMat);
    bm.rotation.y = Math.PI; fm.userData.i = bm.userData.i = i;
    flip.add(fm, bm); scene.add(root);
    root.position.set(6, 2, -1);
    return {
      d, i, root, flip, fm, bm, fMat, bMat, backTex: back.t, paint,
      pos: root.position.clone(), rotZ: 0.1, scale: 0.62, flipT: Math.PI,
      tiltX: 0, tiltY: 0, dim: 0, inPile: true, flipped: false, showInfo: false,
    };
  }
  const cards = data.map(makeCard);
  const repaint = () => { paintCover(); cards.forEach((c) => c.paint()); };
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
  function unplay() { if (played) { played.flipped = false; played = null; } }
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
    list.forEach((c, j) => setTimeout(() => { c.inPile = false; }, 120 + j * 80));
    setTimeout(() => { if (!played) play(list[0]); }, 120 + list.length * 80 + 300);
  }
  new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) deal(); }, { threshold: 0.3 }).observe(stage);

  let visH = 6.4, visW = 8, narrow = false;
  onResize(stage, () => {
    const [w, h] = sizeOf(stage);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    narrow = camera.aspect < 0.95;
    visH = Math.max(6.6, (narrow ? 3.4 : 4.8) / camera.aspect); visW = visH * camera.aspect;
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
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (dragCard) {
      if (!dragging && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) { dragging = true; stage.classList.add("dragging"); }
      if (dragging) dragPos.copy(worldAt(e, 1.6));
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
    if (!dragging) { if (c === played) toggleFlip(c); else play(c); }
    else if (c === played) { if (fy > 0.62) unplay(); }
    else if (fy < 0.6) play(c);
    dragging = false;
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerleave", () => { if (!dragCard) hovered = null; });

  const tmp = new THREE.Vector3();
  watch(stage, (dt) => {
    const handY = -visH / 2 + (narrow ? 1.15 : 1.5);
    const tableY = visH / 2 - (narrow ? 1.75 : 1.98);
    const pileX = Math.max(narrow ? 1.25 : 1.75, visW / 2 - 1.05);
    const RAD = narrow ? 8 : 11;
    slot.position.set(0, tableY, -0.6); slot.visible = dealt;
    const hand = cards.filter((c) => !c.inPile && c !== played), n = hand.length;
    const span = Math.max(0.5, Math.min(visW - (narrow ? 1.6 : 2.8), n * 1.6));
    const stepA = n > 1 ? Math.min(0.15, span / RAD / (n - 1)) : 0;
    const hi = !dragCard && hovered ? hand.indexOf(hovered) : -1;
    const pile = cards.filter((c) => c.inPile);
    const tableScale = narrow ? 1.0 : 1.04;
    const handScale = narrow ? 0.7 : 0.95;

    for (const c of cards) {
      let x: number, y: number, z: number, rz: number, sc: number, flipTo: number, dim = 0;
      if (c === dragCard && dragging) { x = dragPos.x; y = dragPos.y; z = 1.6; rz = 0; sc = 1.05 * tableScale; flipTo = c === played && c.flipped ? Math.PI : 0; }
      else if (c.inPile) { const j = pile.indexOf(c); x = pileX; y = tableY + j * 0.018; z = -0.5 + j * 0.012; rz = 0.07 - j * 0.012; sc = 0.55; flipTo = Math.PI; dim = 0.2; }
      else if (c === played) { x = 0; y = tableY; z = 0.9; rz = 0; sc = tableScale; flipTo = c.flipped ? Math.PI : 0; }
      else {
        const j = hand.indexOf(c);
        let a = (j - (n - 1) / 2) * stepA;
        if (hi >= 0 && j !== hi) a += (Math.sign(j - hi) * stepA * 0.85) / Math.max(1, Math.abs(j - hi));
        x = Math.sin(a) * RAD; y = Math.cos(a) * RAD - RAD + handY; z = 0.03 * j; rz = -a; sc = handScale; flipTo = 0;
        if (j === hi) { y += 1.0; z += 1.4; rz = 0; sc = handScale * 1.1; }
      }
      const rate = c === dragCard && dragging ? 22 : motion ? 10 : 40;
      const k = ease(rate, dt);
      c.pos.lerp(tmp.set(x, y, z), k); c.rotZ += (rz - c.rotZ) * k; c.scale += (sc - c.scale) * k;
      c.flipT += (flipTo - c.flipT) * ease(motion ? 8 : 40, dt);
      if (!c.flipped && c.flipT < 0.2) c.showInfo = false;
      const want = c.showInfo ? c.backTex : cover.t;
      if (c.bMat.map !== want) { c.bMat.map = want; c.bMat.needsUpdate = true; }
      c.root.position.copy(c.pos); c.root.rotation.z = c.rotZ; c.root.scale.setScalar(c.scale);

      const isHover = motion && c === hovered && !dragCard && !c.inPile;
      const tx = isHover ? pointer.y * 0.2 : 0, ty = isHover ? pointer.x * 0.3 : 0;
      c.tiltX += (tx - c.tiltX) * ease(8, dt); c.tiltY += (ty - c.tiltY) * ease(8, dt);
      c.flip.rotation.set(-c.tiltX * 0.6, c.flipT + c.tiltY * 0.6, 0);
      c.dim += (dim - c.dim) * ease(8, dt);
      const shade = 1 - c.dim * 0.45;
      c.fMat.color.setScalar(shade); c.bMat.color.setScalar(shade);
    }
    renderer.render(scene, camera);
  });
  applyFilter("all");
}
