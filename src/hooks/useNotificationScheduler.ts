import { useEffect } from "react";
import {
  isAndroidWebView,
  showAndroidNotification,
} from "../native/androidBridge";

const LS_SENT_KEY = "ciclo_daily_notif_date";
const PERIODIC_SYNC_TAG = "ciclo-daily-6am";

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function msUntilNext6AM(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function markSentToday(): void {
  localStorage.setItem(LS_SENT_KEY, localDateKey());
}

export async function sendDailyReminderNow(): Promise<void> {
  if (isAndroidWebView()) {
    await showAndroidNotification(
      "DD • Diário Dela",
      "Bom dia! Reserve um momento para registrar como você está se sentindo.",
    );
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: "SEND_DAILY_REMINDER" });
      return;
    }
  } catch {
    // Fall through to the browser Notification API.
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("DD • Diário Dela", {
      body: "Bom dia! Reserve um momento para registrar como você está se sentindo.",
      icon: "/pwa-192x192.svg",
      tag: "ciclo-daily",
    });
  }
}

export async function updatePeriodicSync(shouldEnable: boolean): Promise<void> {
  if (isAndroidWebView() || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as ServiceWorkerRegistration & {
      periodicSync?: {
        register: (tag: string, options: { minInterval: number }) => Promise<void>;
        unregister: (tag: string) => Promise<void>;
      };
    }).periodicSync;

    if (!periodicSync) return;
    if (shouldEnable) {
      await periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: 24 * 60 * 60 * 1000 });
    } else {
      await periodicSync.unregister(PERIODIC_SYNC_TAG).catch(() => undefined);
    }
  } catch {
    // Periodic Background Sync is optional and not supported by every browser.
  }
}

/** Schedules the web fallback only when both notification settings are enabled. */
export function useNotificationScheduler(enabled: boolean): void {
  useEffect(() => {
    if (isAndroidWebView()) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (!enabled) {
      void updatePeriodicSync(false);
      return;
    }

    const scheduleNext = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      timeoutId = setTimeout(async () => {
        if (localStorage.getItem(LS_SENT_KEY) !== localDateKey()) {
          markSentToday();
          await sendDailyReminderNow();
        }
        scheduleNext();
      }, msUntilNext6AM());
    };

    scheduleNext();
    void updatePeriodicSync(true);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled]);
}
