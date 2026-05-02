import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { BottomNav } from "@/components/ui/bottom-nav";
import { PrivacyNotice } from "@/components/PrivacyNotice";
import { UsernameModal } from "@/components/UsernameModal";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AppMetaProvider, useAppMetaContext } from "@/context/AppMetaContext";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";

import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/Calendar";
import HistoryPage from "@/pages/History";
import SettingsPage from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function AppShell() {
  const { userName, privacySeen, saveName, acknowledgePrivacy } = useAppMetaContext();

  // SW update notification — when a new version is cached, offer one-click reload
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) { r && setInterval(() => r.update(), 60 * 60 * 1000); },
  });

  // Daily 6 AM notification scheduler (enabled state is now managed by useCycle and passed down)
  // This hook is now primarily for scheduling the local setTimeout fallback.
  useNotificationScheduler(true); // Always enable local scheduling, its internal logic will check permissions/settings

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível', {
        description: 'Toque para atualizar o app.',
        action: { label: 'Atualizar', onClick: () => updateServiceWorker(true) },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  // Step 1 — show privacy notice until acknowledged.
  // Step 2 — after privacy is seen, show username modal if name is blank.
  const showPrivacy = !privacySeen;
  const showUsername = privacySeen && !userName;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 selection:bg-primary selection:text-primary-foreground font-sans">
      {/* Non-intrusive install banner */}
      <InstallPrompt />

      {/* Routes */}
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>

      <BottomNav />

      {/* One-time overlays — rendered after the page so they sit on top */}
      <PrivacyNotice visible={showPrivacy} onAcknowledge={acknowledgePrivacy} />
      <UsernameModal visible={showUsername} onSave={saveName} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <TooltipProvider>
        <AppMetaProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell />
          </WouterRouter>
        </AppMetaProvider>
        <Toaster position="top-center" toastOptions={{ className: "rounded-2xl" }} />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
