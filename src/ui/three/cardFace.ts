// Card faces are drawn with Canvas2D and used as plain textures. No per-card shaders.
export const CW = 500, CH = 700, CR = 30;
export const ART = { x: 28, y: 96, w: 444, h: 262 };

export type CardData = {
  slug: string; title: string; category: "Games" | "Graphics" | "Software"; kind?: string;
  accent: string; award?: string; summary: string; role?: string; timeframe?: string;
  stack: string[]; highlights: string[]; wip?: boolean; cover?: string; links: { label: string; url: string }[];
};

const CAT: Record<string, string> = { Games: "#2F7A4B", Graphics: "#2D63B8", Software: "#A85A12" };
const DISPLAY = '"Archivo", "Arial Narrow", sans-serif';
const MONO = '"Martian Mono", ui-monospace, monospace';

const tok = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  const words = text.split(" "); let line = ""; let n = 0;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      if (n === maxLines - 1) { ctx.fillText(line.replace(/[,.;:]?$/, "…"), x, y); return y + lh; }
      ctx.fillText(line, x, y); line = w; y += lh; n++;
    } else line = test;
  }
  ctx.fillText(line, x, y); return y + lh;
}
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  let t = text; while (ctx.measureText(t).width > maxW && t.length > 4) t = t.slice(0, -2) + "…"; return t;
}
function dots(ctx: CanvasRenderingContext2D, w: number, h: number, step: number, rad: number, color: string) {
  ctx.fillStyle = color;
  for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
}
function pip(ctx: CanvasRenderingContext2D, cat: string, cx: number, cy: number, r: number) {
  ctx.fillStyle = CAT[cat]; rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.3); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = r * 0.16; ctx.lineJoin = "round"; ctx.lineCap = "round";
  const u = r * 0.5;
  if (cat === "Games") { ctx.fillRect(cx - u, cy - u * 0.28, u * 2, u * 0.56); ctx.fillRect(cx - u * 0.28, cy - u, u * 0.56, u * 2); }
  else if (cat === "Graphics") { ctx.beginPath(); ctx.moveTo(cx, cy - u); ctx.lineTo(cx + u, cy + u * 0.75); ctx.lineTo(cx - u, cy + u * 0.75); ctx.closePath(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(cx - u * 0.25, cy - u * 0.8); ctx.lineTo(cx - u, cy); ctx.lineTo(cx - u * 0.25, cy + u * 0.8); ctx.moveTo(cx + u * 0.25, cy - u * 0.8); ctx.lineTo(cx + u, cy); ctx.lineTo(cx + u * 0.25, cy + u * 0.8); ctx.stroke(); }
}
function frame(ctx: CanvasRenderingContext2D, accent: string) {
  ctx.clearRect(0, 0, CW, CH);
  rr(ctx, 0, 0, CW, CH, CR); ctx.fillStyle = accent; ctx.fill();
  ctx.save(); rr(ctx, 0, 0, CW, CH, CR); ctx.clip(); dots(ctx, CW, CH, 14, 1.5, "rgba(255,255,255,0.18)"); ctx.restore();
}
function coverFit(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

export function drawFront(ctx: CanvasRenderingContext2D, d: CardData, img: HTMLImageElement | null) {
  const panel = tok("--panel"), panel2 = tok("--panel-2"), text = tok("--text"), muted = tok("--muted"), line = tok("--line");
  frame(ctx, d.accent);
  const ix = 14, iy = 14, iw = CW - 28, ih = CH - 28;
  rr(ctx, ix, iy, iw, ih, 20); ctx.fillStyle = panel; ctx.fill();

  ctx.fillStyle = text; ctx.font = `760 34px ${DISPLAY}`;
  ctx.fillText(fit(ctx, d.title, iw - 100), ix + 22, iy + 54);
  pip(ctx, d.category, ix + iw - 38, iy + 42, 18);

  ctx.save(); rr(ctx, ART.x, ART.y, ART.w, ART.h, 10); ctx.clip();
  if (img && img.complete && img.naturalWidth) coverFit(ctx, img, ART.x, ART.y, ART.w, ART.h);
  else {
    ctx.fillStyle = panel2; ctx.fillRect(ART.x, ART.y, ART.w, ART.h);
    ctx.translate(ART.x, ART.y); ctx.globalAlpha = 0.5; dots(ctx, ART.w, ART.h, 18, 2, d.accent); ctx.globalAlpha = 1;
    ctx.fillStyle = text; ctx.font = `760 46px ${DISPLAY}`; ctx.textAlign = "center";
    ctx.fillText(d.title.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase(), ART.w / 2, ART.h / 2 + 16);
    ctx.textAlign = "left";
  }
  ctx.restore();
  rr(ctx, ART.x, ART.y, ART.w, ART.h, 10); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();

  if (d.award) {
    ctx.font = `700 19px ${DISPLAY}`; const tw = ctx.measureText(d.award).width;
    rr(ctx, ART.x + 12, ART.y + ART.h - 46, tw + 22, 34, 6); ctx.fillStyle = "#F2B53A"; ctx.fill();
    ctx.fillStyle = "#2B1C00"; ctx.fillText(d.award, ART.x + 23, ART.y + ART.h - 22);
  }

  if (d.wip) tape(ctx, ART.x + ART.w - 12, ART.y + 12);

  const y = ART.y + ART.h + 40;
  ctx.fillStyle = muted; ctx.font = `500 15px ${MONO}`;
  ctx.fillText(`${d.category.toUpperCase()}  ·  ${(d.kind ?? "").toUpperCase()}`, ix + 22, y);
  ctx.fillStyle = line; ctx.fillRect(ix + 22, y + 16, iw - 44, 2);
  ctx.fillStyle = text; ctx.font = `400 20px ${DISPLAY}`;
  wrap(ctx, d.summary, ix + 22, y + 50, iw - 44, 28, 4);

  const fy = iy + ih - 28;
  ctx.fillStyle = line; ctx.fillRect(ix + 22, fy - 34, iw - 44, 2);
  ctx.fillStyle = muted; ctx.font = `500 17px ${DISPLAY}`; ctx.fillText(fit(ctx, d.role ?? "", iw - 210), ix + 22, fy);
  ctx.font = `400 14px ${MONO}`; ctx.textAlign = "right"; ctx.fillText(d.timeframe ?? "", ix + iw - 22, fy); ctx.textAlign = "left";
}

/** Small striped "under construction" tape, anchored at its top-right corner. */
function tape(ctx: CanvasRenderingContext2D, right: number, top: number) {
  const label = "UNDER CONSTRUCTION", band = 22;
  ctx.font = `600 13px ${MONO}`;
  const tw = ctx.measureText(label).width, h = 28, w = tw + band * 2 + 20, x = right - w;
  ctx.save(); rr(ctx, x, top, w, h, 5); ctx.clip();
  ctx.fillStyle = "#F2C14E"; ctx.fillRect(x, top, w, h);
  const stripes = (x0: number) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, top, band, h); ctx.clip();
    ctx.fillStyle = "#2B2210";
    for (let s = -h; s < band + h; s += 10) { ctx.beginPath(); ctx.moveTo(x0 + s, top + h); ctx.lineTo(x0 + s + 5, top + h); ctx.lineTo(x0 + s + 5 + h, top); ctx.lineTo(x0 + s + h, top); ctx.fill(); }
    ctx.restore();
  };
  stripes(x); stripes(x + w - band);
  ctx.fillStyle = "#2B2210"; ctx.textAlign = "center"; ctx.fillText(label, x + w / 2, top + 19); ctx.textAlign = "left";
  ctx.restore();
}

export function drawBack(ctx: CanvasRenderingContext2D, d: CardData) {
  const panel2 = tok("--panel-2"), text = tok("--text"), muted = tok("--muted"), line = tok("--line");
  frame(ctx, d.accent);
  const ix = 14, iy = 14, iw = CW - 28, ih = CH - 28;
  rr(ctx, ix, iy, iw, ih, 20); ctx.fillStyle = panel2; ctx.fill();
  ctx.fillStyle = muted; ctx.font = `500 15px ${MONO}`; ctx.fillText(d.title.toUpperCase(), ix + 26, iy + 48);
  pip(ctx, d.category, ix + iw - 38, iy + 42, 18);
  ctx.fillStyle = text; ctx.font = `760 34px ${DISPLAY}`; ctx.fillText("What I did", ix + 26, iy + 98);
  let y = iy + 150; ctx.font = `400 21px ${DISPLAY}`;
  for (const t of d.highlights.slice(0, 6)) {
    ctx.fillStyle = d.accent; ctx.fillRect(ix + 28, y - 13, 8, 8);
    ctx.fillStyle = text; y = wrap(ctx, t, ix + 50, y, iw - 78, 28, 2) + 12;
  }
  ctx.fillStyle = line; ctx.fillRect(ix + 26, iy + ih - 92, iw - 52, 2);
  ctx.fillStyle = muted; ctx.font = `400 14px ${MONO}`;
  ctx.fillText(fit(ctx, d.stack.join("  ·  "), iw - 52), ix + 26, iy + ih - 58);
  ctx.fillText("click to flip back", ix + 26, iy + ih - 28);
}

export function drawCover(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, CW, CH);
  rr(ctx, 0, 0, CW, CH, CR); ctx.fillStyle = "#1E1B24"; ctx.fill();
  ctx.save(); rr(ctx, 0, 0, CW, CH, CR); ctx.clip(); dots(ctx, CW, CH, 14, 1.5, "rgba(255,255,255,0.08)"); ctx.restore();
  rr(ctx, 18, 18, CW - 36, CH - 36, 20); ctx.strokeStyle = "#FFC266"; ctx.lineWidth = 3; ctx.stroke();
  rr(ctx, 34, 34, CW - 68, CH - 68, 12); ctx.strokeStyle = "rgba(255,194,102,0.3)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CW / 2, 150); ctx.lineTo(CW - 110, CH / 2); ctx.lineTo(CW / 2, CH - 150); ctx.lineTo(110, CH / 2); ctx.closePath();
  ctx.strokeStyle = "rgba(255,194,102,0.55)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#FFC266"; ctx.font = `800 108px ${DISPLAY}`; ctx.textAlign = "center"; ctx.fillText("MP", CW / 2, CH / 2 + 38);
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `400 15px ${MONO}`; ctx.fillText("MOUTAZ PHARAON", CW / 2, CH - 62); ctx.textAlign = "left";
}

export const fontsReady: Promise<unknown> = document.fonts
  ? Promise.all([`760 34px ${DISPLAY}`, `400 20px ${DISPLAY}`, `500 15px ${MONO}`, `400 14px ${MONO}`].map((f) => document.fonts.load(f))).catch(() => {})
  : Promise.resolve();
