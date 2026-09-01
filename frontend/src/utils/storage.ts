import * as SecureStore from 'expo-secure-store';

/**
 * Type-safe wrapper around expo-secure-store
 */
export const storage = {
  async getItem<T = string>(key: string): Promise<T | null> {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (!item) return null;
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (error) {
      console.error(`Error reading from SecureStore [${key}]:`, error);
      return null;
    }
  },

  async setItem(key: string, value: any): Promise<boolean> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await SecureStore.setItemAsync(key, stringValue);
      return true;
    } catch (error) {
      console.error(`Error saving to SecureStore [${key}]:`, error);
      return false;
    }
  },

  async removeItem(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      console.error(`Error deleting from SecureStore [${key}]:`, error);
      return false;
    }
  },
};
