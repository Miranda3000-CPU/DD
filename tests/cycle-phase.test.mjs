import assert from 'node:assert/strict';
import test from 'node:test';
import { getCycleCalculations } from '../src/utils/dateUtils.ts';

const cycle = { startDate: '2026-01-01', createdAt: '2026-01-01T12:00:00Z' };
function at(day, length = 28, duration = 5) {
  return getCycleCalculations(cycle, length, duration, new Date(2026, 0, day, 12));
}

test('as quatro fases usam o mesmo ciclo e os limites existentes da janela fértil e da ovulação', () => {
  for (const [day, phase, fertile] of [
    [1, 'Menstrual', false],
    [5, 'Menstrual', false],
    [6, 'Folicular', false],
    [9, 'Folicular', false],
    [10, 'Folicular', true],
    [13, 'Folicular', true],
    [14, 'Ovulação', true],
    [15, 'Ovulação', true],
    [16, 'Ovulação', false],
    [17, 'Lútea', false],
    [28, 'Lútea', false],
  ]) {
    const result = at(day);
    assert.equal(result.cycleDay, day);
    assert.equal(result.currentPhase, phase);
    assert.equal(result.isInFertileWindow, fertile);
    assert.equal(result.daysUntilNextPeriod, 29 - day);
  }
});

test('as estimativas acompanham o comprimento do ciclo e a duração menstrual configurados', () => {
  assert.equal(at(6, 32, 7).currentPhase, 'Menstrual');
  assert.equal(at(15, 32, 7).currentPhase, 'Folicular');
  assert.equal(at(19, 32, 7).currentPhase, 'Ovulação');
  assert.equal(at(21, 32, 7).currentPhase, 'Lútea');
  assert.equal(at(3, 16, 5).currentPhase, 'Menstrual');
});

test('sem registro ou fora do ciclo estimado não atribui uma fase nova', () => {
  assert.equal(getCycleCalculations(undefined, 28, 5), null);
  for (const day of [0, 29, 365]) assert.equal(at(day).currentPhase, 'Neutro');
});
