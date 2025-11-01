import * as SecureStore from "expo-secure-store";

// Secure storage keys
export const STORAGE_KEYS = {
  SUPABASE_TOKEN: "supabase_token",
  USER_DATA: "user_data",
  THEME: "theme",
  NOTIFICATION_PREFERENCES: "notification_preferences",
} as const;

class SecureStorage {
  /**
   * Saves an item securely.
   * @param key The key to store the item under.
   * @param value The value to store.
   */
  async saveItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error saving item with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves a securely stored item.
   * @param key The key of the item to retrieve.
   * @returns The stored value, or null if not found.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting item with key ${key}:`, error);
      return null;
    }
  }

  /**
   * Deletes a securely stored item.
   * @param key The key of the item to delete.
   */
  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting item with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clears all items from secure storage (if possible, or specific keys).
   * Note: SecureStore does not have a direct "clear all" method.
   * This implementation will only clear known keys.
   */
  async clear(): Promise<void> {
    try {
      await Promise.all(
        Object.values(STORAGE_KEYS).map((key) =>
          SecureStore.deleteItemAsync(key)
        )
      );
    } catch (error) {
      console.error("Error clearing storage:", error);
      throw error;
    }
  }

  /**
   * Saves a JSON object securely.
   * @param key The key to store the item under.
   * @param value The object to store.
   */
  async saveParsedItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.saveItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving parsed item with key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves and parses a securely stored JSON object.
   * @param key The key of the item to retrieve.
   * @returns The parsed object, or null if not found or parsing fails.
   */
  async getParsedItem<T>(key: string): Promise<T | null> {
    const value = await this.getItem(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error parsing item with key ${key}:`, error);
      return null;
    }
  }
}

export default new SecureStorage();




