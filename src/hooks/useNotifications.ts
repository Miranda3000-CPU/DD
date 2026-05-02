import { useEffect } from 'react';
import { CycleCalculations } from '../utils/dateUtils';

export function useNotifications(calculations: CycleCalculations | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !calculations || !('Notification' in window)) return;

    const checkAndNotify = async () => {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        const lastCheck = localStorage.getItem('lastNotificationCheck');
        const today = new Date().toISOString().split('T')[0];

        if (lastCheck !== today) {
          if (calculations.daysUntilNextPeriod <= 3 && calculations.daysUntilNextPeriod >= 0) {
            new Notification('Ciclo', {
              body: `Sua próxima menstruação está prevista para daqui a ${calculations.daysUntilNextPeriod} dias.`,
              icon: '/pwa-192x192.svg'
            });
          }
          localStorage.setItem('lastNotificationCheck', today);
        }
      }
    };

    checkAndNotify();
  }, [calculations, enabled]);
}
