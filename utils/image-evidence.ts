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
  let noiseAcc = 0;
  let satAcc = 0;
  let prev = -1;
  const hueBins = new Array(12).fill(0);

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const bright = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += bright;
    sumSq += bright * bright;
    count += 1;

    if (prev >= 0) {
      const d = Math.abs(bright - prev);
      edge += d;
      // High-frequency residual vs neighbor — camera noise tends to be higher
      noiseAcc += d;
    }
    prev = bright;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    satAcc += sat;

    // Rough hue bin for palette entropy
    let hue = 0;
    const delta = max - min;
    if (delta > 0.02) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue = ((hue / 6) + 1) % 1;
      hueBins[Math.min(11, Math.floor(hue * 12))] += 1;
    }

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
  const noiseScore = Math.min(1, (noiseAcc / n) * 8);
  const avgSat = satAcc / n;

  // Shannon-ish entropy of hue bins (0–1)
  let entropy = 0;
  for (const bin of hueBins) {
    if (!bin) continue;
    const p = bin / n;
    entropy -= p * Math.log2(p);
  }
  const paletteEntropy = Math.min(1, entropy / Math.log2(12));

  // AI gens often look sharp (edges) but low sensor noise / overly smooth
  const smoothScore = Math.min(
    1,
    Math.max(0, 1 - noiseScore * 1.35 + Math.min(0.25, edge / n) * 0.4)
  );

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
    noiseScore: Number(noiseScore.toFixed(3)),
    smoothScore: Number(smoothScore.toFixed(3)),
    saturationMean: Number(avgSat.toFixed(3)),
    paletteEntropy: Number(paletteEntropy.toFixed(3)),
    fileName,
  };
}
