import { useState, useEffect, useMemo } from 'react';
import { liveQuery, type Subscription } from 'dexie';
import { db, CycleEntry, AppSettings } from '../services/db';
import {
  getCycleCalculations,
  calculateAverageCycleLength,
  computeCycleDurations,
  formatDate,
} from '../utils/dateUtils';
import { toast } from 'sonner';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  cycleLength: 28,
  periodDuration: 5,
  notificationsEnabled: false,
  dailyReminderEnabled: false,
};

export function useCycle() {
  const [cycles, setCycles] = useState<CycleEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [today, setToday] = useState(() => new Date().setHours(0, 0, 0, 0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let subscription: Subscription | undefined;

    const onError = (error: unknown) => {
      if (!active) return;
      console.error('Failed to load cycle data', error);
      toast.error('Erro ao carregar dados do ciclo');
      setIsLoading(false);
    };

    async function subscribe() {
      // AppShell and Dashboard can mount together on the first visit.
      await db.transaction('rw', db.settings, async () => {
        if (!(await db.settings.get(1))) await db.settings.add(DEFAULT_SETTINGS);
      });
      if (!active) return;

      subscription = liveQuery(() =>
        db.transaction('r', db.cycles, db.settings, async () => ({
          cycles: await db.cycles.orderBy('startDate').reverse().toArray(),
          settings: await db.settings.get(1),
        })),
      ).subscribe({
        next(snapshot) {
          setCycles(snapshot.cycles);
          setSettings({ ...DEFAULT_SETTINGS, ...snapshot.settings });
          setIsLoading(false);
        },
        error: onError,
      });
    }

    void subscribe().catch(onError);
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let timer: number;
    function refreshDay() {
      window.clearTimeout(timer);
      const now = new Date();
      setToday(new Date(now).setHours(0, 0, 0, 0));
      const nextMidnight = new Date(now).setHours(24, 0, 0, 0);
      timer = window.setTimeout(refreshDay, nextMidnight - now.getTime());
    }

    // WebView timers may be suspended while the phone is locked.
    refreshDay();
    document.addEventListener('visibilitychange', refreshDay);
    window.addEventListener('pageshow', refreshDay);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshDay);
      window.removeEventListener('pageshow', refreshDay);
    };
  }, []);

  const avgCycleLength = useMemo(
    () => calculateAverageCycleLength(cycles, settings.cycleLength),
    [cycles, settings.cycleLength],
  );
  const calculations = useMemo(
    () => getCycleCalculations(cycles[0], avgCycleLength, settings.periodDuration, new Date(today)),
    [cycles, avgCycleLength, settings.periodDuration, today],
  );

  const logToday = async (date: Date = new Date()) => {
    const formattedDate = formatDate(date);

    // Check if already exists in the last few days to prevent duplicates
    const recent = cycles.find((c) => {
      const diff =
        Math.abs(new Date(c.startDate).getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff < settings.periodDuration;
    });

    if (recent) {
      toast.error('Já existe um registro recente.');
      return;
    }

    try {
      await db.cycles.add({
        startDate: formattedDate,
        periodDurationDays: settings.periodDuration,
        flowIntensity: 'Médio',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Ciclo registrado com sucesso!');
    } catch (error) {
      toast.error('Erro ao registrar ciclo');
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      await db.cycles.delete(id);
      toast.success('Registro excluído');
    } catch (error) {
      toast.error('Erro ao excluir registro');
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await db.settings.update(1, newSettings);
      toast.success('Configurações atualizadas');
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar configurações');
      return false;
    }
  };

  const clearAllData = async () => {
    try {
      await db.transaction('rw', db.cycles, db.dailyLogs, db.settings, async () => {
        await db.cycles.clear();
        await db.dailyLogs.clear();
        await db.settings.clear();
        await db.settings.add(DEFAULT_SETTINGS);
      });
      toast.success('Todos os dados foram apagados');
    } catch (error) {
      toast.error('Erro ao apagar dados');
    }
  };

  // Sorted oldest → newest durations between consecutive cycles, suitable
  // for feeding into useCyclePrediction.
  const cycleDurations = useMemo(() => computeCycleDurations(cycles), [cycles]);

  return {
    cycles,
    settings,
    calculations,
    isLoading,
    logToday,
    deleteEntry,
    updateSettings,
    clearAllData,
    avgCycleLength,
    cycleDurations,
  };
}
