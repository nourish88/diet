declare global {
  interface Window {
    pdfMake: any;
  }
}

export interface Diet {
  id: number | null;
  AdSoyad: string;
  Tarih: string | null; // ISO string format or null
  Hedef: string;
  Sonuc: string;
  dietitianNote: string;
  isBirthdayCelebration: boolean;
  isImportantDateCelebrated: boolean;
  importantDateId: number | null;
  importantDateName: string | null;
  Oguns: Array<Ogun>;
  Su: string;
  Fizik: string;
}
