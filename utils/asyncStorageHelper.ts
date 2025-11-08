import AsyncStorage from '@react-native-async-storage/async-storage';

export async function safeGetJSON<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    
    if (!raw || raw === 'undefined' || raw === 'null' || raw === 'object' || raw === '[object Object]') {
      console.log(`[AsyncStorage] No valid data for key "${key}", using default`);
      return defaultValue;
    }
    
    try {
      const parsed = JSON.parse(raw) as T;
      return parsed;
    } catch (parseError) {
      console.error(`[AsyncStorage] ❌ Error parsing data for key "${key}":`, parseError);
      console.error(`[AsyncStorage] Invalid data (first 100 chars):`, raw?.substring(0, 100));
      await AsyncStorage.removeItem(key);
      return defaultValue;
    }
  } catch (error) {
    console.error(`[AsyncStorage] ❌ Error reading key "${key}":`, error);
    return defaultValue;
  }
}

export async function safeSetJSON<T>(key: string, value: T): Promise<void> {
  try {
    const jsonString = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonString);
  } catch (error) {
    console.error(`[AsyncStorage] ❌ Error saving key "${key}":`, error);
  }
}

export async function safeRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[AsyncStorage] ❌ Error removing key "${key}":`, error);
  }
}

export async function clearAllAsyncStorage(): Promise<void> {
  try {
    console.log('[AsyncStorage] 🗑️ Clearing all storage...');
    const keys = await AsyncStorage.getAllKeys();
    console.log(`[AsyncStorage] Found ${keys.length} keys to clear`);
    await AsyncStorage.multiRemove(keys);
    console.log('[AsyncStorage] ✅ All storage cleared');
  } catch (error) {
    console.error('[AsyncStorage] ❌ Error clearing all storage:', error);
    throw error;
  }
}

export async function diagnoseAsyncStorage(): Promise<{ valid: string[], invalid: string[] }> {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log(`[AsyncStorage] Diagnosing ${keys.length} keys...`);
    
    for (const key of keys) {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(key);
        if (!raw) {
          continue;
        }
        
        if (raw === 'undefined' || raw === 'null' || raw === 'object' || raw === '[object Object]') {
          console.log(`[AsyncStorage] ⚠️ Invalid string for key "${key}": ${raw}`);
          invalid.push(key);
          continue;
        }
        
        JSON.parse(raw);
        valid.push(key);
      } catch (parseError) {
        console.error(`[AsyncStorage] ❌ Parse error for key "${key}":`, parseError);
        console.error(`[AsyncStorage] Invalid data (first 100 chars):`, raw?.substring(0, 100));
        invalid.push(key);
      }
    }
    
    console.log(`[AsyncStorage] Diagnosis complete: ${valid.length} valid, ${invalid.length} invalid`);
    return { valid, invalid };
  } catch (error) {
    console.error('[AsyncStorage] ❌ Error diagnosing storage:', error);
    return { valid, invalid };
  }
}

export async function repairAsyncStorage(): Promise<void> {
  try {
    console.log('[AsyncStorage] 🔧 Repairing storage...');
    const { invalid } = await diagnoseAsyncStorage();
    
    if (invalid.length > 0) {
      console.log(`[AsyncStorage] Removing ${invalid.length} invalid keys...`);
      await AsyncStorage.multiRemove(invalid);
      console.log('[AsyncStorage] ✅ Invalid keys removed');
    } else {
      console.log('[AsyncStorage] ✅ No invalid keys found');
    }
  } catch (error) {
    console.error('[AsyncStorage] ❌ Error repairing storage:', error);
    throw error;
  }
}
