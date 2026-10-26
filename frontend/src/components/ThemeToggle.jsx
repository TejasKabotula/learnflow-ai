import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-lg transition-colors ${
          theme === 'light' 
            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' 
            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
        title="Light Mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-lg transition-colors ${
          theme === 'system' 
            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' 
            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
        title="System Preference"
      >
        <Monitor size={14} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-lg transition-colors ${
          theme === 'dark' 
            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' 
            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
        }`}
        title="Dark Mode"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
