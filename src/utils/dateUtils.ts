import { differenceInDays, addDays, parseISO, format, isWithinInterval, subDays, startOfDay } from 'date-fns';
import { CycleEntry } from '../services/db';

export type Phase = 'Menstrual' | 'Fértil' | 'Ovulação' | 'Neutro';

/**
 * Converts an array of CycleEntry records into an array of cycle durations
 * (in days), sorted oldest → newest — ready to be consumed by useCyclePrediction.
 *
 * Only durations within the plausible 15–60 day window are included so that
 * outliers don't pollute the training data.
 */
export function computeCycleDurations(cycles: CycleEntry[]): number[] {
  if (cycles.length < 2) return [];

  const sorted = [...cycles].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const durations: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1].startDate);
    const curr = parseISO(sorted[i].startDate);
    const diff = differenceInDays(curr, prev);
    if (diff > 15 && diff < 60) {
      durations.push(diff);
    }
  }

  return durations;
}

export function calculateAverageCycleLength(cycles: CycleEntry[], fallback: number): number {
  if (cycles.length < 2) return fallback;
  
  const sortedCycles = [...cycles].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  let totalDays = 0;
  let count = 0;
  
  for (let i = 0; i < sortedCycles.length - 1; i++) {
    const current = parseISO(sortedCycles[i].startDate);
    const previous = parseISO(sortedCycles[i + 1].startDate);
    const diff = differenceInDays(current, previous);
    if (diff > 15 && diff < 60) { // filter out anomalies
      totalDays += diff;
      count++;
    }
  }
  
  return count > 0 ? Math.round(totalDays / count) : fallback;
}

export interface CycleCalculations {
  currentPhase: Phase;
  nextPeriodDate: Date;
  daysUntilNextPeriod: number;
  ovulationDate: Date;
  fertileWindow: { start: Date; end: Date };
  cycleDay: number;
}

export function getCycleCalculations(
  lastCycle: CycleEntry | undefined, 
  averageCycleLength: number, 
  periodDuration: number,
  targetDate: Date = new Date()
): CycleCalculations | null {
  if (!lastCycle) return null;

  const startDate = startOfDay(parseISO(lastCycle.startDate));
  const today = startOfDay(targetDate);
  
  const cycleDay = differenceInDays(today, startDate) + 1;
  const nextPeriodDate = addDays(startDate, averageCycleLength);
  const daysUntilNextPeriod = differenceInDays(nextPeriodDate, today);
  
  const ovulationDate = subDays(nextPeriodDate, 14);
  const fertileWindow = {
    start: subDays(ovulationDate, 5),
    end: ovulationDate
  };

  let currentPhase: Phase = 'Neutro';
  
  if (cycleDay > 0 && cycleDay <= periodDuration) {
    currentPhase = 'Menstrual';
  } else if (isWithinInterval(today, { start: subDays(ovulationDate, 1), end: addDays(ovulationDate, 1) })) {
    currentPhase = 'Ovulação';
  } else if (isWithinInterval(today, { start: fertileWindow.start, end: fertileWindow.end })) {
    currentPhase = 'Fértil';
  }

  return {
    currentPhase,
    nextPeriodDate,
    daysUntilNextPeriod,
    ovulationDate,
    fertileWindow,
    cycleDay
  };
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
