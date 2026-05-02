import Dexie, { Table } from 'dexie';

export interface CycleEntry {
  id?: number;
  startDate: string; // ISO date string "YYYY-MM-DD"
  endDate?: string;  // optional
  createdAt: string;
}

export interface AppSettings {
  id?: number;
  cycleLength: number;      // default 28
  periodDuration: number;   // default 5
  notificationsEnabled: boolean;
}

export class CycloDb extends Dexie {
  cycles!: Table<CycleEntry>;
  settings!: Table<AppSettings>;
  
  constructor() {
    super('CycloDB');
    this.version(1).stores({
      cycles: '++id, startDate',
      settings: '++id'
    });
  }
}

export const db = new CycloDb();
