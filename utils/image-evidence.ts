import type { VisualSignals } from "@/lib/ai/image-scan";

/** Compress an image file to a JPEG data URL suitable for report storage. */
export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  quality = 0.72
): Promise<{ dataUrl: string; signals: VisualSignals }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas unavailable for image compression");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const signals = sampleVisualSignals(ctx, width, height, file.name);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, signals };
}

function sampleVisualSignals(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fileName: string
): VisualSignals {
  const data = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(1, Math.floor((width * height) / 2500));
  let count = 0;
  let sum = 0;
  let sumSq = 0;
  let asphalt = 0;
  let vegetation = 0;
  let water = 0;
  let skin = 0;
  let sky = 0;
  let edge = 0;
  let prev = -1;

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const bright = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += bright;
    sumSq += bright * bright;
    count += 1;

    if (prev >= 0) edge += Math.abs(bright - prev);
    prev = bright;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    // Gray asphalt / concrete
    if (sat < 0.18 && bright > 0.18 && bright < 0.72) asphalt += 1;
    // Vegetation
    if (g > r * 1.1 && g > b * 1.05 && g > 0.2) vegetation += 1;
    // Water / wet dark blue-green
    if (b > r && b >= g * 0.95 && bright < 0.55) water += 1;
    // Skin-ish tones
    if (r > 0.35 && g > 0.2 && b > 0.12 && r > g && g > b && sat < 0.45) skin += 1;
    // Sky
    if (b > r && b > g && bright > 0.45 && sat > 0.12) sky += 1;
  }

  const n = Math.max(1, count);
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);

  return {
    width,
    height,
    brightness: Number(mean.toFixed(3)),
    variance: Number(variance.toFixed(4)),
    asphaltScore: Number((asphalt / n).toFixed(3)),
    vegetationScore: Number((vegetation / n).toFixed(3)),
    waterScore: Number((water / n).toFixed(3)),
    skinScore: Number((skin / n).toFixed(3)),
    skyScore: Number((sky / n).toFixed(3)),
    edgeEnergy: Number(Math.min(1, edge / n).toFixed(3)),
    fileName,
  };
}
