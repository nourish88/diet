export interface DietPdfAssets {
  logo: string;
  symbol: string;
  nazar: string;
}

let assetsPromise: Promise<DietPdfAssets> | undefined;

async function loadImage(path: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(path, { signal: controller.signal });
    if (!response.ok) throw new Error(`Görsel yüklenemedi (HTTP ${response.status}).`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Görsel okunamadı."));
      reader.onerror = () => reject(new Error("Görsel okunamadı."));
      reader.readAsDataURL(blob);
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Both export paths await the same assets; failed loads can be retried. */
export function loadDietPdfAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      loadImage("/ezgi_evgin.png"),
      loadImage("/image.png"),
      loadImage("/nazar-boncugu.png").catch(() => ""),
    ]).then(([logo, symbol, nazar]) => ({ logo, symbol, nazar })).catch(() => {
      assetsPromise = undefined;
      throw new Error("Rapor logosu yüklenemedi. Lütfen PDF indirmeyi yeniden deneyin.");
    });
  }
  return assetsPromise;
}
