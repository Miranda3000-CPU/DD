import { useEffect, useRef, useState } from 'react';
import type { Phase } from '../../utils/dateUtils';
import type { AvatarScene } from './AvatarScene';

export interface AvatarProps {
  currentPhase: Phase | null;
  cycleDay: number | null;
}

export function CycleAvatar({ currentPhase, cycleDay }: AvatarProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<AvatarScene | null>(null);
  const latest = useRef<AvatarProps>({ currentPhase, cycleDay });
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    latest.current = { currentPhase, cycleDay };
    scene.current?.update(latest.current);
  }, [currentPhase, cycleDay]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const controller = new AbortController();
    async function start(target: HTMLCanvasElement) {
      try {
        const { createAvatarScene } = await import('./AvatarScene');
        if (controller.signal.aborted) return;
        scene.current = createAvatarScene(target, latest.current, controller.signal, setState);
      } catch {
        if (!controller.signal.aborted) setState('unavailable');
      }
    }
    void start(element);
    return () => {
      controller.abort();
      scene.current = null;
    };
  }, []);

  return (
    <figure
      className="relative m-0 h-full w-full"
      aria-label="Avatar de Giovanna"
      data-avatar-state={state}
    >
      <canvas
        ref={canvas}
        aria-label={
          cycleDay && cycleDay > 0 ? `Giovanna em 3D, dia ${cycleDay} do ciclo` : 'Giovanna em 3D'
        }
        role="img"
        aria-hidden={state !== 'ready'}
        className="block h-full w-full"
      />
      {state === 'unavailable' && (
        <figcaption className="absolute inset-0 grid place-content-center p-3 text-center text-xs text-muted-foreground">
          Visualização 3D indisponível neste dispositivo.
        </figcaption>
      )}
    </figure>
  );
}
