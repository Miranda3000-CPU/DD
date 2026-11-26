import assert from 'node:assert/strict';
import test from 'node:test';
import { gestureFor, gestureEnvelope } from '../src/components/avatar/avatarGestures.ts';
test('cada fase possui gestos distintos; sem estimativa usa o gesto lúteo', () => {
  const poses = ['Menstrual', 'Folicular', 'Ovulação', 'Lútea'].map(gestureFor);
  assert.equal(new Set(poses.map((p) => JSON.stringify(p))).size, 4);
  assert.deepEqual(gestureFor(null), gestureFor('Lútea'));
  assert.deepEqual(gestureFor('Neutro'), gestureFor('Lútea'));
});
test('o toque entra suavemente e retorna à animação contínua', () => {
  assert.equal(gestureEnvelope(0), 0);
  assert.equal(gestureEnvelope(0.5), 1);
  assert.equal(gestureEnvelope(3), 0);
});
