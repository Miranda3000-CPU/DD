import { useEffect } from 'react';
import { CycleCalculations } from '../utils/dateUtils';
import { isAndroidWebView, showAndroidNotification } from '../native/androidBridge';

const PERIODIC_SYNC_TAG = 'dd-cycle-check';

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useNotifications(calculations: CycleCalculations | null, enabled: boolean) {
  /**
   * Notificações em primeiro plano.
   * A permissão é solicitada explicitamente em Configurações, não na montagem
   * automática da tela. Aqui somente notificamos quando ela já foi concedida.
   */
  useEffect(() => {
    if (!enabled || !calculations) return;

    const checkAndNotify = async () => {
      const today = localDateKey();
      if (localStorage.getItem('lastNotificationCheck') === today) return;

      const message = `Sua próxima menstruação está prevista para daqui a ${calculations.daysUntilNextPeriod} dias. Abra o Diário Dela para conferir.`;
      if (calculations.daysUntilNextPeriod < 0 || calculations.daysUntilNextPeriod > 3) return;

      if (isAndroidWebView()) {
        await showAndroidNotification('DD • Diário Dela', message);
        localStorage.setItem('lastNotificationCheck', today);
        return;
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('DD', {
          body: message,
          icon: '/pwa-192x192.svg',
        });
        localStorage.setItem('lastNotificationCheck', today);
      }
    };

    void checkAndNotify().catch(() => {
      // Permissão negada ou indisponibilidade de notificação não interrompe a interface.
    });
  }, [calculations, enabled]);

  /**
   * O APK usa AlarmManager para lembretes de previsão.
   * No navegador, o registro de Background Sync continua sendo opcional.
   */
  useEffect(() => {
    if (isAndroidWebView() || !('serviceWorker' in navigator)) return;

    const updateSync = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const syncManager = (
          registration as ServiceWorkerRegistration & {
            periodicSync?: {
              register: (tag: string, options: { minInterval: number }) => Promise<void>;
              unregister: (tag: string) => Promise<void>;
            };
          }
        ).periodicSync;

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
