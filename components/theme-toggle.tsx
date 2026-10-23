'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" strokeWidth={2.2} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2.2} />
      )}
    </button>
  );
}
