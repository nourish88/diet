export type OfficeTaskGroup = "setup" | "weekly" | "routine";

export interface OfficeSocialMediaTask {
  id: string;
  group: OfficeTaskGroup;
  day?: string;
  timeLabel: string;
  title: string;
  goal: string;
  steps: string[];
  reminderTitle: string;
  reminderBody: string;
}

export const officeSocialMediaTasks: OfficeSocialMediaTask[] = [
  {
    id: "instagram-profile",
    group: "setup",
    timeLabel: "Bu hafta",
    title: "Instagram profilini randevuya hazırla",
    goal: "Profili ilk bakışta güven veren ve siteye yönlendiren hale getirmek.",
    steps: [
      "İsim alanını Ezgi Evgin Aktaş | Diyetisyen olarak kontrol et.",
      "Bio içinde Ankara, online hizmet, kişiye özel program ve WhatsApp CTA yer alsın.",
      "Profil linkini ezgievginaktas.com olarak güncel tut.",
      "Profil fotoğrafı yüzün net göründüğü profesyonel bir kare olsun.",
    ],
    reminderTitle: "Instagram profil kontrolü",
    reminderBody:
      "Bio, profil fotoğrafı ve web sitesi linkini kontrol et. Profil bugün randevuya hazır olsun.",
  },
  {
    id: "highlights",
    group: "setup",
    timeLabel: "Bu hafta",
    title: "Öne çıkanlar setini tamamla",
    goal: "Yeni gelen takipçinin hizmetleri, güven kanıtlarını ve iletişimi hızlı görmesi.",
    steps: [
      "Hakkımda, Programlar, Başarı Hikayeleri ve Tarifler kapaklarını hazırla.",
      "İpuçları, SSS ve İletişim başlıklarını ekle.",
      "Her highlight sonuna WhatsApp veya web sitesi yönlendirmesi koy.",
    ],
    reminderTitle: "Highlight tamamlama zamanı",
    reminderBody:
      "Hakkımda, Programlar, Başarı Hikayeleri, Tarifler, İpuçları, SSS ve İletişim öne çıkanlarını kontrol et.",
  },
  {
    id: "platform-setup",
    group: "setup",
    timeLabel: "Bu ay",
    title: "Eksik platformları aç",
    goal: "Instagram dışındaki kanalları ayırıp uzun vadeli görünürlüğü artırmak.",
    steps: [
      "Facebook sayfası, YouTube kanalı ve TikTok hesabını aynı marka diliyle aç.",
      "Pinterest ve LinkedIn profillerinde web sitesi linkini ekle.",
      "Tüm profillerde aynı fotoğraf, kısa bio ve iletişim yönlendirmesi kullan.",
    ],
    reminderTitle: "Platform kurulum hatırlatıcısı",
    reminderBody:
      "Facebook, YouTube, TikTok, Pinterest ve LinkedIn hesaplarını marka bilgileriyle tamamla.",
  },
  {
    id: "monday-pcos",
    group: "weekly",
    day: "Pazartesi",
    timeLabel: "10:00 / 13:00",
    title: "PCOS veya insülin direnci odağı",
    goal: "Haftaya eğitici bir konu ve web sitesi yönlendirmesiyle başlamak.",
    steps: [
      "10:00'da PCOS'ta kilo vermeyi zorlaştıran 3 hata carousel'i paylaş.",
      "Son slayta detaylı beslenme planı için web sitesi CTA'sı ekle.",
      "13:00'te ofis masasından story at ve ilgili blog yazısına yönlendir.",
    ],
    reminderTitle: "Pazartesi içerik planı",
    reminderBody:
      "PCOS/insülin direnci carousel'i ve blog yönlendirmeli story için içerikleri hazırla.",
  },
  {
    id: "tuesday-tools",
    group: "weekly",
    day: "Salı",
    timeLabel: "19:30 / 20:00",
    title: "Etkileşim ve hesaplayıcı yönlendirmesi",
    goal: "Kısa video ile etkileşim almak ve web sitesindeki aracı kullandırmak.",
    steps: [
      "19:30'da kalori takıntısı temalı kısa Reels paylaş.",
      "20:00'de VKİ hesaplayıcıya yönlendiren story yayınla.",
      "Story'ye anket veya sonuç paylaşım etiketi ekle.",
    ],
    reminderTitle: "Salı Reels ve VKİ story",
    reminderBody:
      "Kalori takıntısı Reels'i ve VKİ hesaplayıcı story'sini yayınlamayı unutma.",
  },
  {
    id: "wednesday-recipe",
    group: "weekly",
    day: "Çarşamba",
    timeLabel: "12:30 / 13:00",
    title: "Pratik tarif günü",
    goal: "Tarif içeriğiyle kaydetme oranını ve site trafiğini artırmak.",
    steps: [
      "12:30'da pratik, düşük kalorili öğle yemeği tarifi paylaş.",
      "Videoda malzemeleri ve yapılışı hızlı göster.",
      "13:00 story'sinde tarifin detaylarını web sitesine bağla.",
    ],
    reminderTitle: "Çarşamba tarif paylaşımı",
    reminderBody:
      "Tarif Reels/post ve web sitesi linkli story bugün yayına çıkmalı.",
  },
  {
    id: "thursday-proof",
    group: "weekly",
    day: "Perşembe",
    timeLabel: "10:00 / 14:00",
    title: "Başarı hikayesi ve hizmet tanıtımı",
    goal: "Sosyal kanıtı randevu kararına bağlamak.",
    steps: [
      "10:00'da izinli başarı hikayesi veya mesaj ekran görüntüsü paylaş.",
      "Metinde aç kalmadan sürdürülebilir sonuç vurgusunu kullan.",
      "14:00 story'sinde online diyet veya Ankara diyetisyen sayfasına yönlendir.",
    ],
    reminderTitle: "Perşembe başarı hikayesi",
    reminderBody:
      "Başarı hikayesini paylaş ve story'de hizmet sayfasına yönlendirme ekle.",
  },
  {
    id: "friday-local",
    group: "weekly",
    day: "Cuma",
    timeLabel: "18:00 / 19:00",
    title: "Yerel görünürlük günü",
    goal: "Eryaman ve Etimesgut aramalarını sosyal sinyalle desteklemek.",
    steps: [
      "18:00'de Etimesgut/Eryaman çevresinden rahat bir fotoğraf veya Reels paylaş.",
      "19:00 story'sinde klinik ulaşım ve randevu bilgilerine yönlendir.",
      "Yerel etiketleri ve konum bilgisini ekle.",
    ],
    reminderTitle: "Cuma yerel içerik",
    reminderBody:
      "Eryaman/Etimesgut odaklı içerik ve klinik bilgisi story'sini yayınla.",
  },
  {
    id: "sunday-qa",
    group: "weekly",
    day: "Pazar",
    timeLabel: "19:00 / 20:00",
    title: "Soru-cevap ve yeni hafta hazırlığı",
    goal: "Takipçi sorularını içerik fikrine ve blog trafiğine dönüştürmek.",
    steps: [
      "19:00'da beslenme soruları için soru kutusu aç.",
      "20:00'de cevapları yayınla.",
      "Detaylı cevap gerektiren soruları ilgili blog yazısına bağla.",
    ],
    reminderTitle: "Pazar soru-cevap zamanı",
    reminderBody:
      "Soru kutusunu aç, cevapları hazırla ve uygun cevapları blog linkiyle destekle.",
  },
  {
    id: "daily-office-routine",
    group: "routine",
    timeLabel: "Her iş günü",
    title: "Ofis içeriği üretim rutini",
    goal: "İçerik üretimini son dakikaya bırakmadan sürdürülebilir hale getirmek.",
    steps: [
      "Danışan gizliliğini koruyarak ofis, kahve, hazırlık veya çalışma masası kareleri çek.",
      "Her paylaşımda tek bir hedef seç: yorum, kaydetme, WhatsApp veya web sitesi.",
      "Paylaşım sonrası ilk 30 dakikada yorum ve DM'lere cevap ver.",
      "Haftanın sonunda en çok kaydedilen içeriği yeni içerik fikrine çevir.",
    ],
    reminderTitle: "Günlük ofis içerik rutini",
    reminderBody:
      "Bugünün ofis karesini, CTA'sını ve paylaşım sonrası cevap kontrolünü tamamla.",
  },
];

export function getOfficeSocialMediaTask(taskId: string) {
  return officeSocialMediaTasks.find((task) => task.id === taskId) ?? null;
}
