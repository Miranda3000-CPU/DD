import { useCycle } from '../hooks/useCycle';
import { PageTransition } from '../components/layout/PageTransition';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Trash2, Bell, Calendar as CalendarIcon, Clock, AlarmClock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { isDailyNotifEnabled, setDailyNotifEnabled } from '../hooks/useNotificationScheduler';

export default function SettingsPage() {
  const { settings, updateSettings, clearAllData, isLoading } = useCycle();
  const [localSettings, setLocalSettings] = useState(settings);
  const { theme, setTheme } = useTheme();
  const [dailyNotif, setDailyNotif] = useState(isDailyNotifEnabled);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Keep dailyNotif in sync if notifications are disabled externally
  useEffect(() => {
    if (!localSettings.notificationsEnabled && dailyNotif) {
      setDailyNotifEnabled(false);
      setDailyNotif(false);
    }
  }, [localSettings.notificationsEnabled, dailyNotif]);

  const handleSave = () => {
    updateSettings({
      cycleLength: Number(localSettings.cycleLength),
      periodDuration: Number(localSettings.periodDuration),
    });
  };

  /** Toggle global notifications. If turning off, also disable daily reminder. */
  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setLocalSettings((prev) => ({ ...prev, notificationsEnabled: false }));
        return;
      }
    }

    if (!enabled && dailyNotif) {
      // Turn off daily reminder when notifications are disabled
      await setDailyNotifEnabled(false);
      setDailyNotif(false);
    }

    updateSettings({ notificationsEnabled: enabled });
    setLocalSettings((prev) => ({ ...prev, notificationsEnabled: enabled }));
  };

  /** Toggle daily 6 AM reminder. Fires a first notification immediately on activation. */
  const handleDailyNotifToggle = async (enabled: boolean) => {
    if (enabled) {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      }
    }
    await setDailyNotifEnabled(enabled);
    setDailyNotif(enabled);
  };

  const dailyDisabled = !localSettings.notificationsEnabled;

  return (
    <PageTransition className="pb-24 pt-6 px-6 max-w-md mx-auto min-h-screen">
      <header className="mb-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          Configurações
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground"
        >
          Personalize seu aplicativo
        </motion.p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Card className="h-32 animate-pulse bg-muted/50 border-none" />
          <Card className="h-24 animate-pulse bg-muted/50 border-none" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Cycle settings ─────────────────────────────────── */}
          <Card className="rounded-2xl border border-border/50 shadow-sm bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Duração do ciclo</Label>
                      <p className="text-xs text-muted-foreground">Dias entre menstruações</p>
                    </div>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={localSettings.cycleLength}
                      onChange={(e) => setLocalSettings({ ...localSettings, cycleLength: Number(e.target.value) })}
                      onBlur={handleSave}
                      className="text-center rounded-xl bg-muted/50 border-transparent focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">Duração da menstruação</Label>
                      <p className="text-xs text-muted-foreground">Média de dias de fluxo</p>
                    </div>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={localSettings.periodDuration}
                      onChange={(e) => setLocalSettings({ ...localSettings, periodDuration: Number(e.target.value) })}
                      onBlur={handleSave}
                      className="text-center rounded-xl bg-muted/50 border-transparent focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Notification settings ───────────────────────────── */}
          <Card className="rounded-2xl border border-border/50 shadow-sm bg-card">
            <CardContent className="p-6 space-y-6">
              {/* Master notifications toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#9b5de5]/10 flex items-center justify-center text-[#9b5de5]">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="text-base font-medium cursor-pointer" htmlFor="notifications">
                      Notificações
                    </Label>
                    <p className="text-xs text-muted-foreground">Lembrete antes da menstruação</p>
                  </div>
                </div>
                <Switch
                  id="notifications"
                  checked={localSettings.notificationsEnabled}
                  onCheckedChange={handleNotificationsToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="h-px bg-border/50" />

              {/* Daily 6 AM — disabled unless notifications are on */}
              <div className={`flex items-center justify-between transition-opacity ${dailyDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <AlarmClock className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="text-base font-medium cursor-pointer" htmlFor="daily-notif">
                      Lembrete diário
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {dailyDisabled
                        ? 'Ative Notificações primeiro'
                        : 'Notificação às 06h da manhã'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="daily-notif"
                  checked={dailyNotif}
                  disabled={dailyDisabled}
                  onCheckedChange={handleDailyNotifToggle}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="h-px bg-border/50" />

              {/* Dark mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  </div>
                  <div>
                    <Label className="text-base font-medium">Modo Escuro</Label>
                    <p className="text-xs text-muted-foreground">Alternar tema visual</p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Danger zone ────────────────────────────────────── */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 h-14"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Apagar todos os dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl max-w-[90vw]">
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os seus ciclos registrados serão apagados
                  permanentemente do seu dispositivo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                <AlertDialogCancel className="rounded-xl h-12 w-full mt-0">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearAllData}
                  className="rounded-xl h-12 w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Sim, apagar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </PageTransition>
  );
}
