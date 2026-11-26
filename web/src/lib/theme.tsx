import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'classx_theme';
export const DEFAULT_THEME: Theme = 'light';

const THEME_COLORS: Record<Theme, string> = {
  light: '#FAF9F6',
  dark: '#FAF9F6',
};

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const resolved: Theme = theme === 'dark' ? 'light' : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = 'light';
  if (document.body) document.body.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  const persist = useCallback((next: Theme) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const normalized: Theme = next === 'dark' ? 'light' : next;
    setThemeState(normalized);
    persist(normalized);
  }, [persist]);

  const toggleTheme = useCallback(() => {
    setThemeState(() => {
      const next: Theme = 'light';
      persist(next);
      return next;
    });
  }, [persist]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isTheme(event.newValue)) {
        setThemeState(event.newValue === 'dark' ? 'light' : event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
