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

## Bildirim tablosunda hedef cihaz ve çözüm adımları

Bildirim Geçmişi ve yönetim panelindeki Bildirim Logları aynı tabloyu kullanır. Her satır tek bir aboneliğin gönderimidir. Abonelik numarası fiziksel telefon kimliği değildir; aynı telefonun tarayıcısı ve ana ekran uygulaması farklı abonelikler oluşturabilir.

- **Hedef cihaz:** Abonelik numarası, tarayıcının bildirdiği işletim sistemi/sürümü, tarayıcı/sürümü, paylaşılmışsa model, ana ekran/sekme açılışı, kayıt anındaki bildirim izni ve son cihaz kayıt zamanı.
- **Neden / bulgu:** HTTP 404/410 için geçersiz abonelik; 401/403 için gönderim yetkilendirmesinin reddi; 413 için içerik boyutu; 429 ve 5xx için servis hatası. Başarılı gönderimde teslim onayı yoksa kesin neden bilinmiyor olarak gösterilir. Pil kısıtlaması veya kapalı izin ölçülmüş gibi sunulmaz.
- **Bu cihazda yapılacaklar:** Android, iPhone/iPad veya diğer işletim sistemleri için açılır kontrol listesi. Sunucu hatalarında teknik ekibe yönelik adımlar gösterilir.

Cihaz bilgisi `/api/push/subscribe` üzerinden oturum sahibi abonelik kaydına yazılır. Her öğün veya öğün test bildirimi oluşturulurken hedef abonelik numarası ve cihaz bilgisinin kopyası loga kaydedilir. Abonelik sonradan silinse veya yenilense de eski gönderimin cihaz bilgisi değişmez. Eski kayıtlara kullanıcının başka aboneliğinden bilgi eklenmez; bunlar “cihaz özellikleri kaydedilmemiş” gösterir. Son kayıt zamanı bir çevrimiçi durum ölçümü değildir; bildirim izni ve cihaz ayarları sonradan değişmiş olabilir.

Model bilgisi her tarayıcıda alınamaz. Android Client Hints destekleniyorsa yalnızca model ve işletim sistemi sürümü istenir; bu adım 800 ms ile sınırlıdır ve hata halinde bildirim kaydı devam eder. Chrome’un azaltılmış kullanıcı aracısındaki `Android 10; K` gerçek model/sürüm olarak gösterilmez. iPhone’da tam donanım modeli ve iPad’in masaüstü modunda gerçek sistem sürümü bilinmeyebilir. Kaynaklar: [Chrome kullanıcı aracısı azaltma açıklaması](https://privacysandbox.google.com/blog/user-agent-reduction-android-model-and-version), [WebKit ana ekran bildirimleri ve Odak ayarları](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

### Yayına alma ve doğrulama

Bu ekleme **veritabanı geçişi gerektirir**: `20261117000000_notification_device_diagnostics`. `PushSubscription.deviceInfo`, `NotificationLog.subscriptionId`, `NotificationLog.deviceInfo` ve `NotificationLog.pushStatusCode` nullable olarak eklenir; mevcut kayıtlar korunur. Geçiş yeni uygulama sürümü çalışmadan önce uygulanmalıdır. Projenin `vercel-build` komutu `prisma migrate deploy` adımını içerir. Buradaki geliştirme çalışması üretim veritabanına geçiş uygulamaz.

1. Yeni sürüm ve geçiş yayımlandıktan sonra sorunlu cihazda giriş yapın, Ayarlar → Bildirim kaydını yenile adımını tamamlayın.
2. Öğün test bildirimi gönderin; hedef abonelik numarası ve cihaz alanlarının doğru olduğunu kontrol edin.
3. Aynı danışanın iki farklı tarayıcı/cihazında test edin; satırların kendi cihaz bilgilerini taşıdığını doğrulayın.
4. Uygulama kapalıyken bildirimin görünmesini ayrıca doğrulayın. Bu tablo iyileştirmesi teslim garantisi sağlamaz.
5. Eski kayıtların cihaz bilgisinin bilinmiyor kaldığını ve kontrol listelerinin açıldığını kontrol edin.

Ham kullanıcı aracısı, IP, endpoint ve abonelik anahtarları yeni cihaz tanılama alanlarında saklanmaz. Normalize edilmiş cihaz bilgisi abonelikle birlikte; gönderim kopyası ise mevcut bildirim loglarının temizleme süresi boyunca tutulur. Mevcut zamanlayıcı üç günden eski logları temizler. Veriler yalnızca mevcut yetkili bildirim ekranında gösterilir.

Bu eklemenin yerel doğrulaması: 30 test dosyasında 242 test başarılı; TypeScript kontrolü, Prisma şema doğrulaması ve üretim derlemesi başarılı. Otomatik öğün gönderimi, manuel test, çoklu abonelik ayrımı, kayıt API'sinin yetki/validasyon sınırları ve tablo kontrol listeleri test edildi. Browser bağlantısı ortam hatası nedeniyle açılamadı; gerçek cihaz teslimi ve canlı veritabanı geçişi bu çalışmada doğrulanmadı.

neon logs query --since 30mVneon logs query --since 30mneon logs query --since 30m## 21 Kasım 2026 hata incelemesi ve kalıcı hata kayıtları

Kullanıcının paylaştığı 100 satırlık Vercel örneğinde öğün görevi **21 Kasım 18:00:11 Türkiye saati** civarında `Task timed out after 10 seconds` ile kesiliyor. Aynı örnekte `/api/cron/meal-reminders` ve `/api/push/ack` için PostgreSQL `kind: Closed` bağlantı hataları var. Kullanıcı ayrıca 17:54 civarında `/api/auth/sync` üzerinde tekrarlanan aynı hatayı bildirdi. Bağlantının kapanması tek başına hangi isteğin başarısız olduğunu veya bildirimin cihazda gösterilmediğini kanıtlamaz; özellikle teslim onayı API'sindeki veritabanı hatası, alınmış bildirimin onayının kaydedilememesine de yol açabilir.

Salt okunur canlı incelemede 20 Kasım 00:00'dan kontrol anına kadar 1.044 gönderim kaydının tamamı gönderim servisi tarafından kabul edilmiş görünüyordu; 407 kayıt cihaz onayı taşıyor, 637 kayıt taşımıyordu. 50 alıcıdan 11'inde hiç onay yoktu; bu 11 hesabın aboneliklerinde 20 Kasım'dan beri güncelleme görünmüyordu. Bu sayılar anlık bir örnektir; sonraki gönderimler ve onaylarla değişir. Eski cihaz kaydı ihtimali vardır; kesin cihaz nedeni bu verilerden çıkarılamaz. Kontrol sırasında yeni cihaz tanılama sütunları üretim veritabanında henüz yoktu.

### Giriş ve bildirim akışı düzeltmeleri

- Mevcut veritabanı adresi Neon havuzlu PostgreSQL adresidir. Uygulama bağlantısına, açıkça tanımlanmamışsa `connect_timeout=15` ve `pool_timeout=15` eklenir. Vercel'de varsayılan `connection_limit=1` kullanılır; açıkça verilmiş değerler korunur. `DIRECT_URL` ve migration bağlantısı değiştirilmez. Soğuk başlangıç için kaynak: [Prisma Neon bağlantı zaman aşımı](https://www.prisma.io/docs/orm/v6/overview/databases/neon).
- Prisma istemcisi çalışma süreci boyunca paylaşılır. Tanınan geçici bağlantı hatalarında yalnızca okumalar bir kez yeniden denenir; yazmalar tekrarlanmaz. Veritabanı sorgusunun başarısız olması artık kimlik doğrulama katmanında geçersiz oturum gibi yutulmaz. API hata durumunu döndürür; istemci geçici 5xx hatasında oturumu kapatmaz.
- Vercel API işlevleri için 60 saniye sınırı tanımlanır; öğün görevi ayrıca `maxDuration = 60` bildirir. Bu değişiklik yayımlandığında önceki 10 saniyelik sınırın görevi kesmesi önlenir; 60 saniyede bitirme veya kesintisiz teslim garantisi değildir. Kaynak: [Vercel işlev süresi yapılandırması](https://vercel.com/docs/functions/configuring-functions/duration).
- Supabase oturum olayında beklenen ağ işlemi çalıştırılmaz; profil ayrı etkiyle yüklenir. Üç saniyelik profil zaman aşımı kaldırılmıştır. Giriş ve KVKK sorgu hatalarında oturum korunur, yeniden deneme sunulur. Kaynak: [Supabase oturum olayı kilitlenmesi](https://supabase.com/kb/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).
- “Bildirim kaydını yenile” mevcut sunucu kaydını tekrar yazmanın yanında tarayıcı aboneliğini de yeniler. Gerçek cihazda uygulama kapalıyken test hâlâ gereklidir.
- PDF adı önce kaydın gerçek danışanından çözülür. Ad yüklenmeden kaydetme/indirme engellenir; eksik adla “İsimsiz Danışan” raporu üretilmez. Her iki PDF yolunda arka plan logosunun yüklenmesi beklenir ve her sayfaya eklenir. Logo yüklenemiyorsa kullanıcıya hata gösterilir. Danışan yüklenirken otomatik taslak yazımı durur; eski taslak geri yüklenirken doğrulanmış güncel ad korunur.

### Uygulama Hataları tablosu

Yeni `ApplicationError` tablosu başarılı işlemleri tutmaz. Log Yönetimi → **Uygulama Hataları** sekmesi varsayılan olarak açılır; hata türü filtresi, yenileme ve 50 satırlık sayfalama sunar. Olay zamanı ile sisteme kayıt zamanı ayrı gösterilir; saatler Türkiye saatidir.

- Kaynaklar: ortak API istemcisindeki başarısız ağ/zaman aşımı/5xx/401 istekleri, giriş hataları, tarayıcı hata sınırları ve yakalanmayan hatalar, Prisma sorgu/motor hataları, Next.js sunucu hata izleyicisi, PDF oluşturma ve bildirim kaydı hataları, öğün görevi hataları.
- Her öğün görevi çalışmasında son üç günün başarısız/bekleyen bildirimleri ve en az 15 dakikadır onaylanmamış gönderimler ayrı tabloya aktarılır. Toplu bildirimlerde de başarısızlık, abonelik yokluğu ve eksik teslim onayı toplanır. `delivery_unconfirmed` kesin kayıp anlamına gelmez; o anda onayın alınmadığını kaydeder. Daha sonra gelen onay, geçmişteki tanılama olayını silmez.
- Tarayıcı kuyruğu en çok 50 olay ve yedi gün tutar. Aynı tür/yoldaki hata bir dakika içinde tekrar kaydedilmez. Uygulama açıkken her 30 saniyede, bağlantı geri geldiğinde ve görünür olduğunda gönderim denenir. Kalıcı kayıt yanıtı alınmadan kuyruk temizlenmez; olay kimliği tekrar gönderimi çoğaltmaz. Depolama engelliyse yalnızca o sayfanın belleği kullanılabilir.
- Sunucudaki veritabanı tanılaması yanıt sonrasında toplu yazılır; başarısız kayıtlar aynı süreçte en çok 100 olaylık bellekte tutulur ve sonraki başarılı sorguda yeniden denenir. **Veritabanı tamamen erişilemezken sunucu da kapanırsa aynı veritabanına kalıcı yazma garantisi yoktur.** Bu durumda Vercel hata logu geri dönüş kaynağıdır. Tarayıcı kuyruğu, kullanıcı uygulamayı tekrar açtığında erişim hatasını sonradan bildirebilir. JavaScript hiç yüklenememiş bir açılış tarayıcı izleyicisi tarafından yakalanamaz.
- Şifre, token, ham hata mesajı/stack, HTTP gövdesi, sorgu parametreleri, push endpoint/anahtarları ve sağlık verileri saklanmaz. Sabit hata kodu/açıklaması, normalize işlem yolu, HTTP durumu, varsa doğrulanmış hesap kimliği, normalize sistem/tarayıcı ve bildirim referansı tutulur. Giriş öncesindeki hesap eşleşmesi bilinmiyorsa boş kalır; kullanıcıdan gelen hesap kimliğine güvenilmez.
- Raporlama uç noktası giriş öncesi hataları kabul eder; aynı alan adı, sıkı şema, boyut/toplu kayıt sınırı ve hız sınırları uygular. Liste yalnızca diyetisyen hesabına açıktır; belirli hesaba bağlı olaylar kendi danışanları/yardımcılarıyla sınırlandırılır. Kimlik içermeyen genel sunucu/giriş öncesi olayları da listelenir. Hata kayıtları öğün görevinin temizliğinde 90 gün sonra silinir; kısa süreli `NotificationLog` temizliğinden bağımsızdır.

Bu değişiklik **`20261121000000_application_errors` migration'ını** gerektirir. Önceki `20261117000000_notification_device_diagnostics` migration'ı da yayına dahil edilmelidir. `vercel-build` ikisini uygulamadan yeni sürümü başlatmamalıdır. Yerel geliştirme sırasında canlı veritabanına migration uygulanmadı ve sürüm yayımlanmadı.

`vercel.json` içindeki `buildCommand: "npm run vercel-build"` deploy komutunu açıkça belirler. Sıra `prisma generate && prisma migrate deploy && next build --webpack` şeklindedir; migration başarısızsa sonraki adımlar çalışmaz. Migration dosyaları deploy edilen sürüme dahil olmalı ve Vercel ortamındaki `DATABASE_URL` / `DIRECT_URL` doğru veritabanına erişebilmelidir.

Yayın kabulü: sorunlu cihazda giriş ve yeniden deneme; geçici bağlantı hatasının bağlantı döndükten sonra tek olay olarak görünmesi; diyetisyen dışındaki hesapların hata listesini alamaması; yeni ve kayıtlı diyetten doğru ad/logolu PDF; kapalı uygulamaya test bildirimi ve teslim onayı; Vercel öğün işinin 10 saniyede kesilmemesi ayrı ayrı doğrulanmalıdır.

21 Kasım yerel doğrulaması: **46 dosyada 285 test başarılı**; Prisma şeması geçerli, TypeScript kontrolü ve üretim derlemesi başarılı. Üretilen iki örnek PDF görsel olarak incelendi; doğru ad ve arka plan logosu görüldü. Son üretim derlemesi yerelde çalıştırıldığında `/login` ve logo 200; hata listesine oturumsuz erişim 401; aynı alan adından geçersiz kayıt 400; başka alan adından kayıt 403 döndü. Bu HTTP kontrolü canlı veritabanına hata kaydı yazmadı. Tarayıcı otomasyonu ortam bağlantı hatasıyla açılamadığı için gerçek cihaz girişi ve bildirim teslimi doğrulanmadı.
