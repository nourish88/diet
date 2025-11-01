#!/usr/bin/env node

/**
 * Push Notification Test Script
 * 
 * Usage:
 *   node scripts/test-push.js ExponentPushToken[xxxxxx]
 */

const token = process.argv[2];

if (!token) {
  console.error('❌ Kullanım: node scripts/test-push.js ExponentPushToken[xxxxxx]');
  process.exit(1);
}

if (!token.startsWith('ExponentPushToken[')) {
  console.error('❌ Geçersiz token formatı!');
  process.exit(1);
}

console.log('📤 Push notification gönderiliyor...');
console.log('   Token:', token.substring(0, 30) + '...');

const message = {
  to: token,
  title: 'Test Bildirimi 🔔',
  body: 'Bu bir test mesajıdır. Başarılı!',
  sound: 'default',
  priority: 'high',
  data: {
    test: true,
    timestamp: new Date().toISOString(),
  },
};

fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify(message),
})
  .then(res => res.json())
  .then(result => {
    console.log('\n📬 Sonuç:', JSON.stringify(result, null, 2));
    
    if (result.data && result.data[0].status === 'ok') {
      console.log('\n✅ Başarılı! Telefonunuzu kontrol edin.');
      process.exit(0);
    } else {
      console.error('\n❌ Başarısız!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Hata:', error.message);
    process.exit(1);
  });

