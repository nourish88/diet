# Uygulama kurulumu ve bildirim kontrolü

## Uygulanan düzeltmeler

- Giriş ekranında ve danışan portalında cihazınıza uygun yükleme yönergeleri gösterilir. Destekleyen tarayıcılarda `beforeinstallprompt` yakalanır ve yükleme düğmesi açılır. Olay, oturum kontrolü tamamlanmadan gelse bile saklanır.
- iPhone ve iPad masaüstü kullanıcı aracısı da dahil olmak üzere tanınır. Ana ekrana ekleme ve simgeden açma adımları gösterilir. Instagram/Facebook gibi uygulama içi tarayıcılarda sistem tarayıcısına geçiş anlatılır.
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
| iPhone/iPad Safari | Paylaş → Ana Ekrana Ekle yönergesi; ana ekran simgesinden açıldıktan sonra bildirim düğmesi |
| Instagram/Facebook bağlantısı | Sistem tarayıcısına geçiş açıklaması |
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
