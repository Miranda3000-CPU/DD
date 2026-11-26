import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportBackup, importBackup } from '../src/services/backup.ts';
import { db } from '../src/services/db.ts';

test('recusa exportação com três dígitos', async () => {
  await assert.rejects(exportBackup('000'), /pelo menos 4 caracteres/);
});

test('exporta e restaura registros com PIN de quatro dígitos repetidos', async (t) => {
  t.after(() => db.delete());
  const cycle = { startDate: '2026-01-01', createdAt: '2026-01-01T00:00:00Z' };
  await db.cycles.add(cycle);
  const file = new File([await exportBackup('0000')], 'teste.ddwebbackup');
  await db.cycles.clear();
  await assert.rejects(importBackup(file, '0001'), /Senha incorreta/);
  assert.equal((await importBackup(file, '0000')).cyclesAdded, 1);
  assert.equal((await db.cycles.toArray())[0].startDate, cycle.startDate);
});

test('restaura o nome salvo e preserva uma saudação já personalizada no dispositivo', async (t) => {
  await db.open();
  t.after(() => db.delete());
  const settings = { id: 1, cycleLength: 28, periodDuration: 5, notificationsEnabled: false };
  await db.settings.put({ ...settings, displayName: 'Gigi' });
  const file = new File([await exportBackup('1234')], 'nome.ddwebbackup');
  await db.settings.put(settings);
  await importBackup(file, '1234');
  assert.equal((await db.settings.get(1)).displayName, 'Gigi');
  await db.settings.update(1, { displayName: 'Gi' });
  await importBackup(file, '1234');
  assert.equal((await db.settings.get(1)).displayName, 'Gi');
});
