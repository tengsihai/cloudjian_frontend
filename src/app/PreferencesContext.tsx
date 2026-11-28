import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { Profile, Theme, UiLang } from '../lib/types';
import { useAuth } from './AuthContext';

const THEME_KEY = ['cloudjian', 'theme'].join('.');

export const DEFAULT_PROFILE: Profile = {
  ui_lang: 'zh-CN',
  tz: 'Asia/Shanghai',
  theme: 'light',
  editor_mode: 'ir',
  list_sort: 'updated',
  page_size: 20,
};

interface PreferencesContextValue {
  profile: Profile;
  loaded: boolean;
  uiLang: UiLang;
  theme: Theme;
  applyTheme: (theme: Theme) => void;
  saveProfile: (patch: Partial<Profile>) => Promise<Profile>;
  refreshProfile: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStoredTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile>(() => ({ ...DEFAULT_PROFILE, theme: readStoredTheme() }));
  const [loaded, setLoaded] = useState(false);

  const applyTheme = useCallback((theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    setProfile((prev) => (prev.theme === theme ? prev : { ...prev, theme }));
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await api.getProfile();
      setProfile(next);
      document.documentElement.dataset.theme = next.theme;
      localStorage.setItem(THEME_KEY, next.theme);
    } catch {
      setProfile((prev) => ({ ...prev, theme: readStoredTheme() }));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    applyTheme(readStoredTheme());
  }, [applyTheme]);

  useEffect(() => {
    if (session) {
      void load();
    } else {
      setLoaded(false);
      setProfile((prev) => ({ ...DEFAULT_PROFILE, theme: prev.theme }));
    }
  }, [session, load]);

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const next = await api.updateProfile(patch);
      setProfile(next);
      if (patch.theme) applyTheme(next.theme);
      return next;
    },
    [applyTheme],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      profile,
      loaded,
      uiLang: profile.ui_lang,
      theme: profile.theme,
      applyTheme,
      saveProfile,
      refreshProfile: load,
    }),
    [profile, loaded, applyTheme, saveProfile, load],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
