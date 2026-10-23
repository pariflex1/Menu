'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export type UserTheme = 'light' | 'dark';

export const USER_THEME_KEY = 'ka_user_theme';

interface ThemeContextValue {
  theme: UserTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

function isCustomerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return !pathname.startsWith('/login') && !pathname.startsWith('/dashboard');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<UserTheme>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_THEME_KEY);
      if (stored === 'dark') setTheme('dark');
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isCustomerRoute(pathname)) {
      root.classList.toggle('dark', theme === 'dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme === 'dark' && isCustomerRoute(pathname) ? 'dark' : 'light';
  }, [theme, pathname]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === USER_THEME_KEY) {
        setTheme(event.newValue === 'dark' ? 'dark' : 'light');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: UserTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(USER_THEME_KEY, next);
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
