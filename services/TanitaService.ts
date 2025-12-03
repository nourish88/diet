import Database from "better-sqlite3";
import path from "path";

// Tanita SQLite veritabanı yolu
const TANITA_DB_PATH = path.join(process.cwd(), "data", "tanita.sqlite");

// Database instance (singleton pattern)
let dbInstance: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!dbInstance) {
    try {
      dbInstance = new Database(TANITA_DB_PATH, { readonly: true });
      // Enable foreign keys
      dbInstance.pragma("foreign_keys = ON");
    } catch (error) {
      console.error("Error opening Tanita database:", error);
      throw new Error("Tanita veritabanına erişilemedi");
    }
  }
  return dbInstance;
}

// Tanita User interface
export interface TanitaUser {
  id: number;
  name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  bodyType: string | null;
  height: string | null;
  identityNumber: string | null;
  notes: string | null;
  isActive: string;
  isDeleted: string;
}

// Tanita Measurement interface (sadece temel alanlar)
export interface TanitaMeasurement {
  ID: number;
  MemberID: number;
  MeasureDate: string;
  DateTime: string;
  Weight: number | null;
  FatRate: number | null;
}

export const TanitaService = {
  /**
   * Tüm aktif danışanları getir
   */
  getAllUsers(): TanitaUser[] {
    const db = getDatabase();
    try {
      const stmt = db.prepare(`
        SELECT 
          id, name, surname, email, phone, dob, gender, 
          bodyType, height, identityNumber, Notes as notes,
          "isActive", "isDeleted"
        FROM users 
        WHERE "isDeleted" = '0' AND "isActive" = '1'
        ORDER BY name, surname
      `);
      return stmt.all() as TanitaUser[];
    } catch (error) {
      console.error("Error fetching Tanita users:", error);
      throw new Error("Tanita danışanları getirilemedi");
    }
  },

  /**
   * Belirli bir danışanı ID ile getir
   */
  getUserById(memberId: number): TanitaUser | null {
    const db = getDatabase();
    try {
      const stmt = db.prepare(`
        SELECT 
          id, name, surname, email, phone, dob, gender, 
          bodyType, height, identityNumber, Notes as notes,
          "isActive", "isDeleted"
        FROM users 
        WHERE id = ? AND "isDeleted" = '0' AND "isActive" = '1'
      `);
      const result = stmt.get(memberId) as TanitaUser | undefined;
      return result || null;
    } catch (error) {
      console.error("Error fetching Tanita user:", error);
      throw new Error("Tanita danışanı getirilemedi");
    }
  },

  /**
   * Danışan ara (name, surname, phone, email) - Case insensitive
   */
  searchUsers(query: string): TanitaUser[] {
    const db = getDatabase();
    try {
      // Türkçe karakterler için normalize edilmiş arama
      const searchTerm = `%${query.trim().toLowerCase()}%`;
      const stmt = db.prepare(`
        SELECT 
          id, name, surname, email, phone, dob, gender, 
          bodyType, height, identityNumber, Notes as notes,
          "isActive", "isDeleted"
        FROM users 
        WHERE ("isDeleted" = '0' AND "isActive" = '1')
          AND (
            LOWER(name) LIKE ? OR 
            LOWER(surname) LIKE ? OR 
            LOWER(phone) LIKE ? OR 
            LOWER(email) LIKE ? OR
            LOWER(name || ' ' || surname) LIKE ?
          )
        ORDER BY name, surname
        LIMIT 50
      `);
      return stmt.all(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm
      ) as TanitaUser[];
    } catch (error) {
      console.error("Error searching Tanita users:", error);
      throw new Error("Tanita danışan araması başarısız");
    }
  },

  /**
   * Belirli bir danışanın ölçümlerini getir (sadece temel alanlar)
   * Gerçek ilişki: users → measure_logs → measurements
   * Eşleşme: DateTime, Age, Height üzerinden
   */
  getUserMeasurements(memberId: number): TanitaMeasurement[] {
    const db = getDatabase();
    try {
      const stmt = db.prepare(`
        SELECT 
          m.ID, 
          m.MemberID, 
          m.MeasureDate, 
          m.DateTime,
          m.Weight, 
          m.FatRate
        FROM users u
        JOIN measure_logs ml ON ml.user_id = u.id
        JOIN measurements m 
          ON m.DateTime = ml.created_at 
          AND m.Age = ml.age
          AND m.Height = ml.height
        WHERE u.id = ? AND m.IsDeleted = 0
        ORDER BY m.DateTime DESC
      `);
      return stmt.all(memberId) as TanitaMeasurement[];
    } catch (error) {
      console.error("Error fetching Tanita measurements:", error);
      throw new Error("Tanita ölçümleri getirilemedi");
    }
  },

  /**
   * Tüm ölçümleri getir (batch import için - sadece temel alanlar)
   * Gerçek ilişki: users → measure_logs → measurements
   */
  getAllMeasurements(): TanitaMeasurement[] {
    const db = getDatabase();
    try {
      const stmt = db.prepare(`
        SELECT 
          m.ID, 
          m.MemberID, 
          m.MeasureDate, 
          m.DateTime,
          m.Weight, 
          m.FatRate
        FROM users u
        JOIN measure_logs ml ON ml.user_id = u.id
        JOIN measurements m 
          ON m.DateTime = ml.created_at 
          AND m.Age = ml.age
          AND m.Height = ml.height
        WHERE m.IsDeleted = 0
        ORDER BY m.MemberID, m.DateTime DESC
      `);
      return stmt.all() as TanitaMeasurement[];
    } catch (error) {
      console.error("Error fetching all Tanita measurements:", error);
      throw new Error("Tanita ölçümleri getirilemedi");
    }
  },

  /**
   * Database bağlantısını kapat
   */
  close(): void {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  },
};

