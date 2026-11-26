import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createCipheriv, pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';
import { importBackup } from '../src/services/backup.ts';
import { db } from '../src/services/db.ts';

// Independently build the envelope emitted by Android BackupCrypto.encrypt.
function encryptedLegacyBackup(password) {
  const salt = Buffer.alloc(16, 42);
  const iv = Buffer.alloc(12, 1);
  const key = pbkdf2Sync(password, salt, 65536, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const payload = {
    formatVersion: 1,
    cycles: [
      {
        uuid: 'cycle-test',
        startDateEpochDay: 20000,
        periodLengthDays: 4,
        createdAtEpochMilli: 1728000000000,
        updatedAtEpochMilli: 1728000000000,
      },
    ],
    dailyLogs: [
      {
        uuid: 'daily-test',
        dateEpochDay: 20001,
        notes: 'Registro sintético',
        updatedAtEpochMilli: 1728086400000,
      },
    ],
    preferences: { notifications_enabled: 'true', notify_daily_reminder: 'true' },
  };
  const bytes = Buffer.concat([
    salt,
    iv,
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return new File(['DDBACKUP_V1_ENC\n', bytes.toString('base64')], 'fixture.ddbackup');
}

test('restaura backup Android criptografado e preserva edições locais na reimportação', async (t) => {
  t.after(() => db.delete());
  const file = encryptedLegacyBackup('senha-sintetica');
  await assert.rejects(importBackup(file, 'incorreta'), /Senha incorreta/);
  assert.equal(await db.cycles.count(), 0);
  assert.deepEqual(await importBackup(file, 'senha-sintetica'), { cyclesAdded: 1, logsAdded: 1 });
  const [cycle] = await db.cycles.toArray();
  assert.equal(cycle.startDate, '2024-10-04');
  assert.equal(cycle.periodDurationDays, 4);
  assert.equal(cycle.legacyUuid, 'cycle-test');
  const [log] = await db.dailyLogs.toArray();
  assert.equal(log.date, '2024-10-05');
  assert.equal(log.notes, 'Registro sintético');
  assert.equal(log.legacyUuid, 'daily-test');
  assert.equal(log.updatedAt, '2024-10-05T00:00:00.000Z');
  const settings = await db.settings.get(1);
  assert.equal(settings.dailyReminderEnabled, true);
  assert.equal(settings.notificationsEnabled, true);
  await db.dailyLogs.update(log.id, {
    notes: 'Edição local',
    updatedAt: '2024-10-06T00:00:00.000Z',
  });
  assert.deepEqual(await importBackup(file, 'senha-sintetica'), { cyclesAdded: 0, logsAdded: 0 });
  assert.equal((await db.dailyLogs.get(log.id)).notes, 'Edição local');
});
