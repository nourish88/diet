import type { PrivacyDocument } from "@/lib/kvkk-consent-config";
import type { PublishPolicyInput } from "./schemas";

export function buildPrivacyDocument(input: PublishPolicyInput): PrivacyDocument {
  const { version: _version, healthLegalBasis, reviewed: _reviewed, reviewReference: _reviewReference, ...facts } = input;
  const noticeText = [
    "KİŞİSEL VERİLERİN İŞLENMESİ HAKKINDA AYDINLATMA METNİ",
    `Veri sorumlusu: ${facts.controllerName}\nAdres: ${facts.controllerAddress}\nBaşvuru e-posta adresi: ${facts.contactEmail}`,
    `Toplama yöntemleri: ${facts.collectionMethods}`,
    `Veri kategorileri, işleme amaçları ve KVKK m.5 kapsamındaki hukuki sebepler: ${facts.processingDetails}`,
    `Sağlık verisi kategorileri: ${facts.healthDataCategories}\nİşleme amacı: ${facts.healthPurpose}\nHukuki sebep: ${healthLegalBasis === "explicit_consent" ? "KVKK m.6/3(a) açık rıza" : "KVKK m.6/3(e) sağlık hizmetleri"}. ${facts.healthLegalJustification}`,
    `Yurt içi alıcılar, aktarım amaçları ve hukuki sebepleri: ${facts.recipients}`,
    `Yurt dışı aktarım, alıcılar ve KVKK m.9 kapsamındaki güvenceler: ${facts.internationalTransfers}`,
    `Saklama süreleri, başlangıç olayları ve imha: ${facts.retentionPolicy}`,
    "KVKK m.11 uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/yurt dışında aktarılan üçüncü kişileri bilme, eksik veya yanlış verilerin düzeltilmesini isteme, m.7 şartlarında silme veya yok etme isteme, düzeltme/silme işlemlerinin üçüncü kişilere bildirilmesini isteme, münhasıran otomatik analiz sonucu aleyhinize ortaya çıkan sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararınızın giderilmesini talep etme haklarınız vardır.",
    `Başvuru: Portalın KVKK ve haklarım ekranından veya Tebliğdeki usullerle yukarıdaki adrese başvurabilirsiniz. Kayıtlı e-posta adresinizden ${facts.contactEmail} adresine de başvurabilirsiniz. Başvurular niteliklerine göre en kısa sürede ve en geç 30 gün içinde sonuçlandırılır. İşlemin ayrıca maliyet gerektirmesi halinde Kurul tarifesi uygulanabilir. Cevabın yetersiz bulunması, ret veya süresinde cevap verilmemesi halinde cevabı öğrenmenizden itibaren 30 ve her halde başvurudan itibaren 60 gün içinde Kurula şikayet edebilirsiniz.`,
    "Bu metnin sunulması ve okunduğunun kaydı açık rıza değildir.",
  ].join("\n\n");
  const consentText = healthLegalBasis === "explicit_consent" ? [
    "SAĞLIK VERİLERİNİN İŞLENMESİ İÇİN AÇIK RIZA",
    `${facts.controllerName} tarafından, ${facts.healthDataCategories} verilerimin yalnızca ${facts.healthPurpose} amacıyla işlenmesine özgür irademle açık rıza veriyorum.`,
    `Rıza vermeme veya geri çekme halinde: ${facts.refusalConsequences}`,
    "Rıza vermemeyi seçebilirim. Verdiğim rızayı portalın KVKK ve haklarım ekranından her zaman geri çekebilirim. Geri çekme önceki işlemenin hukuka uygunluğunu etkilemez. Başka bir kanuni saklama sebebi varsa bu sebeple sınırlı saklama değerlendirilebilir. Bu rıza pazarlama, kamuya açık paylaşım veya yurt dışına düzenli aktarım için izin değildir.",
  ].join("\n\n") : null;
  return { ...facts, noticeText, consentText };
}
