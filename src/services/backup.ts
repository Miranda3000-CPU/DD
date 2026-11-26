import { db, type CycleEntry, type DailyLogEntry, type AppSettings } from './db.ts';

export const MIN_BACKUP_PASSWORD_LENGTH = 4;

const HEADER = 'DDWEB_BACKUP_V1\n';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
type Payload = {
  formatVersion: 1;
  exportedAt: string;
  cycles: CycleEntry[];
  dailyLogs: DailyLogEntry[];
  settings: AppSettings[];
  nativePreferences?: Record<string, string>;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(password)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 210000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function exportBackup(password: string): Promise<Blob> {
  if (password.length < MIN_BACKUP_PASSWORD_LENGTH) {
    throw new Error(`Use uma senha com pelo menos ${MIN_BACKUP_PASSWORD_LENGTH} caracteres.`);
  }
  const payload: Payload = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    cycles: await db.cycles.toArray(),
    dailyLogs: await db.dailyLogs.toArray(),
    settings: await db.settings.toArray(),
  };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(new TextEncoder().encode(JSON.stringify(payload))),
    ),
  );
  const envelope =
    HEADER +
    JSON.stringify({
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(encrypted),
    });
  return new Blob([envelope], { type: 'application/octet-stream' });
}

const NATIVE_PLAIN_HEADER = 'DDBACKUP_V1_PLAIN\n';
const NATIVE_ENCRYPTED_HEADER = 'DDBACKUP_V1_ENC\n';

async function decodeNativeBackup(text: string, password: string): Promise<Payload> {
  let json: string;
  if (text.startsWith(NATIVE_PLAIN_HEADER)) {
    json = text.slice(NATIVE_PLAIN_HEADER.length).trim();
  } else if (text.startsWith(NATIVE_ENCRYPTED_HEADER)) {
    if (!password) throw new Error('Este backup Android está protegido por senha.');
    const bytes = Uint8Array.from(atob(text.slice(NATIVE_ENCRYPTED_HEADER.length).trim()), (c) =>
      c.charCodeAt(0),
    );
    if (bytes.length < 28) throw new Error('Backup Android inválido ou incompleto.');
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ciphertext = bytes.slice(28);
    const material = await crypto.subtle.importKey(
      'raw',
      toArrayBuffer(new TextEncoder().encode(password)),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 65536, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    try {
      json = new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: toArrayBuffer(iv) },
          key,
          toArrayBuffer(ciphertext),
        ),
      );
    } catch {
      throw new Error('Senha incorreta ou backup Android danificado.');
    }
  } else {
    // Compatibility with older native backups containing raw JSON.
    json = text.trim();
  }

  const native = JSON.parse(json) as {
    formatVersion?: number;
    cycles?: Array<Record<string, unknown>>;
    dailyLogs?: Array<Record<string, unknown>>;
    preferences?: Record<string, string>;
    userName?: string;
    exportedAtEpochMilli?: number;
  };
  if (!Array.isArray(native.cycles) || !Array.isArray(native.dailyLogs))
    throw new Error('Estrutura do backup Android inválida.');
  const dateFromEpochDay = (value: unknown) =>
    new Date(Number(value) * 86400000).toISOString().slice(0, 10);
  const dateTime = (value: unknown) => new Date(Number(value || Date.now())).toISOString();
  const cycles = native.cycles.map((item) => ({
    startDate: dateFromEpochDay(item.startDateEpochDay),
    periodDurationDays: Number(item.periodLengthDays ?? 5),
    flowIntensity: String(item.flowIntensity ?? 'Médio'),
    symptoms: String(item.symptoms ?? ''),
    notes: String(item.notes ?? ''),
    createdAt: dateTime(item.createdAtEpochMilli),
    updatedAt: dateTime(item.updatedAtEpochMilli),
    legacyUuid: String(item.uuid ?? ''),
  }));
  const dailyLogs = native.dailyLogs.map((item) => ({
    date: dateFromEpochDay(item.dateEpochDay),
    flowIntensity: item.flowIntensity == null ? undefined : String(item.flowIntensity),
    painLevel: item.painLevel == null ? undefined : String(item.painLevel),
    symptoms: String(item.symptoms ?? ''),
    mood: item.mood == null ? undefined : String(item.mood),
    energyLevel: item.energyLevel == null ? undefined : String(item.energyLevel),
    sleepQuality: item.sleepQuality == null ? undefined : String(item.sleepQuality),
    cervicalMucus: item.cervicalMucus == null ? undefined : String(item.cervicalMucus),
    notes: String(item.notes ?? ''),
    updatedAt: dateTime(item.updatedAtEpochMilli),
    legacyUuid: String(item.uuid ?? ''),
  }));
  const durations = cycles
    .map((c) => c.periodDurationDays)
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 15)
    .sort((a, b) => a - b);
  const preferences = native.preferences ?? {};
  return {
    formatVersion: 1,
    exportedAt: dateTime(native.exportedAtEpochMilli),
    cycles,
    dailyLogs,
    settings: [
      {
        id: 1,
        cycleLength: 28,
        periodDuration: durations.length ? durations[Math.floor(durations.length / 2)] : 5,
        notificationsEnabled: preferences.notifications_enabled === 'true',
        dailyReminderEnabled: preferences.notify_daily_reminder === 'true',
      },
    ],
    nativePreferences: preferences,
  };
}

export async function importBackup(
  file: File,
  password: string,
): Promise<{ cyclesAdded: number; logsAdded: number }> {
  const text = await file.text();
  let payload: Payload;
  if (text.startsWith(HEADER)) {
    const envelope = JSON.parse(text.slice(HEADER.length)) as {
      salt: string;
      iv: string;
      ciphertext: string;
    };
    const key = await deriveKey(password, base64ToBytes(envelope.salt));
    let decoded: string;
    try {
      decoded = new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(envelope.iv)) },
          key,
          toArrayBuffer(base64ToBytes(envelope.ciphertext)),
        ),
      );
    } catch {
      throw new Error('Senha incorreta ou arquivo danificado.');
    }
    payload = JSON.parse(decoded) as Payload;
  } else {
    payload = await decodeNativeBackup(text, password);
  }
  if (
    payload.formatVersion !== 1 ||
    !Array.isArray(payload.cycles) ||
    !Array.isArray(payload.dailyLogs)
  ) {
    throw new Error('Estrutura de backup inválida ou versão não suportada.');
  }

  let cyclesAdded = 0;
  let logsAdded = 0;
  await db.transaction('rw', db.cycles, db.dailyLogs, db.settings, async () => {
    for (const incoming of payload.cycles) {
      if (!incoming.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(incoming.startDate)) continue;
      const existing = await db.cycles.where('startDate').equals(incoming.startDate).first();
      if (!existing) {
        const copy = { ...incoming };
        delete copy.id;
        await db.cycles.add(copy);
        cyclesAdded++;
      } else if (
        (incoming.updatedAt ?? incoming.createdAt) > (existing.updatedAt ?? existing.createdAt)
      ) {
        await db.cycles.update(existing.id!, { ...incoming, id: existing.id });
      }
    }
    for (const incoming of payload.dailyLogs) {
      if (!incoming.date || !/^\d{4}-\d{2}-\d{2}$/.test(incoming.date)) continue;
      const existing = await db.dailyLogs.where('date').equals(incoming.date).first();
      if (!existing) {
        const copy = { ...incoming };
        delete copy.id;
        await db.dailyLogs.add(copy);
        logsAdded++;
      } else if (incoming.updatedAt > existing.updatedAt) {
        await db.dailyLogs.update(existing.id!, { ...incoming, id: existing.id });
      }
    }
    // Restore preferences only if this device has none; never overwrite local settings.
    if (Array.isArray(payload.settings) && payload.settings.length > 0) {
      const localSettings = await db.settings.toArray();
      const current = localSettings[0];
      const isDefaultSettings =
        !current ||
        (current.cycleLength === 28 &&
          current.periodDuration === 5 &&
          !current.notificationsEnabled &&
          !current.dailyReminderEnabled);
      if (isDefaultSettings) {
        for (const setting of payload.settings) {
          const copy = { ...setting, id: 1 };
          if (current?.displayName) copy.displayName = current.displayName;
          await db.settings.put(copy);
        }
      }
    }
  });
  const legacyPrefs = payload.nativePreferences ?? {};
  if (
    legacyPrefs.privacy_notice_dismissed === 'true' &&
    !localStorage.getItem('ciclo_privacy_seen')
  ) {
    localStorage.setItem('ciclo_privacy_seen', '1');
  }
  if (
    legacyPrefs.calendar_tour_dismissed === 'true' &&
    !localStorage.getItem('ciclo_calendar_tour_seen')
  ) {
    localStorage.setItem('ciclo_calendar_tour_seen', '1');
  }
  return { cyclesAdded, logsAdded };
}
