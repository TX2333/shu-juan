// 设置管理：使用 AsyncStorage 持久化用户偏好
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'shujuan_settings';

export interface AppSettings {
  fontSize: number;       // 字体大小 16-28
  theme: 'light' | 'dark';
  speechRate: number;     // 语速 0.5-2.0
  immersiveMode: boolean; // 沉浸模式
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 20,
  theme: 'light',
  speechRate: 1.0,
  immersiveMode: true,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}