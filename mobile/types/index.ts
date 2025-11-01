export interface User {
  id: number;
  supabaseId: string;
  email: string;
  role: "dietitian" | "client";
  client?: {
    id: number;
    name: string;
    surname: string;
    phoneNumber?: string;
  };
}

export interface Client {
  id: number;
  name: string;
  surname: string;
  phoneNumber?: string;
  birthdate?: string;
  notes?: string;
  gender?: number;
  illness?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Diet {
  id: number;
  createdAt: string;
  updatedAt: string;
  tarih?: string;
  su?: string;
  sonuc?: string;
  hedef?: string;
  fizik?: string;
  dietitianNote?: string;
  clientId: number;
  isBirthdayCelebration: boolean;
  isImportantDateCelebrated: boolean;
  importantDateId?: number;
  importantDate?: {
    id: number;
    name: string;
    message: string;
  };
  oguns: Ogun[];
  comments: DietComment[];
  mealPhotos: MealPhoto[];
}

export interface Ogun {
  id: number;
  name: string;
  time: string;
  detail?: string;
  order: number;
  dietId: number;
  items: MenuItem[];
  comments: DietComment[];
  mealPhotos: MealPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: number;
  miktar?: string;
  besinId: number;
  besin: {
    id: number;
    name: string;
  };
  birimId?: number;
  birim?: {
    id: number;
    name: string;
  };
  ogunId: number;
  comments: DietComment[];
  createdAt: string;
  updatedAt: string;
}

export interface Besin {
  id: number;
  name: string;
  priority: number;
  groupId?: number;
  besinGroup?: {
    id: number;
    name: string;
    description: string;
  };
}

export interface Birim {
  id: number;
  name: string;
}

export interface DietComment {
  id: number;
  content: string;
  userId: number;
  user: {
    id: number;
    email: string;
    role: "dietitian" | "client";
  };
  dietId: number;
  ogunId?: number;
  ogun?: {
    id: number;
    name: string;
  };
  menuItemId?: number;
  menuItem?: {
    id: number;
    besin: {
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface MealPhoto {
  id: number;
  firebaseUrl: string;
  dietId: number;
  ogunId: number;
  ogun: {
    id: number;
    name: string;
  };
  clientId: number;
  client: {
    id: number;
    name: string;
    surname: string;
  };
  uploadedAt: string;
  expiresAt: string;
}

export interface NotificationPreference {
  id: number;
  userId: number;
  mealReminders: boolean;
  dietUpdates: boolean;
  comments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}


