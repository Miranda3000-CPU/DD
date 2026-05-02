/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// --- Inject precache manifest (filled by vite-plugin-pwa at build time) ---
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// --- SPA Navigation: Network-first, fallback to cache when offline ---
// This handles all page navigations and serves cached HTML when the user is offline.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'ciclo-pages-v1',
      networkTimeoutSeconds: 3,
      plugins: [new CacheableResponsePlugin({ statuses: [200] })],
    }),
    { denylist: [/^\/api\//] }
  )
);

// --- Static assets: Cache-first (images, fonts, icons) ---
registerRoute(
  ({ request }) =>
    request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'ciclo-assets-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// -------------------------------------------------------------------
// Daily 6 AM Notification
// -------------------------------------------------------------------

// 1. Periodic Background Sync (Chrome/Android — runs even when app is closed)
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'ciclo-daily-6am') {
    event.waitUntil(sendDailyReminderIfNeeded());
  }
});

// 2. On-demand trigger from main thread (fallback: setTimeout in app)
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SEND_DAILY_REMINDER') {
    event.waitUntil(sendDailyReminderIfNeeded());
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function sendDailyReminderIfNeeded() {
  if (Notification.permission !== 'granted') return;

  // Deduplicate: only one notification per calendar day
  const today = new Date().toISOString().split('T')[0];
  const key = 'ciclo-daily-notif-date';
  const last = await getMetaValue(key);
  if (last === today) return;

  await self.registration.showNotification('DD', {
    body: 'Bom dia! Abra o DD para acompanhar seu ciclo menstrual.',
    icon: 'pwa-192x192.svg',
    badge: 'pwa-192x192.svg',
    tag: 'ciclo-daily',
    data: { url: self.registration.scope },
  });

  await setMetaValue(key, today);
}

// Tiny key-value store inside a dedicated cache (avoids IndexedDB in SW)
async function getMetaValue(key: string): Promise<string | null> {
  try {
    const cache = await caches.open('ciclo-meta-v1');
    const res = await cache.match(`/__meta__/${key}`);
    return res ? res.text() : null;
  } catch {
    return null;
  }
}

async function setMetaValue(key: string, value: string): Promise<void> {
  try {
    const cache = await caches.open('ciclo-meta-v1');
    await cache.put(`/__meta__/${key}`, new Response(value));
  } catch {
    // ignore
  }
}

// --- Open app when user taps notification ---
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? self.registration.scope;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.startsWith(self.registration.scope));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
  );
});
