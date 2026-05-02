import { useEffect, useRef } from 'react';

export const DAILY_NOTIF_LS_KEY = 'ciclo_daily_notif_enabled';
const LS_SENT_KEY = 'ciclo_daily_notif_date';
const PERIODIC_SYNC_TAG = 'ciclo-daily-6am';
export const CHANGE_EVENT = 'ciclo-daily-notif-changed';

export function isDailyNotifEnabled(): boolean {
  return localStorage.getItem(DAILY_NOTIF_LS_KEY) === '1';
}

export async function setDailyNotifEnabled(enabled: boolean): Promise<void> {
  localStorage.setItem(DAILY_NOTIF_LS_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled } }));

  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const syncMgr = (reg as any).periodicSync;
    if (syncMgr) {
      if (enabled) {
        await syncMgr.register(PERIODIC_SYNC_TAG, { minInterval: 12 * 60 * 60 * 1000 });
      } else {
        await syncMgr.unregister(PERIODIC_SYNC_TAG).catch(() => {});
      }
    }
  } catch { /* periodicSync not available */ }
}

function msUntilNext6AM(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function alreadySentToday(): boolean {
  return localStorage.getItem(LS_SENT_KEY) === new Date().toISOString().split('T')[0];
}

async function sendViaSW(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({ type: 'SEND_DAILY_REMINDER' });
      return;
    }
  } catch { /* SW unavailable */ }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Ciclo', {
      body: 'Bom dia! Abra o Ciclo para acompanhar seu ciclo menstrual.',
      icon: '/pwa-192x192.svg',
      tag: 'ciclo-daily',
    });
  }
}

function markSentToday() {
  localStorage.setItem(LS_SENT_KEY, new Date().toISOString().split('T')[0]);
}

/**
 * Schedules the daily 6 AM reminder.
 *
 * Behaviour by scenario:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Scenario                │ Action                                 │
 * ├─────────────────────────┼────────────────────────────────────────┤
 * │ Toggle just activated   │ Fire IMMEDIATELY (first confirmation)  │
 * │                         │ + schedule next 6 AM                   │
 * ├─────────────────────────┼────────────────────────────────────────┤
 * │ App opened, past 6 AM,  │ Fire now (missed reminder recovery)    │
 * │ not sent today          │ + schedule next 6 AM                   │
 * ├─────────────────────────┼────────────────────────────────────────┤
 * │ App opened, before 6 AM │ Only schedule next 6 AM                │
 * │ or already sent today   │                                        │
 * ├─────────────────────────┼────────────────────────────────────────┤
 * │ Toggle disabled         │ Clear pending timeout                  │
 * └─────────────────────────┴────────────────────────────────────────┘
 */
export function useNotificationScheduler(enabled: boolean) {
  const wasEnabledRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled) {
      wasEnabledRef.current = false;
      return;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      wasEnabledRef.current = enabled;
      return;
    }

    const justActivated = wasEnabledRef.current === false || wasEnabledRef.current === null;
    wasEnabledRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isDailyNotifEnabled()) return;
        if (!alreadySentToday()) {
          markSentToday();
          sendViaSW();
        }
        scheduleNext();
      }, msUntilNext6AM());
    }

    if (justActivated) {
      // User just activated the toggle → fire immediately as first confirmation
      markSentToday();
      sendViaSW();
    } else if (new Date().getHours() >= 6 && !alreadySentToday()) {
      // App opened after 6 AM with missed notification → recover
      markSentToday();
      sendViaSW();
    }

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [enabled]);
}
