import type { CycleEntry } from "../services/db";

const DAY_MS = 86_400_000;
const DEFAULT_CYCLE_DAYS = 28;
const DEFAULT_PERIOD_DAYS = 5;

export type CyclePhase = "Menstrual" | "Follicular" | "Fertile" | "Ovulation" | "Luteal";

export interface CycleProjection {
  index: number;
  estimatedStart: string;
  windowStart: string;
  windowEnd: string;
  uncertaintyDays: number;
  estimatedOvulation: string;
  fertileStart: string;
  fertileEnd: string;
}

export interface CycleInsight {
  averageCycleDays: number;
  adaptiveCycleDays: number;
  averagePeriodDays: number;
  uncertaintyDays: number;
  nextPeriod: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  ovulationDate: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  cycleDay: number | null;
  phase: CyclePhase | null;
  daysUntilNextPeriod: number | null;
  confidenceText: string;
  projections: CycleProjection[];
  healthSignals: string[];
}

const epochDay = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DAY_MS);
const fromEpochDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function calculateCycleInsight(
  entries: CycleEntry[],
  periodFallback = DEFAULT_PERIOD_DAYS,
  today = new Date()
): CycleInsight {
  const todayDay = epochDay(today.toISOString().slice(0, 10));
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const empty: CycleInsight = {
    averageCycleDays: DEFAULT_CYCLE_DAYS, adaptiveCycleDays: DEFAULT_CYCLE_DAYS,
    averagePeriodDays: periodFallback, uncertaintyDays: 3, nextPeriod: null,
    windowStart: null, windowEnd: null, ovulationDate: null, fertileStart: null,
    fertileEnd: null, cycleDay: null, phase: null, daysUntilNextPeriod: null,
    confidenceText: "Registre o início da menstruação para começar a acompanhar seu padrão.",
    projections: [], healthSignals: []
  };
  if (!sorted.length) return empty;

  const starts = sorted.map((item) => epochDay(item.startDate));
  const intervals = starts.slice(1).map((day, i) => day - starts[i]).filter((days) => days >= 15 && days <= 60);
  const periodLengths = sorted.map((item) => clamp(Number(item.periodLengthDays ?? periodFallback), 1, 20));
  const averagePeriodDays = clamp(Math.round(periodLengths.reduce((sum, n) => sum + n, 0) / periodLengths.length), 1, 20);
  const averageCycleDays = intervals.length
    ? clamp(Math.round(intervals.reduce((sum, n) => sum + n, 0) / intervals.length), 15, 60)
    : DEFAULT_CYCLE_DAYS;

  let adaptiveCycleDays = DEFAULT_CYCLE_DAYS;
  let uncertaintyDays = 3;
  if (intervals.length) {
    let ewma = intervals[0];
    for (const interval of intervals.slice(1)) ewma = 0.6 * interval + 0.4 * ewma;
    adaptiveCycleDays = clamp(Math.round(0.7 * ewma + 0.3 * median(intervals)), 15, 60);
    const variance = intervals.reduce((sum, n) => sum + (n - averageCycleDays) ** 2, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    uncertaintyDays = intervals.length === 1 ? 3 : stdDev <= 1.5 ? 2 : stdDev <= 3 ? 3 : stdDev <= 5 ? 4 : 5;
  }

  const lastStart = starts[starts.length - 1];
  const next = lastStart + adaptiveCycleDays;
  const ovulation = next - 14;
  const fertileStart = ovulation - 5;
  const fertileEnd = ovulation + 1;
  const cycleDay = todayDay >= lastStart ? todayDay - lastStart + 1 : null;
  let phase: CyclePhase | null = null;
  if (cycleDay !== null) {
    if (cycleDay <= averagePeriodDays) phase = "Menstrual";
    else if (todayDay === ovulation) phase = "Ovulation";
    else if (todayDay >= fertileStart && todayDay <= fertileEnd) phase = "Fertile";
    else phase = todayDay < ovulation ? "Follicular" : "Luteal";
  }

  const healthSignals: string[] = [];
  if (intervals.length >= 2 && averageCycleDays < 21)
    healthSignals.push("A média recente ficou abaixo de 21 dias. Se isso persistir, considere conversar com um profissional de saúde.");
  if (intervals.length >= 2 && averageCycleDays > 35)
    healthSignals.push("A média recente ficou acima de 35 dias. Se isso persistir ou for incomum para você, considere orientação profissional.");
  if (averagePeriodDays > 8)
    healthSignals.push("Os registros indicam sangramento por mais de 8 dias. Considere conversar com um profissional de saúde.");

  const projections: CycleProjection[] = [];
  let projectedStart = next;
  let uncertainty = uncertaintyDays;
  for (let index = 1; projectedStart <= todayDay + 90; index++) {
    const projectedOvulation = projectedStart - 14;
    projections.push({
      index,
      estimatedStart: fromEpochDay(projectedStart),
      windowStart: fromEpochDay(projectedStart - uncertainty),
      windowEnd: fromEpochDay(projectedStart + uncertainty),
      uncertaintyDays: uncertainty,
      estimatedOvulation: fromEpochDay(projectedOvulation),
      fertileStart: fromEpochDay(projectedOvulation - 5),
      fertileEnd: fromEpochDay(projectedOvulation + 1)
    });
    projectedStart += adaptiveCycleDays;
    uncertainty = Math.min(9, uncertainty + 2);
  }

  return {
    averageCycleDays, adaptiveCycleDays, averagePeriodDays, uncertaintyDays,
    nextPeriod: fromEpochDay(next), windowStart: fromEpochDay(next - uncertaintyDays),
    windowEnd: fromEpochDay(next + uncertaintyDays), ovulationDate: fromEpochDay(ovulation),
    fertileStart: fromEpochDay(fertileStart), fertileEnd: fromEpochDay(fertileEnd),
    cycleDay, phase, daysUntilNextPeriod: next - todayDay,
    confidenceText: intervals.length
      ? `Estimativa baseada em ${sorted.length} inícios registrados; janela aproximada de ±${uncertaintyDays} dias.`
      : "Ainda há poucos dados para estimar seu padrão pessoal. A referência inicial é de 28 dias.",
    projections, healthSignals
  };
}
