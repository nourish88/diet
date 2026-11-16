# Uygulama kurulumu ve bildirim kontrolü

## Uygulanan düzeltmeler

- Giriş ekranında ve danışan portalında cihazınıza uygun yükleme yönergeleri gösterilir. Destekleyen tarayıcılarda `beforeinstallprompt` yakalanır ve yükleme düğmesi açılır. Olay, oturum kontrolü tamamlanmadan gelse bile saklanır.
- Kurulum isteğe bağlıdır. “Tarayıcıdan devam et” kartı mevcut sekme oturumu boyunca kapatır; danışan Ayarlar → “Kurulum yardımını aç” ile yeniden açabilir. Tercih yalnızca `sessionStorage` içindeki `diet-install-help-dismissed` anahtarında tutulur. Depolama engelliyse sayfa belleği kullanılır; yenilemede tercih kaybolabilir. Oturum ve kullanıcı verileri temizlenmez.
- Kurulum penceresinin kabul edilmesi tamamlanmış kurulum sayılmaz. Kart yalnızca `appinstalled` olayı veya bağımsız uygulama modu doğrulandığında kurulu kabul eder. Tek kullanımlık yükleme olayı tekrar kullanılmaz; iptal/hata sonrasında tarayıcıdan devam veya menüden yükleme açıklaması gösterilir. Tarayıcı yeni bir olay sağlarsa düğme yeniden kullanılabilir.
- Ekran modu takibi modern `addEventListener`, eski `addListener` ve dinleyici bulunmayan tarayıcıları destekler. `matchMedia`, service worker veya push desteğinin bulunmaması kurulum kartını çökertmez. Service worker kaydı senkron hata verse bile hata yakalanır ve sayfa kullanımı sürer.
- iPhone ve iPad masaüstü kullanıcı aracısı da dahil olmak üzere tanınır. Ana ekrana ekleme ve simgeden açma adımları gösterilir. Instagram/Facebook gibi uygulama içi tarayıcılarda sistem tarayıcısına geçiş anlatılır.
- Uygulama içi tarayıcı açıklaması bir kullanıcı aracısı tahminidir; her uygulama tespit edilemeyebilir. “Bağlantıyı kopyala” yalnızca aynı alan adındaki `/login` adresini kopyalar; özel sayfa yolu, sorgu parametresi veya oturum belirteci kopyalanmaz. Pano desteği/izni yoksa seçilip elle kopyalanabilir bağlantı gösterilir.
- Android yönergeleri Chrome ve Samsung Internet menüsündeki yükleme/ana ekrana ekleme seçeneklerini anlatır. Sonuç tarayıcıya göre uygulama veya kısayol olabilir. `beforeinstallprompt` olayının gelmemesi cihazın kesinlikle desteklenmediği anlamına gelmez. Kurulum ve bildirim uygunluğu birbirinden bağımsızdır.
- Bildirim izni yalnızca “Bildirimleri aç” düğmesine dokunulduğunda istenir. Önceki kapatma/ret denemeleri kalıcı bir localStorage işaretiyle yeniden denemeyi engellemez.
- Bildirim izni verilmiş cihazlar oturum açıldığında, bağlantı geri geldiğinde ve uygulama yeniden görünür olduğunda sunucuyla eşitlenir. Görünür uygulamada dakikalık kontrol geçici hataları yeniden dener.
- Abonelik, servis çalışanı etkinleştikten sonra oluşturulur; etkinleşme beklemesi süreyle sınırlıdır. Çıkış akışı hiç kurulamamış bir servis çalışanını sonsuza kadar beklemez.
- İzin, cihaz aboneliği ve sunucuya kayıt ayrı aşamalardır. Danışana “Bildirimler hazır” ancak cihaz sunucuya kaydedildikten sonra gösterilir. Ayarlar ekranından izin verilmiş cihazın kaydı da yenilenebilir.
- Tarayıcı güncel VAPID açık anahtarını `/api/push/config` üzerinden alır. Böylece eski derlemeye gömülen `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` yüzünden göndericiyle farklı anahtar kullanılmaz. Eski anahtarlı abonelik yenilenir.
- Eksik/geçersiz/uyuşmayan sunucu anahtarları başarılı gönderim sayılmaz. Hiçbir cihaza gönderilemeyen diyet bildiriminin `notifiedAt` alanı doldurulmaz; zamanlayıcı yeniden deneyebilir.
- Servis çalışanı özel HTML sayfalarını önbelleğe almaz; dört saniyelik zaman aşımıyla eski uygulamaya dönmez. Çevrimdışı durumda ayrı, genel bir bağlantı ekranı gösterir. Eski uygulama önbellekleri yeni servis çalışanı etkinleştiğinde temizlenir.
- Boş veya bozuk JSON push mesajı da görünür bir bildirim üretir. Teslim onayı bildirim gösterildikten sonra gönderilir; bildirim hedefi uygulamanın kendi alan adıyla sınırlandırılır.

## Yayın ortamında doğrulama

Yerelde anahtarların bulunması yayın ortamında doğru ayarlı olduklarını kanıtlamaz. Yeni anahtar üretmeden mevcut anahtar çiftini koruyun; anahtar değişimi eski cihaz aboneliklerinin yenilenmesini gerektirir.

1. HTTPS üzerinden `/manifest.json`, `/sw.js` ve manifestteki simgeler 200 dönmeli. Manifest `id` ve `scope` değerleri `/` olmalı.
2. `/sw.js` yanıtında `Cache-Control: no-cache, no-store, must-revalidate` olmalı. Yeni sürüm `diet-pwa-v8` olarak etkinleşmeli.
3. `/api/push/config` yanıtında `configured: true` ve açık anahtar bulunmalı. Bu endpoint özel anahtar veya cihaz bilgisi döndürmez.
4. Yayın ortamında `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_CONTACT_EMAIL` ve `CRON_SECRET` tanımlı olmalı. Açık ve özel anahtar aynı P-256 anahtar çiftine ait olmalı. `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` yeni istemci akışında kullanılmaz.
5. Öğün ve yeni diyet bildirimlerinin uygulama kapalıyken çalışması için Supabase zamanlayıcısı `/api/cron/meal-reminders` yolunu her 15 dakikada bir çağırmalı. `vercel.json` bu projede zamanlayıcı tanımlamaz. Kurulum: [MEAL_REMINDER_SETUP.md](MEAL_REMINDER_SETUP.md).
6. Su ve haftalık kontrol bildirimlerinin ayrı görevlerini [CHECK_IN_AND_WATER_SCHEDULING.md](CHECK_IN_AND_WATER_SCHEDULING.md) üzerinden kontrol edin.
7. Supabase `cron.job_run_details` içindeki başarılı SQL çalışması yalnızca HTTP isteğinin sıraya alındığını gösterebilir. `net._http_response` içindeki HTTP durumunu da inceleyin; 401, alan adı/sertifika veya 5xx hataları ayrıca çözülmeli. Sırları loglara veya ekran görüntülerine taşımayın.

## Gerçek cihaz kabul kontrolü

| Senaryo | Beklenen sonuç |
| --- | --- |
| Android Chrome, ilk ziyaret | Giriş ekranında yükleme açıklaması; tarayıcı uygun bulduğunda yükleme düğmesi |
| Samsung Internet | Menüden yükleme/ana ekrana ekleme; olay yokken de kurulum yardımı ve tarayıcıdan devam |
| Eski tarayıcı, `matchMedia` veya modern dinleyici yok | Kurulum kartı hata vermez; sayfa ve giriş kullanılabilir |
| Kurulum penceresi kabul edilmiş, kurulum tamamlanmamış | “Kuruldu” sonucu gösterilmez; tarayıcıdan devam açık kalır |
| Kurulum iptal edilmiş veya hata vermiş | Açıklama görünür; tarayıcıdan devam ve menü yönergeleri kullanılabilir |
| Tarayıcıdan devam, sayfa değişimi ve yenileme | Kart aynı sekmede kapalı kalır; Ayarlar’dan yeniden açılır |
| Depolama engelli | Kapatma/yeniden açma aynı sayfada çalışır; oturum verileri silinmez |
| iPhone/iPad Safari | Paylaş → Ana Ekrana Ekle yönergesi; ana ekran simgesinden açıldıktan sonra bildirim düğmesi |
| Instagram/Facebook bağlantısı | Sistem tarayıcısına geçiş ve güvenli giriş bağlantısını kopyalama; pano engelliyse elle kopyalama |
| Kurulum yapılmadan danışan girişi | Diyet görüntüleme, mesajlaşma, fotoğraf yükleme ve KVKK ekranları kullanılabilir |
| Bildirim izni henüz sorulmamış | Kendiliğinden izin penceresi açılmaz; düğmeye dokununca istenir |
| İzin penceresi kapatılmış | “Bildirimleri aç” ile yeniden denenebilir |
| İzin reddedilmiş | Telefon/tarayıcı ayarlarından izin verme açıklaması |
| İzin var, sunucuda cihaz kaydı yok | Açılışta yeniden kayıt; Ayarlar ekranında kayıt yenileme |
| Kayıt sırasında ağ hatası | “Hazır” gösterilmez; bağlantı geri geldiğinde veya düğmeyle yeniden denenir |
| Güncel anahtar farklı | Eski abonelik kaldırılıp yeni açık anahtarla kaydedilir |
| Kapalı uygulama | Diyetisyen panelindeki test bildirimi cihazda görünür; bildirime dokununca ilgili sayfa açılır |
| Yavaş ağ | Dört saniye sonunda eski HTML ekranına dönülmez |
| Çevrimdışı açılış | Bağlantı açıklaması ve tekrar deneme düğmesi |

iOS/iPadOS için Home Screen Web Push ve kullanıcı dokunuşu gereksinimleri: [WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Yükleme olayının tarayıcı desteği: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).

Gerçek cihazda izin verme, yükleme ve kapalı uygulamaya uçtan uca teslim testi ayrıca yapılmalıdır. Gönderim servisinin HTTP isteğini kabul etmesi, cihazın bildirimi gösterdiği anlamına gelmez. Odak modu ve işletim sistemi bildirim ayarları da görünürlüğü etkiler.

## Sorunlu cihazdan alınacak bilgiler

Bir kurulum sorunu için aşağıdaki kaydı doldurun; hesap şifresi, oturum belirteci veya danışanın sağlık verilerini eklemeyin:

- Telefon modeli, Android sürümü, tarayıcı adı ve tam sürümü.
- Bağlantının doğrudan tarayıcıda mı, WhatsApp/Instagram gibi bir uygulamadan mı açıldığı.
- Aşama: **yükleme seçeneği çıkmıyor / kurulum başlıyor ama tamamlanmıyor / simge oluşuyor ama açılmıyor**.
- Hata metni, bağlantı türü ve olayın zamanı; tarayıcıdan girişin çalışıp çalışmadığı.
- Aynı cihazda tarayıcı menüsünden “Uygulamayı yükle / Ana ekrana ekle” sonucu.

Seçenek çıkmıyorsa önce dış tarayıcı ve manifest erişimi; kurulum tamamlanmıyorsa cihazın verdiği kurulum hatası ve kullanılabilir depolama; simge açılmıyorsa ağ, başlangıç adresi ve oturum yönlendirmesi kontrol edilir. İlk çözüm olarak tüm site verilerini veya oturumu silmeyin.

Eski cihazların tamamına destek garanti edilmez. Android 8–9 için son Chrome sürümü 138 olduğundan yalnızca “Chrome’u güncelle” önerisi yeterli değildir. Bu değişiklik eski tarayıcı API’lerinde güvenli geri dönüş sağlar; uygulamanın tüm JavaScript/CSS gereksinimlerini çok eski tarayıcılara taşımaz. Destek kapsamı gerçek cihazda temel işlemler doğrulanarak belirlenir. Kaynak: [Google Chrome destek duyurusu](https://support.google.com/chrome/blog/352616098/sunsetting-chrome-support-for-android-8-0-oreo-and-android-9-0-pie?hl=en-GB).

## 16 Kasım 2026 doğrulama kaydı

- `.env` içindeki `NEXT_PUBLIC_SITE_URL` ile belirlenen `https://diet-six.vercel.app` üzerinde salt okunur HTTPS kontrolü yapıldı. `/manifest.json` ve `/sw.js` 200 döndü. Manifest `id`, `scope` ve `start_url` alanları `/`, `display` alanı `standalone` idi.
- Manifestin üç PNG simgesi 200 döndü; gerçek boyutları sırasıyla 192×192, 512×512 ve 512×512 doğrulandı. Service worker sürümü `diet-pwa-v8`, `Service-Worker-Allowed: /` ve `Cache-Control: no-cache, no-store, must-revalidate` doğrulandı. Bu sonuçlar cihazda kurulumun tamamlandığını veya bu çalışma dalındaki değişikliklerin yayımlandığını göstermez.
- `npm test`: 24 dosyada **209 test başarılı**. Eski/yeni/eksik ekran modu API’leri, kurulum kabul/iptal/hata akışları, sekmelik kapatma/yeniden açma, pano desteği ve service worker hataları kapsandı. Arayüz testleri jsdom ve React Testing Library ile çalışır; bu paketler yalnızca geliştirme bağımlılığıdır.
- `npx tsc --noEmit --incremental false`: başarılı.
- `npm run build`: üretim derlemesi başarılı.
- Gerçek Android Chrome, Samsung Internet, iPhone Safari ve sorunlu eski cihaz testleri **henüz yapılmadı**. Tarayıcı otomasyonu ortam bağlantı hatası nedeniyle açılamadı. jsdom testleri gerçek tarayıcı kurulumu veya danışan hesabıyla uçtan uca giriş/diyet/mesaj/fotoğraf/KVKK doğrulaması yerine geçmez.
- Yayın öncesi yukarıdaki gerçek cihaz tablosunu en az bir sorunlu cihaz dahil tamamlayın; kurulum yapılamıyorsa tarayıcıdan temel işlemlerin çalıştığını ayrıca kaydedin. Bu çalışma yeni API, veritabanı geçişi, APK veya ücretli mobil hizmet gerektirmez.
