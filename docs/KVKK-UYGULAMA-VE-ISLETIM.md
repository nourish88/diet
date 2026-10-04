# KVKK portalı: uygulama, raporlama ve işletim

Değerlendirme tarihi: **4 Ekim 2026**. Bu çalışma, portal aydınlatma/açık rıza kaydı ve ilgili kişi başvuruları için teknik altyapı sağlar. Kuruluşun bütün faaliyetlerine ilişkin hukuki uygunluk veya elektronik imza sertifikası değildir. Resmî veri sorumlusu bilgileri ve onaylı saklama/aktarım politikası paylaşılmadığından gerçek bilgilerle otomatik metin yayımlanmamıştır.

## Kullanım

Yeni akış `KVKK_PRIVACY_V2_ENABLED=true` sunucu ayarıyla açıkça etkinleştirilir; ayar yoksa veya başka değerdeyse mevcut akış korunur. Aşağıdaki ayrı aydınlatma, rıza ve başvuru özellikleri etkinleştirmeden sonra geçerlidir. Öncesinde eski web/mobil onay sözleşmesi, eski rapor yetkileri ve sağlık verisi giriş davranışı korunur. Yeni tablolar mevcut danışan akışında sorgulanmaz; yönetim ekranı migration eksikliğini hazırlık durumu olarak gösterir.

- Veri sorumlusu, kendi hesabıyla `/management/kvkk` ekranına girer. Asistan hesapları ve API anahtarları yeni KVKK yönetimi/raporlarına erişemez. Hazırlık döneminde eski onay raporlarının mevcut yetkileri korunur.
- Resmî ad/unvan, tebligat adresi, başvuru e-posta adresi, veri kategorileri, amaçlar, hukuki sebepler, alıcılar, yurt dışı güvenceleri, saklama süreleri ve inceleme referansı doldurulur. Danışana sunulacak metinlerin **tam önizlemesi** kontrol edilir. Yayımlanan sürüm değiştirilemez; düzeltme yeni sürümle yapılır.
- Sağlık verisi için `explicit_consent` seçilirse KVKK m.6/3(a) kapsamında ayrı rıza tercihi sunulur. `healthcare` seçimi KVKK m.6/3(e) şartlarının, yetkinin/sır saklama yükümlülüğünün ve işleme amacının somut olarak doğrulandığını gerektirir. Sağlık hizmeti olduğu varsayılarak otomatik seçilmez.
- Danışan, `/client/kvkk-onay` ekranında aydınlatmayı ayrı işlem olarak kaydeder; açık rıza gerekiyorsa ayrı ve başlangıçta işaretlenmemiş kutuyla verir. Rıza vermeme ve geri çekme yolları vardır. Rıza vermeyen kişi aydınlatmadan sonra portalı görüntülemeye ve haklarını kullanmaya devam edebilir.
- Yeni metin sürümü eski onaydan otomatik türetilmez. Eski `2026-04-06-v1` kayıtları korunur ve **metin kopyası olmayan eski birleşik onay** olarak raporlanır. Geçmişte gösterilen metin veya geçmiş zaman damgası sonradan uydurulmaz.

## Canlıya geçiş

1. `KVKK_PRIVACY_V2_ENABLED` ayarını kapalı tutun. Veritabanı yedeğini ve geri yükleme prosedürünü doğrulayın. Migration'ı önce izole PostgreSQL ortamında uygulayın. `prisma/migrations/20261004120000_privacy_governance/migration.sql` yeni tabloları, indeksleri, kayıt kısıtlarını ve değişmezlik tetikleyicilerini içerir. Şema değişikliği geriye dönük olarak eski satırları yeniden onaylamaz; eski kayıtların mevcut kaskat silme ilişkileri hazırlık sırasında korunur.
2. Dağıtımda `npx prisma migrate deploy` ve `npx prisma generate` çalıştırılmalıdır. Mevcut `vercel-build` komutu bunları yapar. Bu çalışma sırasında canlı veritabanına migration uygulanmamıştır.
3. Portal başvuruları için ayrı bir **32 baytlık, base64 kodlanmış** `KVKK_REQUEST_ENCRYPTION_KEY` sunucu sırrını sağlayın. Anahtarı sır yönetim sisteminde tutun; `NEXT_PUBLIC_` değişkenine, Git'e veya loglara koymayın. Yedek ve kurtarma planında anahtarı da koruyun. Anahtar bulunmazsa portal kimlik numarası toplamayı reddeder; diğer başvuru kanalları metinde ve ekranda gösterilir. Anahtarı doğrudan değiştirmek eski başvuruları okunamaz yapar; anahtar rotasyonunda mevcut şifreli kayıtlar kontrollü yeniden şifrelenmelidir.
4. IP saklamak bu akışın varsayılanı değildir. Gerekli ve ölçülü olduğuna karar verilirse `KVKK_TRUST_PROXY=true` ve en az 32 karakterlik ayrı `KVKK_IP_HMAC_KEY` gerekir. Uygulamanın doğrudan erişimi kapatılmalı, proxy gelen istemci IP başlıklarını temizleyip kendisi oluşturmalıdır. Bu şartlar doğrulanmadan açmayın. IP özeti anonim veri değildir.
5. Uygulama DB rolü tablo sahibi/superuser olmamalı; `ALTER`, `TRUNCATE`, trigger devre dışı bırakma, DDL veya rol değiştirme yetkisi bulunmamalıdır. Migration rolünü uygulama rolünden ayırın. Tabloların owner rolüyle çalışan uygulama, tetikleyicileri aşabilecek yetkilere sahip olur.
6. Ayar kapalıyken resmî bilgilerle hukuken gözden geçirilmiş metni yayımlayın. Bu hazırlık mevcut danışan akışını değiştirmez. Eski mobil istemcinin `{ "consentVersion": "2026-04-06-v1", "channel": "mobile" }` çağrısı aynı yanıt sözleşmesiyle çalışmaya devam eder. Mobil istemciyi aşağıdaki yeni sözleşmeyi destekleyecek şekilde güncelleyin ve tüm veri sorumlularının metinlerini hazırlayın.
7. İzole ortamda mevcut web/mobil işlemleri, yeni tercih/başvuru yollarını ve gerçek PostgreSQL tetikleyicilerini doğrulayın. Ardından sunucuda `KVKK_PRIVACY_V2_ENABLED=true` ile yeniden dağıtın. **Yalnızca etkinleştirmeden sonra**, mevcut kullanıcılar ayrı güncel aydınlatmaya yönlendirilir; metin/uygun tercih yoksa yeni sağlık verisi girişleri kapanır. Yeni akışta eski sürüm kodu tek başına rıza kabul edilmez. Migration veya veritabanı hatasında eski akışa otomatik dönüş yapılmaz.
8. Yeni tercihler alınmaya başladıktan sonra ayarı kapatmak güvenli bir geri alma yöntemi değildir: rıza vermeme/geri çekme ve başvuru takibi denetimlerini devre dışı bırakır. Bu aşamada hata düzeltmesi yeni akışı korumalı; geri alma gerekiyorsa yeni tercihlerin korunması ve başvuruların cevaplanması için ayrıca bir geçiş planı uygulanmalıdır. Bu çalışma canlı migration, ayar değişikliği veya dağıtım yapmaz.

## API sözleşmesi ve kayıt delili

`GET /api/client/consent/kvkk` çalışma kipini (`mode: legacy | managed`) döndürür. Eski kipte mevcut onay özeti okunur; `POST` eski `consentVersion`/`channel` sözleşmesini korur. Yeni kipte yayımdaki metni, `policyId`, `documentHash`, rıza durumunu ve danışanın işlem geçmişini döndürür. Yeni kipin `POST` isteği aşağıdaki alanları alır:

```json
{
  "policyId": "UUID",
  "documentHash": "64 karakterlik SHA-256 özeti",
  "action": "notice_acknowledged | granted | declined | withdrawn",
  "affirmed": true,
  "requestId": "istemcinin ürettiği UUID",
  "channel": "web | mobile"
}
```

Her **farklı işlem** için yeni `requestId`, ağ hatasından sonraki **aynı işlemin tekrarı** için aynı `requestId` kullanılmalıdır. Aynı kimlikle başka bir tercih göndermek reddedilir. Zaman, kullanıcı ve danışan kimliği sunucudan alınır. İstemci kendisi kullanıcı, zaman veya metin içeriği belirleyemez. Belge özeti farklıysa güncel metin yeniden gösterilmelidir. Aydınlatma kaydı olmadan rıza alınmaz. Güncel metin sağlık hizmeti hukuki sebebine dayanıyorsa gereksiz rıza alınmaz.

Danışan satırı kilidi, tercihlerin birbiriyle yarışmasını ve tekrar gönderimin aynı onayı çoğaltmasını önler. Yeni kayıtlar `eventSequence`, `previousHash`, `eventHash`, metin sürümü ve belge özetiyle bağlanır. Tam belge değişmez `PrivacyPolicy` satırında tutulur. Özetler SHA-256 bütünlük kontrolüdür; **bağımsız zaman damgası, nitelikli elektronik imza veya DBA müdahalesine karşı tek başına güvence değildir**. Yedekler, erişim kayıtları ve gerekirse bağımsız zaman damgası/WORM arşiviyle desteklenmelidir.

Yeni portal sağlık verisi girişlerinde kontrol edilen yollar: gelişim ölçümü oluşturma/güncelleme, egzersiz oluşturma/güncelleme, haftalık değerlendirme gönderimi, yorum ve görüşme mesajı gönderimi, öğün fotoğrafı ve mesaj fotoğrafı yükleme yetkisi. Silme işlemleri ve ilgili kişinin kendi kayıtlarına erişimi bu rıza kapısına bağlanmaz. Kontrol istek girişinde yapılır; önceden başlatılmış bir yükleme/işlem geriye dönük iptal edilmez.

Genel danışan düzenleme uçları yalnızca profil alanlarını kabul eder; rıza özeti, delil ilişkileri veya sahiplik bu uçlardan değiştirilemez. Yeni kipte KVKK delili/başvurusu bulunan danışanı sıradan silme işlemi reddeder. Hazırlık sırasında yalnızca eski kayıtları bulunan danışanlar için mevcut silme davranışı korunur; yeni deliller veritabanı tetikleyicisiyle her iki kipte de korunur.

## İlgili kişi başvurusu ve cevap

Portal; talep türü/konusu, ad-soyad, uyruk, T.C. kimlik veya pasaport/yabancı kimlik numarası ve tebligat adresi alır. Bildirim e-posta adresi doğrulanmış hesap kaydından alınır. Kimlik numarası AES-256-GCM ile şifrelenir ve toplu rapora girmez. Başvuru numarası, sunucu alınma zamanı ve 30 günlük son cevap zamanı kaydedilir. Yabancı kimlik/pasaport girdileri kabul edilir; format kontrolü kimlik doğrulaması yerine geçmez.

Yetkili kişi gerektiğinde kimlik verisini ayrı olarak görüntüler; bu erişim ayrıca kaydedilir. Başvurunun gereğini yerine getirmeden önce uygun kimlik doğrulaması yapmalıdır. Başvuru sahibi, doğrulama bekleniyor, inceleniyor, yerine getirildi veya gerekçeli ret durumlarını ve cevap geçmişini portalda görür. Kimlik doğrulama beklenmesi 30 günlük süreyi sıfırlamaz. Bekleyen ve geciken başvurular yönetim ekranında gösterilir; **operatör bu ekranı günlük takip etmelidir**.

Cevap elektronik olarak portalda saklanır ve ilgili kişinin uygulama gelen kutusuna sağlık/kimlik ayrıntısı içermeyen bildirim eklenir. Nihai cevabın danışan oturumuna ilk iletilmesi `responseAccessedAt` ve ayrı olay kaydıyla izlenir; bu, kişinin metni okuduğu veya kabul ettiği anlamına gelmez. Portal erişimi kapanan, hesabı eşleşmeyen veya alternatif kanaldan başvuran kişilere verilen yazılı/e-posta/KEP cevabı ve teslim belgesi kuruluşun başvuru dosyasında ayrıca tutulmalıdır. Sistem harici başvuruları kendiliğinden içeri almaz.

“Yerine getirildi” seçeneği işlemin fiilen tamamlandığını ifade eder. **Silme/anonimleştirme otomatik çalışmaz.** Bu tür taleplerde imha kapsamı ve üçüncü kişilere bildirim kaydının referansı zorunludur. Sağlık, fatura, sözleşme, yedek, dosya depolama ve hukuki ispat kayıtlarının her biri için saklama dayanağı değerlendirilmelidir. Nihai cevap sonradan düzenlenemez; açıklama/düzeltme gerekiyorsa yeni ve ilişkilendirilmiş başvuru/dosya kaydı oluşturulmalıdır.

## Raporlar

`/management/kvkk` ve `/clients/[id]/kvkk` ekranlarında danışan adı, tarih aralığı ve sayfalı işlem listesi bulunur. Ekran tarihleri İstanbul saatindedir. CSV/JSON dosyalarında olay zamanları UTC ISO biçimindedir. CSV hücreleri formül çalıştırılmasına karşı korunur; Türkçe metinler UTF-8 BOM ile dışa aktarılır. İndirme kişisel hesap oturumunun Bearer kimliğini kullanır.

CSV kabul edilen aydınlatma/açık rıza metinlerini de içerir. JSON dosyası bunlara ek olarak belge sürümlerini, yayıncıyı, hukuki inceleme referansını ve olay özetlerini taşır. Tekil olay ve belge özetleri rapor hazırlanırken yeniden hesaplanır; uyuşmazlıklar ayrıca işaretlenir. Tarih filtresi tam zincirin bir bölümünü alabilir; önceki olay rapor dışında olabilir. `hash_verified` etiketi tekil içerik özetinin doğruluğunu ifade eder.

İlgili kişi başvuru/cevap raporu ayrı JSON olarak alınabilir. Kimlik numarası ve tebligat adresi dışarı aktarılmaz; başvuru konusu veya cevap metni yine kişisel veri içerebilir. Dosyaları yetkisiz kişilere göndermeyin. Rapor oluşturan kullanıcı, filtreler, satır sayısı, dosya özeti ve zaman `PrivacyAuditLog` tablosuna yazılır. Dosya indirme yanıtlarında `X-Report-Id` ve **dosyanın gerçek UTF-8 baytlarının** `X-Report-Hash` özeti bulunur. Başarılı dosya üretimi, dosyanın kullanıcı tarafından kaydedildiğinin kanıtı değildir.

Rapor 10.000 satırı aşarsa eksik dosya sunulmaz; işlem reddedilir. Onay raporunda tarih filtresi daraltılabilir. Başvuru raporundaki daha büyük arşivler kontrollü DBA raporlama süreciyle alınmalıdır. Yönetim ekranı en fazla 100 başvuruyu öncelikle bekleyenlere göre gösterir; tam kayıtlar raporda bulunur. Onay raporu yalnızca veri sorumlusuna o an atanmış danışanları kapsar; controller değişimi/veri devri varsa eski veri sorumlusunun ispat arşivi devir öncesi ayrıca korunmalıdır.

## Saklama, imha ve idari sorumluluklar

Her kategori için saklama süreleri ve hukuki sebepler **kuruluş tarafından belirlenmelidir**. Yazılım tüm sağlık veya rıza kayıtlarına gelişigüzel 3/5/10 yıl atamaz. İmha işlemi kayıtlarının en az üç yıl saklanması kuralı, bütün kişisel verilerin üç yıl saklanacağı anlamına gelmez. Periyodik imha, yedeklerin ömrü, alıcılara bildirim ve fiilî imha kayıtları ayrı işletim süreçleridir.

Değişmezlik tetikleyicileri yeni delillerin uygulama tarafından değiştirilmesini veya yanlışlıkla kaskat silinmesini engeller. Hazırlık uyumluluğu için `legacy_accepted` satırlarının eski kaskat silme davranışı korunur; bu satırların güncellenmesine izin verilmez. Bunlar hukuki süreden sonra sonsuza kadar saklama talimatı değildir. Süre dolduğunda yetkili DBA ayrı kimlikle, onaylı saklama/imha kararına bağlı işlemde ilgili tetikleyicileri kontrollü olarak yönetmeli; silinecek kayıtları ve kapsamı imha dosyasına yazmalı; kalan zincirde oluşan meşru boşlukları belgeli arşiv/manifest ile açıklamalı ve tetikleyicilerin tekrar etkin olduğunu doğrulamalıdır. Uygulama hesabına bu yetki verilmemelidir. Otomatik toplu imha bu değişiklikte devreye alınmamıştır.

### Kuruluşun ayrıca tamamlaması gereken mevcut konular

- **Sağlık dosyalarının depolanması:** mevcut `lib/meal-photo-storage.ts` ve mesaj yükleme akışı Vercel Blob üzerinde `access: "public"` kullanıyor. Bu KVKK onay çalışması eski dosyaları taşımaz ve storage erişimini özel hale getirmez. Sağlıkla ilişkilendirilebilir fotoğraflar için özel depolama/erişim kontrolü, kısa ömürlü yetkilendirilmiş erişim, eski açık dosyaların taşınması/silinmesi ve silme hatalarının izlenmesi ayrıca tamamlanmalıdır. Onay kutusu açık erişim sorununu gidermiş sayılmaz.
- **Yurt dışı aktarım:** Supabase, Neon, Vercel ve bildirim sağlayıcılarının fiilî veri bölgesi, alt işleyenleri, sözleşmeleri ve KVKK m.9 mekanizması doğrulanmalıdır. Paket veya sağlayıcı adı tek başına aktarım ülkesi kanıtı değildir. Düzenli yurt dışı aktarımın bu sağlık rızasına bağlanması uygun güvence yerine geçmez. Standart sözleşme kullanılıyorsa imzadan itibaren beş iş günlük bildirim yükümlülüğü ayrıca takip edilir.
- **Portal dışı veri toplama:** diyetisyen tarafından girilen sağlık notları/ölçümler, Tanita aktarımı, otomatik servisler, kayıt/eşleştirme, pazarlama, referans/yorum paylaşımı ve üçüncü kişilere gönderim için faaliyet bazında envanter ve hukuki dayanak gerekir. Bu çalışma portalın yeni sağlık verisi gönderimlerini kontrol eder; tüm bu faaliyetlere merkezi bir yetki veya rıza kararı uygulamaz.
- **Çocuk/temsilci başvuruları:** bu portal akışı kişinin kendi kimliği doğrulanmış hesabı içindir. Çocuk/veli/vasinin temsil yetkisi ve gerektiğinde ayrı onay süreci ayrıca kurulmalıdır; yeni akış bu yetkiyi varsaymaz.
- **Veri güvenliği:** yetki matrisi, sır saklama taahhütleri, personel eğitimi, disk/yedek şifreleme, sır yönetimi, MFA, güvenli loglar ve düzenli erişim denetimleri işletilmelidir. Mevcut eski uygulama loglarında kişisel veriler bulunabilir; log envanteri ve erişim/saklama sınırları ayrıca kontrol edilmelidir. Bu değişiklik token parçası yazan kimlik doğrulama loglarını kapatır, bütün uygulama loglarını yeniden tasarlamaz.
- **VERBİS ve ihlal yönetimi:** kayıt/istisna durumu, envanter ve saklama-imha politikası fiilî faaliyet açısından değerlendirilmelidir. İhlalin öğrenilmesinden itibaren en geç 72 saat içinde Kurula bildirim ve etkilenen kişilere uygun zamanda bildirim için sorumlular, iletişim yolları ve olay dosyası tanımlanmalıdır. Yazılım bu bildirimleri kuruluş adına kendiliğinden göndermez.

## Doğrulama

Yeni testler; ayrı aydınlatma, yanlış/eski metin reddi, açık olumlu beyan zorunluluğu, tekrar istekleri, geri çekme, yeni veri girişinin durması, sağlık hizmeti dayanağı, asistan/API anahtarı yetki sınırı, kimlik şifreleme ve değiştirilmiş şifreli veri reddi, dosya bayt özeti, CSV formül koruması, kişiye/kuruluşa göre rapor kapsamı ve raporda delil uyuşmazlığını kapsar. Prisma şema doğrulaması ve TypeScript denetimi çalıştırılır. Gerçek PostgreSQL kilit/tetikleyici testi ile tüm giriş yapmış kullanıcı arayüzü akışları canlıya geçiş öncesi izole ortamda ayrıca denenmelidir.

## Resmî kaynaklar

- [Aydınlatma ile açık rızanın ayrı düzenlenmesi — 18.02.2026, 2026/347](https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu)
- [Özel nitelikli kişisel verilerin güncel işlenme şartları](https://www.kvkk.gov.tr/Icerik/2051/Ozel-Nitelikli-Kisisel-Veriler)
- [İlgili kişi başvurularının cevaplanması yükümlülüğü](https://www.kvkk.gov.tr/Icerik/2046/Ilgili-Kisiler-Tarafindan-Yapilan-Basvurularin-Cevaplanmasi-Yukumlulugu)
- [Başvuruya verilecek cevabın bildirim usulü — 1 Ekim 2026 duyurusu](https://www.kvkk.gov.tr/Icerik/9024/ilgili-kisilerin-basvurularina-verilecek-cevabin-bildirim-usulune-iliskin-kamuoyu-duyurusu)
- [Veri sorumlusuna başvuru usul ve esasları](https://kvkk.gov.tr/SharedFolderServer/CMSFiles/bf638c8f-7455-49a7-8118-3eb2858a16b5.pdf)
- [Silme, yok etme ve anonim hale getirme yönetmeliği](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK)
- [Standart sözleşme bildirim modülü ve beş iş günlük süre](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu)
- [Veri ihlali bildirim süreleri](https://www.kvkk.gov.tr/Icerik/8595/kamuoyu-duyurusu)
