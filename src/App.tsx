import { useEffect } from 'react';
import { Switch, Route, Router as WouterRouter } from 'wouter';
import { Toaster, toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { BottomNav } from '@/components/ui/bottom-nav';
import { PrivacyNotice } from '@/components/PrivacyNotice';
import { InstallPrompt } from '@/components/InstallPrompt';
import { AppMetaProvider, useAppMetaContext } from '@/context/AppMetaContext';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useNotificationScheduler } from '@/hooks/useNotificationScheduler';
import { useCycle } from '@/hooks/useCycle';
import {
  isAndroidWebView,
  setAndroidNotificationsEnabled,
  setAndroidDailyReminder,
  scheduleAndroidCyclePrediction,
} from '@/native/androidBridge';
import { formatDate } from '@/utils/dateUtils';

import Dashboard from '@/pages/Dashboard';
import CalendarPage from '@/pages/Calendar';
import HistoryPage from '@/pages/History';
import SettingsPage from '@/pages/Settings';
import DailyLogPage from '@/pages/DailyLog';
import EducationPage from '@/pages/Education';
import NotFound from '@/pages/not-found';

function AppShell() {
  const { privacySeen, acknowledgePrivacy } = useAppMetaContext();

  // SW update notification — when a new version is cached, offer one-click reload
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      r && setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  // A mesma configuração alimenta o fallback web e o agendamento nativo Android.
  const { settings: cycleSettings, calculations, isLoading: cycleSettingsLoading } = useCycle();
  const dailyReminderActive =
    !cycleSettingsLoading &&
    cycleSettings.notificationsEnabled &&
    Boolean(cycleSettings.dailyReminderEnabled);
  useNotificationScheduler(dailyReminderActive);

  useEffect(() => {
    if (!isAndroidWebView() || cycleSettingsLoading) return;
    void Promise.all([
      setAndroidNotificationsEnabled(cycleSettings.notificationsEnabled),
      setAndroidDailyReminder(
        cycleSettings.notificationsEnabled && Boolean(cycleSettings.dailyReminderEnabled),
        6,
        0,
      ),
      scheduleAndroidCyclePrediction(
        cycleSettings.notificationsEnabled && calculations
          ? formatDate(calculations.nextPeriodDate)
          : null,
      ),
    ]).catch(() => {
      // Native permission may still need to be granted from Settings.
    });
  }, [
    cycleSettings.notificationsEnabled,
    cycleSettings.dailyReminderEnabled,
    cycleSettingsLoading,
    calculations?.nextPeriodDate?.getTime(),
  ]);

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível', {
        description: 'Toque para atualizar o app.',
        action: { label: 'Atualizar', onClick: () => updateServiceWorker(true) },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  const showPrivacy = !privacySeen;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 selection:bg-primary selection:text-primary-foreground font-sans">
      {/* Non-intrusive install banner */}
      <InstallPrompt />

      {/* Routes */}
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/daily" component={DailyLogPage} />
        <Route path="/guide" component={EducationPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>

      <BottomNav />

      {/* One-time overlays — rendered after the page so they sit on top */}
      <PrivacyNotice visible={showPrivacy} onAcknowledge={acknowledgePrivacy} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <TooltipProvider>
        <AppMetaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AppShell />
          </WouterRouter>
        </AppMetaProvider>
        <Toaster position="top-center" toastOptions={{ className: 'rounded-2xl' }} />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
