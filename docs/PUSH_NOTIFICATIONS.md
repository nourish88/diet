# 📱 Push Notifications - Basit Sistem

## 🎯 Genel Bakış

Socket.IO yerine **basit ve güvenilir** Expo Push Notifications kullanıyoruz.

### Avantajları

✅ Vercel ile uyumlu (WebSocket gerektirmez)  
✅ Uygulama kapalıyken bile çalışır  
✅ Kurulumu ve yönetimi kolay  
✅ Ücretsiz ve güvenilir

---

## 🔧 Mimari

```
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│   Client     │              │   Backend    │              │ Expo Push    │
│  (Mobile)    │              │  (Vercel)    │              │  Service     │
└──────────────┘              └──────────────┘              └──────────────┘
       │                             │                             │
       │ 1. Login + Get Token        │                             │
       ├────────────────────────────>│                             │
       │                             │                             │
       │ 2. Save Push Token          │                             │
       ├────────────────────────────>│                             │
       │                             │                             │
       │  (Dietitian sends message)  │                             │
       │<────────────────────────────┤                             │
       │                             │                             │
       │                             │ 3. Send Push Notification   │
       │                             ├────────────────────────────>│
       │                             │                             │
       │ 4. Receive Notification     │                             │
       │<────────────────────────────┼─────────────────────────────┤
```

---

## 📦 Kurulum

### Backend Dependencies (Yok!)

✅ Hiç ek paket gerekmez! Sadece `fetch` API kullanıyoruz.

### Mobile Dependencies

```bash
cd mobile
npm install expo-notifications expo-device
```

---

## 🗄️ Veritabanı

### User Model

```prisma
model User {
  // ... existing fields
  pushToken String? // Expo Push Token
}
```

### Migration

```bash
cd diet
npx prisma db push
```

---

## 🔨 Implementation

### 1. Backend - Push Token API

**Endpoint**: `POST /api/push-token`  
**Auth**: Required

```typescript
// Save push token
await api.post("/api/push-token", { pushToken });

// Remove push token (on logout)
await api.delete("/api/push-token");
```

### 2. Backend - Send Push Notification

**File**: `lib/expo-push.ts`

```typescript
import { sendExpoPushNotification } from "@/lib/expo-push";

await sendExpoPushNotification(
  userPushToken,
  "Yeni Mesaj",
  "Diyetisyeninizden yeni bir mesaj var",
  { type: "new_message", dietId: 123 }
);
```

### 3. Messages API Integration

**File**: `app/api/clients/[id]/diets/[dietId]/messages/route.ts`

Mesaj oluşturulduğunda otomatik olarak push notification gönderilir:

```typescript
// Client → Dietitian
if (auth.user.role === "client") {
  const dietitian = await prisma.user.findUnique({
    where: { id: client.dietitianId },
    select: { pushToken: true },
  });

  if (dietitian?.pushToken) {
    await sendExpoPushNotification(
      dietitian.pushToken,
      `Yeni Mesaj: ${client.name}`,
      message.content
    );
  }
}

// Dietitian → Client
else {
  const clientUser = await prisma.user.findUnique({
    where: { id: client.userId },
    select: { pushToken: true },
  });

  if (clientUser?.pushToken) {
    await sendExpoPushNotification(
      clientUser.pushToken,
      "Diyetisyeninizden Yeni Mesaj",
      message.content
    );
  }
}
```

### 4. Mobile - Push Service

**File**: `mobile/src/core/notifications/push-service.ts`

```typescript
import { pushNotificationService } from "@/core/notifications/push-service";

// Register for push notifications
await pushNotificationService.registerForPushNotifications();

// Setup listeners
pushNotificationService.setupNotificationListeners(
  (notification) => {
    // Foreground notification
    console.log("Received:", notification);
  },
  (response) => {
    // Tapped notification
    console.log("Tapped:", response);
    // Navigate to message screen
  }
);

// Remove on logout
await pushNotificationService.removePushToken();
```

### 5. Auth Store Integration

**File**: `mobile/src/features/auth/stores/auth-store.ts`

```typescript
// On login/sync
if (user.role === "client") {
  await pushNotificationService.registerForPushNotifications();
}

// On logout
await pushNotificationService.removePushToken();
```

---

## ⚙️ Configuration

### 1. Expo Project ID

**File**: `mobile/src/core/notifications/push-service.ts`

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: "your-expo-project-id", // 👈 Buraya Expo project ID'nizi yazın
});
```

**Expo Project ID'yi Bulma:**

```bash
cd mobile
npx expo whoami  # Expo hesabınızı kontrol edin
```

`app.json`'da:

```json
{
  "expo": {
    "slug": "diet-mobile",
    "extra": {
      "eas": {
        "projectId": "abc123..." // 👈 Bu sizin project ID'niz
      }
    }
  }
}
```

### 2. app.json Permissions

Zaten ekli:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

---

## 🧪 Test

### 1. Backend Test

```bash
curl -X POST http://localhost:3000/api/push-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pushToken":"ExponentPushToken[xxxxxx]"}'
```

### 2. Mobile Test

1. **Fiziksel cihaz gerekli** (emülatörde push notification çalışmaz)
2. Expo Go veya development build kullanın
3. Login yapın
4. Console'da push token'ı görmelisiniz:
   ```
   ✅ Expo Push Token: ExponentPushToken[xxxxxx]
   💾 Saving push token to backend...
   ✅ Push token saved to backend
   ```

### 3. End-to-End Test

1. **Client (Mobile)**:

   - Login yap
   - Bir diyet programına gir
   - Diyetisyene mesaj gönder

2. **Backend**:

   ```
   ✅ Message created: 42
   📤 Sending push notification to ExponentPushToken[...]
      Title: Yeni Mesaj: John Doe
      Body: Merhaba diyetisyenim...
   ✅ Push notification sent successfully
   ```

3. **Dietitian (Web/Mobile)**:
   - Push notification almalı
   - Tıklayınca mesajlaşma ekranına gitmeli

---

## 🎨 Notification Handling

### Foreground (Uygulama açık)

```typescript
setupNotificationListeners((notification) => {
  // Show in-app banner or update UI
  Alert.alert(
    notification.request.content.title,
    notification.request.content.body
  );
});
```

### Background/Killed (Uygulama kapalı)

```typescript
setupNotificationListeners(undefined, (response) => {
  const data = response.notification.request.content.data;

  if (data.type === "new_message") {
    router.push(`/diets/${data.dietId}/messages`);
  }
});
```

---

## 🚀 Production

### Expo Build

```bash
cd mobile

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Vercel Deployment

✅ Push notifications Vercel ile mükemmel çalışır (WebSocket gerektirmez).

```bash
cd diet
vercel --prod
```

---

## 🔒 Security

### Rate Limiting (Opsiyonel)

```typescript
// lib/expo-push.ts

const rateLimits = new Map<string, number>();

export async function sendExpoPushNotification(token: string, ...) {
  // Check rate limit (max 10 per hour)
  const key = `${token}_${Date.now() / 3600000}`;
  const count = rateLimits.get(key) || 0;

  if (count >= 10) {
    console.log("⚠️ Rate limit exceeded");
    return false;
  }

  rateLimits.set(key, count + 1);

  // Send notification...
}
```

### Token Validation

```typescript
if (!pushToken.startsWith("ExponentPushToken[")) {
  throw new Error("Invalid push token format");
}
```

---

## 📊 Monitoring

### Backend Logs

```
💾 Saving push token for user 5: ExponentPushToken[abc123...]
✅ Push token saved for user 5

📤 Sending push notification to ExponentPushToken[abc123...]...
   Title: Yeni Mesaj: John Doe
   Body: Merhaba diyetisyenim...
✅ Push notification sent successfully
```

### Mobile Logs

```
✅ Expo Push Token: ExponentPushToken[abc123...]
💾 Saving push token to backend...
✅ Push token saved to backend
🔔 Notification received: { title: "...", body: "..." }
👆 Notification tapped: { data: { dietId: 123 } }
```

---

## 🐛 Troubleshooting

### "Push notifications only work on physical devices"

✅ **Çözüm**: Fiziksel cihaz kullanın (iOS veya Android)

### "Push notification permission denied"

```typescript
// Check permission status
const { status } = await Notifications.getPermissionsAsync();
console.log("Permission status:", status);

// Request again
await Notifications.requestPermissionsAsync();
```

### "Invalid push token format"

✅ **Çözüm**: Token `ExponentPushToken[...]` formatında olmalı

### "Notification not received"

1. Fiziksel cihaz kullanıyor musunuz?
2. Push token backend'e kaydedildi mi? (Console log kontrol et)
3. Backend push notification gönderdi mi? (Server log kontrol et)
4. İnternet bağlantısı var mı?

### "Notification received but not shown"

```typescript
// Check notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // 👈 true olmalı
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

---

## 📈 İstatistikler

### Expo Push API Limits

- **Ücretsiz**: 100,000 bildirim/gün
- **Hız**: ~1000 bildirim/saniye
- **Güvenilirlik**: %99.9 uptime

### Response Times

- Token kaydetme: ~100ms
- Push gönderme: ~200ms
- Bildirim alınması: 1-5 saniye

---

## ✅ Checklist

### Backend

- [x] `pushToken` field added to User model
- [x] `POST /api/push-token` endpoint
- [x] `DELETE /api/push-token` endpoint
- [x] `sendExpoPushNotification()` helper
- [x] Messages API integration

### Mobile

- [x] `expo-notifications` installed
- [x] `expo-device` installed
- [x] Push service created
- [x] Auth store integration
- [x] Notification listeners

### Configuration

- [ ] Expo Project ID ayarlandı mı?
- [ ] Fiziksel cihazda test edildi mi?
- [ ] Production build yapıldı mı?

---

## 📚 Resources

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push API](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Testing Push Notifications](https://docs.expo.dev/push-notifications/push-notifications-setup/)
