import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/lib/settings';
import { loadSettings, saveSettings } from '@/lib/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: { fontSize: 20, theme: 'light', speechRate: 1.0, immersiveMode: true },
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    fontSize: 20,
    theme: 'light',
    speechRate: 1.0,
    immersiveMode: true,
  });

  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
    })();
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);