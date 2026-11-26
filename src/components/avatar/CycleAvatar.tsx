import { useEffect, useState } from 'react';
import type { Phase } from '../../utils/dateUtils';
import { avatarFrameFor, avatarFrameUrl } from './avatarFrames';

export interface AvatarProps {
  currentPhase: Phase | null;
  cycleDay: number | null;
}

export function CycleAvatar({ currentPhase, cycleDay }: AvatarProps) {
  const [interacting, setInteracting] = useState(false);
  const [interactionKey, setInteractionKey] = useState(0);
  const frame = interacting ? 'touch' : avatarFrameFor(currentPhase);

  useEffect(() => {
    if (!interacting) return;
    const timeout = window.setTimeout(() => setInteracting(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [interacting, interactionKey]);

  const phaseName = currentPhase ?? 'Lútea';

  return (
    <figure
      className="cycle-avatar relative m-0 h-full w-full"
      aria-label={`Avatar de Giovanna, fase ${phaseName}`}
      data-phase={avatarFrameFor(currentPhase)}
      data-interacting={interacting}
    >
      <img
        key={`${frame}-${interactionKey}`}
        src={avatarFrameUrl(frame)}
        alt={
          interacting
            ? 'Giovanna percebe o toque e acena com um sorriso'
            : `Giovanna em uma pose ${phaseName.toLowerCase()}, dia ${cycleDay && cycleDay > 0 ? cycleDay : 'não informado'} do ciclo`
        }
        draggable={false}
        className="cycle-avatar-art absolute inset-0 h-full w-full object-contain"
      />
      {interacting && (
        <span
          className="cycle-avatar-hearts pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <i>♥</i>
          <i>♥</i>
          <i>♥</i>
        </span>
      )}
      <button
        type="button"
        className="absolute inset-0 cursor-pointer touch-manipulation rounded-2xl focus-visible:outline-primary"
        aria-label={
          interacting ? 'Giovanna está respondendo ao toque' : 'Tocar para interagir com Giovanna'
        }
        aria-pressed={interacting}
        onClick={() => {
          setInteracting(true);
          setInteractionKey((key) => key + 1);
        }}
      >
        <span className="absolute inset-x-0 bottom-0 text-[11px] text-muted-foreground">
          {interacting ? 'Oi, Giovanna!' : 'Toque para interagir'}
        </span>
      </button>
    </figure>
  );
}
