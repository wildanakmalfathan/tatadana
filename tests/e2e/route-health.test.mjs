// tests/e2e/route-health.test.mjs
// Route Health & HTTP 200 Acceptance Test
// Verifies all core routes:
// 1. /dashboard/kalender
// 2. /dashboard/tata-ai
// 3. /dashboard/wallet
// 4. /dashboard/budget
// 5. /admin/payments
// 6. /admin/users

import { describe, it, expect, isServerOnline, fileExists, readFileSafe } from './common.mjs';

export async function runRouteHealthTests() {
  const serverUp = await isServerOnline('http://localhost:3000');

  describe('Route Health & Acceptance (Dual-Track HTTP 200 / Static Verification)', () => {
    const requiredRoutes = [
      { url: '/dashboard/kalender', filePath: 'app/dashboard/kalender/page.tsx', name: 'Kalender Keuangan (R1)' },
      { url: '/dashboard/tata-ai', filePath: 'app/dashboard/tata-ai/page.tsx', name: 'Tata AI Chat Assistant (R2)' },
      { url: '/dashboard/wallet', filePath: 'app/dashboard/wallet/page.tsx', name: 'Multi-Wallet Management (R3)' },
      { url: '/dashboard/budget', filePath: 'app/dashboard/budget/page.tsx', name: 'Multi-Period Budgeting (R5)' },
      { url: '/dashboard/settings', filePath: 'app/dashboard/settings/page.tsx', name: 'Settings & Telegram Auto-Poller (R2)' },
      { url: '/api/telegram/poll?timeout=0', filePath: 'app/api/telegram/poll/route.ts', name: 'Telegram Long Polling Endpoint (R1)' },
      { url: '/api/telegram/setup-bot', filePath: 'app/api/telegram/setup-bot/route.ts', name: 'Telegram Bot Setup & Webhook Cleanup API (R1)' },
      { url: '/admin/payments', filePath: 'app/admin/payments/page.tsx', name: 'Admin Payments Approval (R6)' },
      { url: '/admin/users', filePath: 'app/admin/users/page.tsx', name: 'Admin Users Management (R6)' },
    ];

    for (const route of requiredRoutes) {
      it(`verifies route health for ${route.url} [${route.name}]`, async () => {
        if (serverUp) {
          // Track A: Live HTTP Probe
          const res = await fetch(`http://localhost:3000${route.url}`, {
            headers: {
              'User-Agent': 'TataDana-E2E-Verifier/1.0',
            },
            redirect: 'manual',
          });

          // In Next.js, protected dashboard/admin routes may return 200 OK or 307 redirect to login; API endpoints return < 500
          const isHealthy = res.status === 200 || res.status === 307 || res.status === 308 || (route.url.startsWith('/api') && res.status < 500);
          expect(isHealthy).toBeTruthy();
        } else {
          // Track B: Static Route File & Component Verification
          const exists = fileExists(route.filePath);
          expect(exists).toBeTruthy();
          const content = readFileSafe(route.filePath);
          const hasExport = content.includes('export default') || content.includes('export async function') || content.includes('export function');
          expect(hasExport).toBeTruthy();
        }
      });
    }
  });
}
