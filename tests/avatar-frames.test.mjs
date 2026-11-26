import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { avatarFrameFor, avatarFrameUrl } from '../src/components/avatar/avatarFrames.ts';

test('the generated pose follows the existing calculated cycle phase', () => {
  assert.equal(avatarFrameFor('Menstrual'), 'menstrual');
  assert.equal(avatarFrameFor('Folicular'), 'follicular');
  assert.equal(avatarFrameFor('Ovulação'), 'ovulatory');
  assert.equal(avatarFrameFor('Lútea'), 'luteal');
  assert.equal(avatarFrameFor('Neutro'), 'luteal');
  assert.equal(avatarFrameFor(null), 'luteal');
});

test('all local phase and interaction frames exist for offline use', async () => {
  for (const name of ['menstrual', 'follicular', 'ovulatory', 'luteal', 'touch']) {
    const path = new URL(`../public${avatarFrameUrl(name)}`, import.meta.url);
    await access(path);
    const content = await readFile(path);
    assert.equal(content.subarray(0, 4).toString(), 'RIFF');
    assert.equal(content.subarray(8, 12).toString(), 'WEBP');
  }
});
