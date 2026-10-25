import { CycleEntry } from "../services/db";

export interface CycleForecast {
  averageCycleDays: number;
  adaptiveCycleDays: number;
  averagePeriodDays: number;
  uncertaintyDays: number;
  nextPeriod: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  ovulation: Date | null;
  fertileStart: Date | null;
  fertileEnd: Date | null;
  cycleDay: number | null;
  confidence: string;
  projections: Array<{ date: Date; windowStart: Date; windowEnd: Date; uncertaintyDays: number }>;
  attention: string[];
}

const dayMs = 86400000;
const dateAtLocalMidnight = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a: Date, b: Date) =>
  Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / dayMs);
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Deterministic, local-only estimate. Never treats fertile days as contraception. */
export function calculateCycleForecast(cycles: CycleEntry[], today = new Date()): CycleForecast {
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const durations = sorted.slice(1).map((c, i) =>
    daysBetween(dateAtLocalMidnight(sorted[i].startDate), dateAtLocalMidnight(c.startDate))
  ).filter(d => d >= 15 && d <= 60);
  const periodLengths = sorted.map(c => c.periodDurationDays ?? 5).filter(d => d >= 1 && d <= 15);
  const averageCycleDays = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 28;
  const averagePeriodDays = periodLengths.length ? Math.round(periodLengths.reduce((a,b)=>a+b,0)/periodLengths.length) : 5;

  let adaptiveCycleDays = averageCycleDays;
  let uncertaintyDays = sorted.length < 2 ? 4 : 3;
  if (durations.length) {
    let ewma = durations[0];
    for (let i = 1; i < durations.length; i++) ewma = 0.6 * durations[i] + 0.4 * ewma;
    adaptiveCycleDays = Math.round(0.7 * ewma + 0.3 * median(durations));
    const avg = durations.reduce((a,b)=>a+b,0)/durations.length;
    const sd = Math.sqrt(durations.reduce((sum,d)=>sum+(d-avg)**2,0)/durations.length);
    uncertaintyDays = durations.length < 2 ? 4 : sd <= 1.5 ? 2 : sd <= 3 ? 3 : sd <= 5 ? 4 : 5;
  }
  adaptiveCycleDays = Math.min(60, Math.max(15, adaptiveCycleDays));

  const last = sorted.at(-1);
  const lastStart = last ? dateAtLocalMidnight(last.startDate) : null;
  const nextPeriod = lastStart ? new Date(lastStart.getTime() + adaptiveCycleDays * dayMs) : null;
  const windowStart = nextPeriod ? new Date(nextPeriod.getTime() - uncertaintyDays * dayMs) : null;
  const windowEnd = nextPeriod ? new Date(nextPeriod.getTime() + uncertaintyDays * dayMs) : null;
  const ovulation = nextPeriod ? new Date(nextPeriod.getTime() - 14 * dayMs) : null;
  const fertileStart = ovulation ? new Date(ovulation.getTime() - 5 * dayMs) : null;
  const fertileEnd = ovulation ? new Date(ovulation.getTime() + dayMs) : null;
  const cycleDay = lastStart && daysBetween(lastStart, today) >= 0 ? daysBetween(lastStart, today) + 1 : null;

  const projections: CycleForecast["projections"] = [];
  if (nextPeriod) {
    let date = nextPeriod;
    let uncertainty = uncertaintyDays;
    const horizon = new Date(today.getTime() + 90 * dayMs);
    while (date <= horizon && projections.length < 4) {
      projections.push({
        date,
        windowStart: new Date(date.getTime() - uncertainty * dayMs),
        windowEnd: new Date(date.getTime() + uncertainty * dayMs),
        uncertaintyDays: uncertainty
      });
      date = new Date(date.getTime() + adaptiveCycleDays * dayMs);
      uncertainty = Math.min(9, uncertainty + 2);
    }
  }

  const attention: string[] = [];
  if (durations.length >= 2 && averageCycleDays < 21)
    attention.push("A média recente dos ciclos ficou abaixo de 21 dias. Considere conversar com um profissional de saúde se esse padrão persistir.");
  if (durations.length >= 2 && averageCycleDays > 35)
    attention.push("A média recente dos ciclos ficou acima de 35 dias. Considere conversar com um profissional de saúde se esse padrão persistir.");
  if (periodLengths.some(d => d > 8))
    attention.push("Há registro de sangramento com mais de 8 dias. Considere orientação de um profissional de saúde.");
  return {
    averageCycleDays, adaptiveCycleDays, averagePeriodDays, uncertaintyDays,
    nextPeriod, windowStart, windowEnd, ovulation, fertileStart, fertileEnd,
    cycleDay, confidence: durations.length === 0 ? "Estimativa inicial: ainda não há intervalos entre ciclos" :
      `Estimativa baseada em ${durations.length} intervalo(s) registrado(s); margem aproximada de ±${uncertaintyDays} dias`,
    projections, attention
  };
}
