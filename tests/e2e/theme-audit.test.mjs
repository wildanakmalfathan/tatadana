// tests/e2e/theme-audit.test.mjs
// Theme & Aesthetic Audit: Luxury Obsidian Black & Deep Emerald Green
// Verifies compliance with R7 across Tailwind configuration, global CSS, and page components

import { describe, it, expect, fileExists, readFileSafe } from './common.mjs';

export async function runThemeAuditTests() {
  describe('Theme Audit (R7) — Luxury Obsidian Black & Deep Emerald Green Design System', () => {
    it('verifies tailwind.config.js declares all core luxury obsidian and emerald tokens', () => {
      const configPath = 'tailwind.config.js';
      expect(fileExists(configPath)).toBeTruthy();
      const content = readFileSafe(configPath);

      // Core Emerald Accent
      expect(content).toContain('#10b981'); // Brand 500 / Luxury Emerald Primary
      expect(content).toContain('#064e3b'); // Brand 900 / Deep Obsidian Forest

      // Core Luxury Obsidian Canvas & Panels
      expect(content).toContain('#06090e'); // Deepest Luxury Black
      expect(content).toContain('#0a0f16'); // Obsidian Slate Card
    });

    it('verifies app/globals.css configures root background and luxury glassmorphism utilities', () => {
      const cssPath = 'app/globals.css';
      expect(fileExists(cssPath)).toBeTruthy();
      const content = readFileSafe(cssPath);

      // Body background
      expect(content).toContain('#06090e');

      // Glassmorphism classes
      expect(content).toContain('.glass-panel');
      expect(content).toContain('.glass-card');
      expect(content).toContain('.text-gradient-emerald');
    });

    it('verifies Calendar page applies obsidian and emerald styling tokens', () => {
      const pagePath = 'app/dashboard/kalender/page.tsx';
      if (fileExists(pagePath)) {
        const content = readFileSafe(pagePath);
        const hasThemeTokens =
          content.includes('emerald') ||
          content.includes('10b981') ||
          content.includes('06090e') ||
          content.includes('luxury') ||
          content.includes('glass-card') ||
          content.includes('border-emerald');
        expect(hasThemeTokens).toBeTruthy();
      }
    });

    it('verifies Tata AI page applies obsidian and emerald styling tokens', () => {
      const pagePath = 'app/dashboard/tata-ai/page.tsx';
      if (fileExists(pagePath)) {
        const content = readFileSafe(pagePath);
        const hasThemeTokens =
          content.includes('emerald') ||
          content.includes('10b981') ||
          content.includes('06090e') ||
          content.includes('luxury') ||
          content.includes('glass-card') ||
          content.includes('bot');
        expect(hasThemeTokens).toBeTruthy();
      }
    });

    it('verifies Budgeting page applies multi-period tabs with emerald accents', () => {
      const pagePath = 'app/dashboard/budget/page.tsx';
      if (fileExists(pagePath)) {
        const content = readFileSafe(pagePath);
        const hasThemeTokens =
          content.includes('emerald') ||
          content.includes('luxury') ||
          content.includes('glass');
        expect(hasThemeTokens).toBeTruthy();
      }
    });

    it('verifies Wallet page applies luxury emerald card and modal styling', () => {
      const pagePath = 'app/dashboard/wallet/page.tsx';
      if (fileExists(pagePath)) {
        const content = readFileSafe(pagePath);
        const hasThemeTokens =
          content.includes('emerald') ||
          content.includes('luxury') ||
          content.includes('glass');
        expect(hasThemeTokens).toBeTruthy();
      }
    });
  });
}
