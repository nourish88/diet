"use client";

export interface BrosurContent {
  logoDataUrl: string;
  qrCodeDataUrl: string;
  registerUrl: string;
}

/**
 * QR kod oluşturur ve base64 data URL olarak döndürür
 * Browser'da çalışması için API endpoint kullanır
 */
export async function generateQRCode(url: string, size: number = 200): Promise<string> {
  try {
    // Server-side API endpoint kullanarak QR kod oluştur
    const response = await fetch(`/api/brosur/qrcode?url=${encodeURIComponent(url)}&size=${size}`);
    if (!response.ok) {
      throw new Error(`QR kod API hatası: ${response.statusText}`);
    }
    const data = await response.json();
    return data.dataUrl;
  } catch (error) {
    console.error("QR kod oluşturma hatası:", error);
    throw new Error("QR kod oluşturulamadı");
  }
}

/**
 * Logo dosyasını base64 data URL'e çevirir
 */
export async function loadLogoAsDataUrl(logoPath: string = "/ezgi_evgin.png"): Promise<string> {
  try {
    const response = await fetch(logoPath);
    if (!response.ok) {
      throw new Error(`Logo yüklenemedi: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Logo yükleme hatası:", error);
    throw new Error("Logo yüklenemedi");
  }
}

/**
 * Broşür için gerekli tüm içeriği hazırlar
 */
export async function prepareBrosurContent(): Promise<BrosurContent> {
  const registerUrl = "https://diet-six.vercel.app/register-client";
  
  const [logoDataUrl, qrCodeDataUrl] = await Promise.all([
    loadLogoAsDataUrl("/ezgi_evgin.png"),
    generateQRCode(registerUrl, 150),
  ]);

  return {
    logoDataUrl,
    qrCodeDataUrl,
    registerUrl,
  };
}

