'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

/**
 * Yorug'/qorong'i tema tugmasi.
 * Kichik, lekin sensorli ekranda bosish uchun yetarli (44x44 px).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Yorug' temaga o'tish" : "Qorong'i temaga o'tish"}
      className={`glass relative flex h-11 w-11 items-center justify-center rounded-md text-ink-muted transition-colors hover:text-ink ${className ?? ''}`}
    >
      <motion.span
        key={isDark ? 'moon' : 'sun'}
        initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex"
      >
        {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
      </motion.span>
    </button>
  );
}
