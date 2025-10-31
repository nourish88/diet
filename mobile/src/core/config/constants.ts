// App configuration constants
export const APP_CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Notification settings
  NOTIFICATION_DELAY_MINUTES: 30, // 30 minutes before meal time
  DIET_NOTIFICATION_DAYS: 14, // 14 days of notifications

  // Photo settings
  MAX_PHOTO_SIZE_MB: 5,
  PHOTO_QUALITY: 0.8,

  // Cache settings
  CACHE_DURATION_MINUTES: 5,

  // App info
  APP_NAME: "Diet App",
  APP_VERSION: "1.0.0",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_SYNC: "/api/auth/sync",

  // Clients
  CLIENTS: "/api/clients",
  CLIENT_DETAILS: (id: number) => `/api/clients/${id}`,

  // Diets
  DIETS: "/api/diets",
  DIET_DETAILS: (id: number) => `/api/diets/${id}`,

  // Templates
  TEMPLATES: "/api/templates",
  TEMPLATE_DETAILS: (id: number) => `/api/templates/${id}`,
  TEMPLATE_USE: (id: number) => `/api/templates/${id}/use`,

  // Comments
  COMMENTS: "/api/comments",

  // Meal Photos
  MEAL_PHOTOS: "/api/meal-photos",

  // Notifications
  NOTIFICATION_PREFERENCES: "/api/notifications/preferences",

  // Analytics
  ANALYTICS_STATS: "/api/analytics/stats",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "İnternet bağlantınızı kontrol edin",
  UNAUTHORIZED: "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın",
  FORBIDDEN: "Bu işlem için yetkiniz bulunmuyor",
  NOT_FOUND: "Aradığınız kayıt bulunamadı",
  SERVER_ERROR: "Sunucu hatası. Lütfen daha sonra tekrar deneyin",
  VALIDATION_ERROR: "Lütfen tüm alanları doğru şekilde doldurun",
  UNKNOWN_ERROR: "Bilinmeyen bir hata oluştu",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Giriş başarılı",
  REGISTER_SUCCESS: "Kayıt başarılı",
  LOGOUT_SUCCESS: "Çıkış yapıldı",
  SAVE_SUCCESS: "Kaydetme başarılı",
  DELETE_SUCCESS: "Silme başarılı",
  UPDATE_SUCCESS: "Güncelleme başarılı",
} as const;

