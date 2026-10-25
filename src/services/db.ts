import Dexie, { Table } from "dexie";

export interface CycleEntry {
  id?: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  periodDurationDays?: number;
  flowIntensity?: "Nenhum" | "Leve" | "Médio" | "Intenso" | string;
  symptoms?: string;
  notes?: string;
  updatedAt?: string;
}

export interface DailyLogEntry {
  id?: number;
  date: string;
  flowIntensity?: string;
  painLevel?: string;
  symptoms: string;
  mood?: string;
  energyLevel?: string;
  sleepQuality?: string;
  cervicalMucus?: string;
  notes: string;
  updatedAt: string;
}

export interface AppSettings {
  id?: number;
  cycleLength: number;
  periodDuration: number;
  notificationsEnabled: boolean;
  dailyReminderEnabled?: boolean;
}

export class CycloDb extends Dexie {
  cycles!: Table<CycleEntry>;
  settings!: Table<AppSettings>;
  dailyLogs!: Table<DailyLogEntry>;

  constructor() {
    super("CycloDB");
    this.version(1).stores({
      cycles: "++id, startDate",
      settings: "++id"
    });
    this.version(2).stores({
      cycles: "++id, startDate",
      settings: "++id",
      dailyLogs: "++id, &date, updatedAt"
    }).upgrade(async (tx) => {
      // Preserve all existing cycle/settings records. New fields remain optional
      // and receive safe defaults at read time, avoiding destructive migration.
      await tx.table("cycles").toCollection().modify((cycle: CycleEntry) => {
        if (!cycle.periodDurationDays) cycle.periodDurationDays = 5;
        if (!cycle.updatedAt) cycle.updatedAt = cycle.createdAt ?? new Date(0).toISOString();
      });
    });
  }
}

export const db = new CycloDb();
