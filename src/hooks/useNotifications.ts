import { useEffect } from 'react';
import { CycleCalculations } from '../utils/dateUtils';

const PERIODIC_SYNC_TAG = 'dd-cycle-check';

export function useNotifications(calculations: CycleCalculations | null, enabled: boolean) {
  /**
   * Notificações em primeiro plano (quando o app está aberto)
   */
  useEffect(() => {
    if (!enabled || !calculations || !('Notification' in window)) return;

    const checkAndNotify = async () => {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }

      if (Notification.permission === 'granted') {
        const lastCheck = localStorage.getItem('lastNotificationCheck');
        const today = new Date().toISOString().split('T')[0];

        if (lastCheck !== today) {
          if (calculations.daysUntilNextPeriod <= 3 && calculations.daysUntilNextPeriod >= 0) {
            new Notification('DD', {
              body: `Sua próxima menstruação está prevista para daqui a ${calculations.daysUntilNextPeriod} dias. Abra o Diário Dela para conferir.`,
              icon: '/pwa-192x192.svg'
            });
          }
          localStorage.setItem('lastNotificationCheck', today);
        }
      }
    };

    checkAndNotify();
  }, [calculations, enabled]);

  /**
   * Registro do Periodic Background Sync (Workbox)
   * Permite que o Service Worker acorde em segundo plano para checar o ciclo.
   */
  useEffect(() => {
    const updateSync = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const syncMgr = (reg as any).periodicSync;
        if (syncMgr) {
          if (enabled) {
            // Tenta registrar a tarefa para rodar uma vez por dia (mínimo de 24h)
            await syncMgr.register(PERIODIC_SYNC_TAG, { minInterval: 24 * 60 * 60 * 1000 });
          } else {
            await syncMgr.unregister(PERIODIC_SYNC_TAG).catch(() => {});
          }
        }
      } catch { /* Navegador não suporta PeriodicSync */ }
    };
    updateSync();
  }, [enabled]);
}
