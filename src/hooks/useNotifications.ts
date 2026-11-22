import { useEffect } from "react";
import { CycleCalculations } from "../utils/dateUtils";
import {
  isAndroidWebView,
  requestNotificationPermission,
  showAndroidNotification,
} from "../native/androidBridge";

const PERIODIC_SYNC_TAG = "dd-cycle-check";

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useNotifications(calculations: CycleCalculations | null, enabled: boolean) {
  /**
   * Notificações em primeiro plano.
   * O APK usa o sistema de notificações Android; navegador/PWA usa a Notification API.
   */
  useEffect(() => {
    if (!enabled || !calculations) return;

    const checkAndNotify = async () => {
      const today = localDateKey();
      if (localStorage.getItem("lastNotificationCheck") === today) return;

      const granted = await requestNotificationPermission();
      if (!granted) return;

      if (calculations.daysUntilNextPeriod <= 3 && calculations.daysUntilNextPeriod >= 0) {
        const message = `Sua próxima menstruação está prevista para daqui a ${calculations.daysUntilNextPeriod} dias. Abra o Diário Dela para conferir.`;
        if (isAndroidWebView()) {
          await showAndroidNotification("DD • Diário Dela", message);
        } else if ("Notification" in window && Notification.permission === "granted") {
          new Notification("DD", {
            body: message,
            icon: "/pwa-192x192.svg",
          });
        }
      }

      localStorage.setItem("lastNotificationCheck", today);
    };

    void checkAndNotify().catch(() => {
      // A indisponibilidade do recurso de notificação não deve interromper a interface.
    });
  }, [calculations, enabled]);

  /**
   * O APK usa AlarmManager para lembretes de previsão.
   * No navegador, o registro de Background Sync continua sendo opcional.
   */
  useEffect(() => {
    if (isAndroidWebView() || !("serviceWorker" in navigator)) return;

    const updateSync = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const syncManager = (registration as ServiceWorkerRegistration & {
          periodicSync?: {
            register: (tag: string, options: { minInterval: number }) => Promise<void>;
            unregister: (tag: string) => Promise<void>;
          };
        }).periodicSync;

        if (!syncManager) return;
        if (enabled) {
          await syncManager.register(PERIODIC_SYNC_TAG, { minInterval: 24 * 60 * 60 * 1000 });
        } else {
          await syncManager.unregister(PERIODIC_SYNC_TAG).catch(() => undefined);
        }
      } catch {
        // Periodic Background Sync não é suportado por todos os navegadores.
      }
    };

    void updateSync();
  }, [enabled]);
}
