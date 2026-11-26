import type { Phase } from '../../utils/dateUtils';

const embrace = { arms: -0.28, wave: 0, elbows: 1.55, nod: 0.18, wink: 0, bounce: 0 };
const gestures = {
  Menstrual: embrace,
  Folicular: { arms: 0.25, wave: 1.8, elbows: 0.65, nod: -0.1, wink: 0.9, bounce: 0.018 },
  Ovulação: { arms: 2.05, wave: 0.15, elbows: 0.45, nod: -0.16, wink: 0, bounce: 0.09 },
  Lútea: { arms: -0.45, wave: 0, elbows: 1.92, nod: 0.28, wink: 0.6, bounce: 0 },
};
export function gestureFor(phase: Phase | null) {
  return gestures[phase === null || phase === 'Neutro' ? 'Lútea' : phase];
}
export function gestureEnvelope(seconds: number) {
  return Math.max(0, Math.min(1, seconds / 0.22, (2.6 - seconds) / 0.8));
}
