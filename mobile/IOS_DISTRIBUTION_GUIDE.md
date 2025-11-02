# iOS Uygulamasını Tek Kullanıcıya Dağıtma Rehberi

**Kaynak:** [EAS Build Dokümantasyonu](https://docs.expo.dev/build/introduction/)

## Gereksinimler

1. **Apple Developer Hesabı** ($99/yıl) - Zorunlu
2. **Mac** (iPhone'a yüklemek için gerekli)
3. **EAS CLI** yüklü olmalı
4. **Expo Hesabı** (ücretsiz)

## EAS Build'in Avantajları

EAS Build şunları otomatik yapar:

- ✅ **Uygulama İmzalama**: Sertifika ve provisioning profile'ları otomatik yönetir
- ✅ **Internal Distribution**: Ad-hoc dağıtım ile tek URL'den paylaşım
- ✅ **Cloud Build**: Kendi makinenizde build yapmaya gerek yok
- ✅ **Kolay Dağıtım**: `.ipa` dosyasını indirip direkt yükleyebilirsiniz

## Adım Adım Süreç

### 1. EAS CLI Kurulumu

```bash
npm install -g eas-cli
```

### 2. EAS'a Giriş ve Proje Kurulumu

```bash
cd mobile
eas login
eas build:configure
```

Bu komut `eas.json` dosyasını oluşturur (zaten var).

### 3. Apple Developer Hesabını Bağla

```bash
eas credentials
```

Bu komut Apple Developer hesabınızı EAS'a bağlar ve otomatik olarak:

- Development sertifikası oluşturur
- Provisioning profile oluşturur
- Ad-hoc dağıtım için hazırlar

### 4. iOS Preview Build Oluşturma (Internal Distribution)

```bash
eas build --platform ios --profile preview
```

Bu komut:

- ✅ Cloud'da build yapar (Mac gerekmez)
- ✅ `.ipa` dosyası oluşturur
- ✅ **Internal distribution** kullanır (ad-hoc)
- ✅ Tek URL ile paylaşılabilir

### 5. Build Sonrası - Paylaşım ve İndirme

Build tamamlandığında EAS size verecek:

- 📱 **QR Kod**: iPhone'da tara, direkt yükle
- 🔗 **Paylaşım URL'i**: Tek link ile paylaş
- 📦 **`.ipa` Dosyası**: EAS dashboard'dan indir

**Yöntem 1: QR Kod ile (En Kolay)**

- Build tamamlanınca QR kodu gösterilir
- iPhone'da kamerayı aç, QR kodu tara
- Direkt yükleme başlar

**Yöntem 2: URL ile**

- Build URL'ini paylaş
- iPhone'da Safari'de aç
- "Install" butonuna tıkla

**Yöntem 3: `.ipa` Dosyası ile (Manuel)**

- EAS dashboard'dan `.ipa` dosyasını indir
- Mac'te aşağıdaki yöntemlerden biriyle yükle

### 6. iPhone'a Manuel Yükleme (`.ipa` dosyası ile)

#### Yöntem 1: Xcode ile (Önerilen)

1. iPhone'u USB ile Mac'e bağla
2. Xcode'u aç
3. Window > Devices and Simulators
4. Cihazınızı seç
5. `.ipa` dosyasını sürükle-bırak

#### Yöntem 2: Finder ile

1. iPhone'u USB ile Mac'e bağla
2. Finder'da cihazınızı aç
3. `.ipa` dosyasını sürükle-bırak

#### Yöntem 3: Apple Configurator 2 ile

1. Apple Configurator 2'yi App Store'dan indir
2. iPhone'u bağla
3. `.ipa` dosyasını yükle

## Önemli Notlar

✅ **EAS Build Avantajları:**

- Cloud'da build yapılır, Mac gerekmez (sadece iPhone'a yüklemek için Mac gerekli)
- Sertifika ve provisioning profile otomatik yönetilir
- Internal distribution ile tek URL'den paylaşım

⚠️ **Apple Developer Hesabı Zorunlu**: iOS uygulamasını gerçek cihaza yüklemek için Apple Developer hesabı ($99/yıl) gereklidir. Bu olmadan dağıtım mümkün değil.

⚠️ **Internal Distribution**: `eas.json`'daki `preview` profili `"distribution": "internal"` kullanır. Bu:

- Ad-hoc provisioning profile oluşturur
- Belirli cihazlara özel dağıtım yapar
- App Store'a yüklenmez, direkt cihaza yüklenir

⚠️ **Cihaz Kayıt**: İlk build'de cihazınızın UDID'sini Apple Developer hesabına kaydetmeniz gerekebilir. EAS bunu otomatik yapabilir.

## Ücretsiz Alternatifler

Ücretsiz bir çözüm istiyorsanız:

- **PWA (Progressive Web App)**: Zaten uyguladık ✅
- **Expo Go**: Sürekli `expo start` gerektirir, production için uygun değil

## Build Profilleri

`eas.json` dosyasında 3 profil tanımlı:

1. **development**: Simulator için
2. **preview**: Ad-hoc dağıtım için (tek cihaz)
3. **production**: App Store için

Tek kullanıcı dağıtımı için `preview` profili kullanılır.
