import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, CycleEntry, AppSettings } from '../services/db';
import { getCycleCalculations, calculateAverageCycleLength, computeCycleDurations, CycleCalculations, formatDate } from '../utils/dateUtils';
import { toast } from 'sonner';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  cycleLength: 28,
  periodDuration: 5,
  notificationsEnabled: false
};

export function useCycle() {
  const [cycles, setCycles] = useState<CycleEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [calculations, setCalculations] = useState<CycleCalculations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const loadedCycles = await db.cycles.orderBy('startDate').reverse().toArray();
      setCycles(loadedCycles);

      let loadedSettings = await db.settings.get(1);
      if (!loadedSettings) {
        await db.settings.add(DEFAULT_SETTINGS);
        loadedSettings = DEFAULT_SETTINGS;
      }
      setSettings(loadedSettings);

      if (loadedCycles.length > 0) {
        const avgLength = calculateAverageCycleLength(loadedCycles, loadedSettings.cycleLength);
        const calc = getCycleCalculations(loadedCycles[0], avgLength, loadedSettings.periodDuration);
        setCalculations(calc);
      } else {
        setCalculations(null);
      }
    } catch (error) {
      console.error("Failed to load cycle data", error);
      toast.error('Erro ao carregar dados do ciclo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const logToday = async (date: Date = new Date()) => {
    const formattedDate = formatDate(date);
    
    // Check if already exists in the last few days to prevent duplicates
    const recent = cycles.find(c => {
      const diff = Math.abs(new Date(c.startDate).getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diff < settings.periodDuration;
    });

    if (recent) {
      toast.error('Já existe um registro recente.');
      return;
    }

    try {
      await db.cycles.add({
        startDate: formattedDate,
        createdAt: new Date().toISOString()
      });
      toast.success('Ciclo registrado com sucesso!');
      await loadData();
    } catch (error) {
      toast.error('Erro ao registrar ciclo');
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      await db.cycles.delete(id);
      toast.success('Registro excluído');
      await loadData();
    } catch (error) {
      toast.error('Erro ao excluir registro');
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await db.settings.update(1, newSettings);
      await loadData();
      toast.success('Configurações atualizadas');
    } catch (error) {
      toast.error('Erro ao atualizar configurações');
    }
  };

  const clearAllData = async () => {
    try {
      await db.cycles.clear();
      await db.settings.clear();
      await db.settings.add(DEFAULT_SETTINGS);
      await loadData();
      toast.success('Todos os dados foram apagados');
    } catch (error) {
      toast.error('Erro ao apagar dados');
    }
  };

  // Sorted oldest → newest durations between consecutive cycles, suitable
  // for feeding into useCyclePrediction.
  const cycleDurations = useMemo(
    () => computeCycleDurations(cycles),
    [cycles]
  );

  return {
    cycles,
    settings,
    calculations,
    isLoading,
    logToday,
    deleteEntry,
    updateSettings,
    clearAllData,
    avgCycleLength: calculateAverageCycleLength(cycles, settings.cycleLength),
    cycleDurations,
  };
}
