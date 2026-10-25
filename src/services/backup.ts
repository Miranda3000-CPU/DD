import { db, CycleEntry, DailyLogEntry, AppSettings } from "./db";

const HEADER = "DDWEB_BACKUP_V1\n";
type Payload = {
  formatVersion: 1;
  exportedAt: string;
  cycles: CycleEntry[];
  dailyLogs: DailyLogEntry[];
  settings: AppSettings[];
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function exportBackup(password: string): Promise<Blob> {
  if (password.length < 10) throw new Error("Use uma senha com pelo menos 10 caracteres.");
  const payload: Payload = {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    cycles: await db.cycles.toArray(),
    dailyLogs: await db.dailyLogs.toArray(),
    settings: await db.settings.toArray()
  };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(payload))));
  const envelope = HEADER + JSON.stringify({ salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(encrypted) });
  return new Blob([envelope], { type: "application/octet-stream" });
}

export async function importBackup(file: File, password: string): Promise<{ cyclesAdded: number; logsAdded: number }> {
  const text = await file.text();
  if (!text.startsWith(HEADER)) throw new Error("Arquivo não é um backup DD Web compatível.");
  const envelope = JSON.parse(text.slice(HEADER.length)) as { salt: string; iv: string; ciphertext: string };
  const key = await deriveKey(password, base64ToBytes(envelope.salt));
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext)
    ));
  } catch {
    throw new Error("Senha incorreta ou arquivo danificado.");
  }
  const payload = JSON.parse(decoded) as Payload;
  if (payload.formatVersion !== 1 || !Array.isArray(payload.cycles) || !Array.isArray(payload.dailyLogs)) {
    throw new Error("Estrutura de backup inválida ou versão não suportada.");
  }

  let cyclesAdded = 0;
  let logsAdded = 0;
  await db.transaction("rw", db.cycles, db.dailyLogs, async () => {
    for (const incoming of payload.cycles) {
      if (!incoming.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(incoming.startDate)) continue;
      const existing = await db.cycles.where("startDate").equals(incoming.startDate).first();
      if (!existing) { const copy = { ...incoming }; delete copy.id; await db.cycles.add(copy); cyclesAdded++; }
      else if ((incoming.updatedAt ?? incoming.createdAt) > (existing.updatedAt ?? existing.createdAt)) {
        await db.cycles.update(existing.id!, { ...incoming, id: existing.id });
      }
    }
    for (const incoming of payload.dailyLogs) {
      if (!incoming.date || !/^\d{4}-\d{2}-\d{2}$/.test(incoming.date)) continue;
      const existing = await db.dailyLogs.where("date").equals(incoming.date).first();
      if (!existing) { const copy = { ...incoming }; delete copy.id; await db.dailyLogs.add(copy); logsAdded++; }
      else if (incoming.updatedAt > existing.updatedAt) {
        await db.dailyLogs.update(existing.id!, { ...incoming, id: existing.id });
      }
    }
  });
  return { cyclesAdded, logsAdded };
}
