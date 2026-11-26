import type { Phase } from '../../utils/dateUtils';

export type AvatarFrame = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'touch';

const phaseFrames: Record<Phase, Exclude<AvatarFrame, 'touch'>> = {
  Menstrual: 'menstrual',
  Folicular: 'follicular',
  Ovulação: 'ovulatory',
  Lútea: 'luteal',
  Neutro: 'luteal',
};

export function avatarFrameFor(phase: Phase | null): Exclude<AvatarFrame, 'touch'> {
  return phase ? phaseFrames[phase] : 'luteal';
}

export function avatarFrameUrl(frame: AvatarFrame): string {
  return `/avatar/${frame}.webp`;
}
