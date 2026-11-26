import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('o modelo contém a geometria, os pivôs animados e todos os recursos para uso offline', async () => {
  const file = await readFile(new URL('../src/assets/avatar/giovanna.glb', import.meta.url));
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
  const jsonLength = file.readUInt32LE(12);
  const model = JSON.parse(file.toString('utf8', 20, 20 + jsonLength));
  const nodes = new Set(model.nodes.map((node) => node.name));
  for (const name of [
    'Torso',
    'Head',
    'ArmL',
    'ArmR',
    'Mouth',
    'EyeL',
    'EyeR',
    'ForearmL',
    'ForearmR',
  ]) {
    assert.ok(nodes.has(name), `Pivô ausente: ${name}`);
  }
  const mouth = model.nodes.find((node) => node.name === 'Mouth');
  assert.ok(model.meshes[mouth.mesh].extras.targetNames.includes('Smile'));
  assert.ok(
    model.meshes.some((mesh) => mesh.primitives.some((p) => p.attributes.POSITION != null)),
  );
  for (const resource of [...model.buffers, ...(model.images ?? [])]) {
    assert.ok(!resource.uri || resource.uri.startsWith('data:'), 'Recurso externo no modelo');
  }
});

test('o visual padrão é o lúteo e cada fase estimada tem sua própria animação', async () => {
  const { phaseVisuals } = await import('../src/components/avatar/avatarConfig.ts');
  const base = phaseVisuals('Lútea');
  assert.deepEqual(phaseVisuals(null), base);
  assert.deepEqual(phaseVisuals('Neutro'), base);
  const phases = ['Menstrual', 'Folicular', 'Ovulação', 'Lútea'].map(phaseVisuals);
  assert.equal(new Set(phases.map((visual) => visual.tint)).size, 4);
  assert.equal(new Set(phases.map((visual) => visual.speed)).size, 4);
});
