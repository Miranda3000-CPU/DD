import { db, type AppSettings, type CycleEntry, type DailyLogEntry } from "../services/db";
import { isAndroidWebView, requestAndroid } from "./androidBridge";

interface NativeCycle {
  uuid?: string;
  startDate: string;
  periodLengthDays?: number;
  flowIntensity?: string;
  symptoms?: string;
  notes?: string;
  createdAtEpochMilli?: number;
  updatedAtEpochMilli?: number;
}

interface NativeDailyLog {
  uuid?: string;
  date: string;
  flowIntensity?: string | null;
  painLevel?: string | null;
  symptoms?: string;
  mood?: string | null;
  energyLevel?: string | null;
  sleepQuality?: string | null;
  cervicalMucus?: string | null;
  notes?: string;
  createdAtEpochMilli?: number;
  updatedAtEpochMilli?: number;
}

interface NativeLegacyData {
  migrated: boolean;
  cycles: NativeCycle[];
  dailyLogs: NativeDailyLog[];
  preferences: Record<string, string>;
  userName?: string;
}

const isoDateTime = (value?: number) =>
  new Date(value && value > 0 ? value : Date.now()).toISOString();

function median(values: number[]): number {
  if (!values.length) return 5;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * Copies the legacy Room database into the website's IndexedDB database.
 * The merge is keyed by calendar date and timestamp, so retrying after an
 * interrupted startup does not duplicate records or overwrite newer web data.
 * The original Room database is deliberately retained as a rollback safeguard.
 */
export async function migrateNativeDataAtStartup(): Promise<void> {
  if (!isAndroidWebView()) return;

  try {
    const legacy = await requestAndroid<NativeLegacyData>("getLegacyData");
    if (legacy.migrated) return;

    const nativeCycles = Array.isArray(legacy.cycles) ? legacy.cycles : [];
    const nativeLogs = Array.isArray(legacy.dailyLogs) ? legacy.dailyLogs : [];
    const preferences = legacy.preferences ?? {};

    await db.transaction("rw", db.cycles, db.dailyLogs, db.settings, async () => {
      for (const incoming of nativeCycles) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(incoming.startDate || "")) continue;

        const createdAt = isoDateTime(incoming.createdAtEpochMilli);
        const updatedAt = isoDateTime(incoming.updatedAtEpochMilli);
        const candidate: Omit<CycleEntry, "id"> = {
          startDate: incoming.startDate,
          periodDurationDays: incoming.periodLengthDays ?? 5,
          flowIntensity: incoming.flowIntensity ?? "Médio",
          symptoms: incoming.symptoms ?? "",
          notes: incoming.notes ?? "",
          createdAt,
          updatedAt,
          legacyUuid: incoming.uuid,
        };

        const existing = await db.cycles.where("startDate").equals(incoming.startDate).first();
        if (!existing) {
          await db.cycles.add(candidate);
        } else if (updatedAt > (existing.updatedAt ?? existing.createdAt)) {
          await db.cycles.update(existing.id!, { ...candidate, id: existing.id });
        }
      }

      for (const incoming of nativeLogs) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(incoming.date || "")) continue;

        const createdAt = isoDateTime(incoming.createdAtEpochMilli);
        const updatedAt = isoDateTime(incoming.updatedAtEpochMilli);
        const candidate: Omit<DailyLogEntry, "id"> = {
          date: incoming.date,
          flowIntensity: incoming.flowIntensity ?? undefined,
          painLevel: incoming.painLevel ?? undefined,
          symptoms: incoming.symptoms ?? "",
          mood: incoming.mood ?? undefined,
          energyLevel: incoming.energyLevel ?? undefined,
          sleepQuality: incoming.sleepQuality ?? undefined,
          cervicalMucus: incoming.cervicalMucus ?? undefined,
          notes: incoming.notes ?? "",
          updatedAt,
          legacyUuid: incoming.uuid,
        };

        const existing = await db.dailyLogs.where("date").equals(incoming.date).first();
        if (!existing) {
          await db.dailyLogs.add(candidate);
        } else if (updatedAt > existing.updatedAt) {
          await db.dailyLogs.update(existing.id!, { ...candidate, id: existing.id });
        }
      }

      const currentSettings = await db.settings.get(1);
      if (!currentSettings) {
        const periodDuration = median(
          nativeCycles
            .map((cycle) => Number(cycle.periodLengthDays ?? 5))
            .filter((days) => days >= 1 && days <= 15),
        );
        const settings: AppSettings = {
          id: 1,
          cycleLength: 28,
          periodDuration,
          notificationsEnabled: preferences.notifications_enabled === "true",
          dailyReminderEnabled: preferences.notify_daily_reminder === "true",
        };
        await db.settings.put(settings);
      }
    });

    // The user-facing name and one-time consent flags were stored separately
    // from Room. Copy them only when this WebView profile has no value yet.
    const userName = legacy.userName || preferences.user_name;
    if (userName && !localStorage.getItem("ciclo_username")) {
      localStorage.setItem("ciclo_username", userName);
    }
    if (preferences.privacy_notice_dismissed === "true" && !localStorage.getItem("ciclo_privacy_seen")) {
      localStorage.setItem("ciclo_privacy_seen", "1");
    }
    if (preferences.calendar_tour_dismissed === "true" && !localStorage.getItem("ciclo_calendar_tour_seen")) {
      localStorage.setItem("ciclo_calendar_tour_seen", "1");
    }

    // Mark the migration only after IndexedDB commits successfully.
    await requestAndroid("completeLegacyMigration");
  } catch {
    // Do not log personal health data. The next launch retries the idempotent merge.
    console.warn("A migração local do DD será tentada novamente na próxima abertura.");
  }
}
