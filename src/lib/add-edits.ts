// Client pipeline for tap-to-add edits. The work canvas holds the current
// composite; crops and masks are built here, the server only proxies the
// model call, and the result is pasted back through the soft mask so every
// pixel outside the edited region stays exactly the visitor's own photo.

export const CROP = 768;

export type AddItemKey = "plant" | "art" | "vase" | "cushion";

export const ADD_ITEMS: Record<AddItemKey, { label: string; hint: string; search: string; mask: { rx: number; ry: number }; anchor: "floor" | "center" }> = {
  plant: { label: "Potted plant", hint: "tap a floor spot", search: "potted monstera plant", mask: { rx: 130, ry: 210 }, anchor: "floor" },
  art: { label: "Wall art", hint: "tap a bare wall spot", search: "framed botanical wall art", mask: { rx: 150, ry: 170 }, anchor: "center" },
  vase: { label: "Table vase", hint: "tap a table or shelf", search: "ceramic flower vase", mask: { rx: 120, ry: 150 }, anchor: "floor" },
  cushion: { label: "Cushion", hint: "tap the sofa seat", search: "decorative throw cushion", mask: { rx: 180, ry: 120 }, anchor: "center" },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Normalize: uniform scale so both dimensions are at least CROP, capped at
// 1600px on the long edge, so a 768 crop always fits and uploads stay small.
export async function makeWorkCanvas(src: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const up = Math.max(1, CROP / Math.min(img.naturalWidth * scale, img.naturalHeight * scale));
  const s = scale * up;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(CROP, Math.round(img.naturalWidth * s));
  canvas.height = Math.max(CROP, Math.round(img.naturalHeight * s));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Where the 768 crop sits so the item lands on the tap. Floor-anchored items
// (plant, vase) stand ON the tapped point; centered items (art, cushion)
// center on it.
export function cropBox(item: AddItemKey, tapX: number, tapY: number, w: number, h: number): { bx: number; by: number } {
  const half = CROP / 2;
  const { mask, anchor } = ADD_ITEMS[item];
  // Floor anchor: the mask's bottom edge (crop y = half + ry) lands on the tap,
  // so the object stands on the tapped point. Center anchor: mask center = tap.
  const bx = tapX - half;
  const by = anchor === "floor" ? tapY - (half + mask.ry) : tapY - half;
  return {
    bx: Math.max(0, Math.min(w - CROP, Math.round(bx))),
    by: Math.max(0, Math.min(h - CROP, Math.round(by))),
  };
}

export function buildMask(item: AddItemKey): HTMLCanvasElement {
  const { mask } = ADD_ITEMS[item];
  const canvas = document.createElement("canvas");
  canvas.width = CROP;
  canvas.height = CROP;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CROP, CROP);
  ctx.filter = "blur(8px)";
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(CROP / 2, CROP / 2, mask.rx, mask.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function cropCanvas(work: HTMLCanvasElement, bx: number, by: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CROP;
  canvas.height = CROP;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(work, bx, by, CROP, CROP, 0, 0, CROP, CROP);
  return canvas;
}

// Fraction of masked pixels the model actually changed; low means a no-op.
export function changedFraction(before: HTMLCanvasElement, after: HTMLCanvasElement, mask: HTMLCanvasElement): number {
  const sample = (c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    return ctx.getImageData(0, 0, CROP, CROP).data;
  };
  const b = sample(before);
  const a = sample(after);
  const m = sample(mask);
  let inside = 0;
  let changed = 0;
  for (let i = 0; i < m.length; i += 4 * 6) {
    if (m[i] > 10) {
      inside += 1;
      const dr = Math.abs(a[i] - b[i]);
      const dg = Math.abs(a[i + 1] - b[i + 1]);
      const db = Math.abs(a[i + 2] - b[i + 2]);
      if (dr + dg + db > 24) changed += 1;
    }
  }
  return inside === 0 ? 0 : changed / inside;
}

// Paste the edited crop back through the soft mask.
export function composite(work: HTMLCanvasElement, after: HTMLCanvasElement, mask: HTMLCanvasElement, bx: number, by: number): void {
  const temp = document.createElement("canvas");
  temp.width = CROP;
  temp.height = CROP;
  const tctx = temp.getContext("2d");
  if (!tctx) throw new Error("no canvas");
  tctx.drawImage(after, 0, 0);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(mask, 0, 0);
  const ctx = work.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(temp, bx, by);
}

export async function canvasToObjectURL(canvas: HTMLCanvasElement): Promise<string> {
  // PNG export: lossless, so the untouched area stays byte-identical to the original photo.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("no blob");
  return URL.createObjectURL(blob);
}

export async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = CROP;
  canvas.height = CROP;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, CROP, CROP);
  return canvas;
}
