import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  requestAndroid,
  requestNotificationPermission,
  scheduleAndroidCyclePrediction,
  selectAndroidBackupFile,
} from '../src/native/androidBridge.ts';

function installBridge(t, handle) {
  const channel = new EventTarget();
  channel.postMessage = (text) => {
    const request = JSON.parse(text);
    const reply = (response) =>
      channel.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ id: request.id, ...response }),
        }),
      );
    handle(request, reply);
  };
  globalThis.window = { ddAndroid: channel, clearTimeout, setTimeout };
  t.after(() => {
    delete globalThis.window;
  });
}

test('a permissão negada pelo Android é respeitada', async (t) => {
  installBridge(t, ({ action }, reply) => {
    assert.equal(action, 'requestNotificationPermission');
    reply({ ok: true, data: { granted: false } });
  });
  assert.equal(await requestNotificationPermission(), false);
});

test('a remoção da previsão envia uma data nula ao Android', async (t) => {
  installBridge(t, ({ action, payload }, reply) => {
    assert.equal(action, 'scheduleCyclePrediction');
    assert.deepEqual(payload, { nextPeriodDate: null });
    reply({ ok: true });
  });
  await scheduleAndroidCyclePrediction(null);
});

test('o seletor nativo preserva nome e conteúdo binário do backup', async (t) => {
  installBridge(t, ({ action }, reply) => {
    assert.equal(action, 'selectBackupFile');
    reply({ ok: true, data: { filename: 'diario.ddbackup', base64: 'AP+A' } });
  });
  const file = await selectAndroidBackupFile();
  assert.equal(file.name, 'diario.ddbackup');
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), Uint8Array.of(0, 255, 128));
});

test('respostas concorrentes são identificadas e erros chegam ao chamador', async (t) => {
  const replies = [];
  installBridge(t, (_, reply) => replies.push(reply));
  const first = requestAndroid('one');
  const second = requestAndroid('two');
  replies[1]({ ok: false, error: 'Importação cancelada.' });
  replies[0]({ ok: true, data: 'ok' });
  assert.equal(await first, 'ok');
  await assert.rejects(second, /Importação cancelada/);
});
