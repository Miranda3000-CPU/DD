import type { Phase } from '../../utils/dateUtils';

const luteal = {
  tint: '#b69ae6',
  speed: 0.72,
  sway: 0.48,
  smile: 0.14,
  sparkle: 0.58,
  petals: 1,
  glint: 0,
};
const visuals = {
  Menstrual: {
    tint: '#ee9aaa',
    speed: 0.62,
    sway: 0.32,
    smile: 0.08,
    sparkle: 0.6,
    petals: 0,
    glint: 0,
  },
  Folicular: {
    tint: '#b6e8ce',
    speed: 1.04,
    sway: 0.78,
    smile: 0.7,
    sparkle: 0.74,
    petals: 0,
    glint: 0.48,
  },
  Ovulação: {
    tint: '#ffd282',
    speed: 1.22,
    sway: 1.1,
    smile: 1,
    sparkle: 0.91,
    petals: 0,
    glint: 1,
  },
  Lútea: luteal,
  Neutro: luteal,
} satisfies Record<Phase, typeof luteal>;

export function phaseVisuals(phase: Phase | null) {
  return phase === null ? luteal : visuals[phase];
}
