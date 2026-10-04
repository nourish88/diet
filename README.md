# Diet

Next.js ve Prisma tabanlı diyetisyen/danışan uygulaması.

## KVKK yönetimi

Veri sorumlusunun yönetim ekranı: `/management/kvkk`.
Danışanın aydınlatma, açık rıza ve hak başvuru ekranı: `/client/kvkk-onay`.

Kurulum, migration, şifreleme anahtarı, metin yayımlama, raporlar ve kuruluşun
tamamlaması gereken işlemler için [KVKK uygulama ve işletim dokümanını](docs/KVKK-UYGULAMA-VE-ISLETIM.md) okuyun.

Yeni akış varsayılan olarak kapalıdır; mevcut web/mobil onay ve veri girişleri
çalışmaya devam eder. Migration, onaylı metin ve mobil istemci hazırlığı
tamamlandıktan sonra sunucuda `KVKK_PRIVACY_V2_ENABLED=true` ile etkinleştirilir.
Portal başvuruları ayrıca sunucuda `KVKK_REQUEST_ENCRYPTION_KEY` gerektirir.

Doğrulama: `npm test`, `npx prisma validate`, `npx tsc --noEmit` ve `npm run build`.
