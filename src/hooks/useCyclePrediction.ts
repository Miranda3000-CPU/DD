import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

// Minimum number of past cycles needed to produce a meaningful prediction.
const MIN_CYCLES = 3;

// Physiologically plausible range for a menstrual cycle in days.
const MIN_PLAUSIBLE_DAYS = 21;
const MAX_PLAUSIBLE_DAYS = 45;

export interface CyclePredictionResult {
  /** Predicted duration (in days) for the next cycle, or null if unavailable. */
  prediction: number | null;
  /** True while the TF.js model is being trained. */
  loading: boolean;
  /** Human-readable error message, or null when everything is fine. */
  error: string | null;
}

/**
 * useCyclePrediction
 *
 * Trains a client-side linear regression model (TensorFlow.js) on the
 * provided cycle-duration history and returns the predicted length of the
 * next cycle.
 *
 * @param cycleDurations - Array of past cycle lengths in days, ordered from
 *   oldest to newest (e.g. [28, 27, 30, 29]).
 */
export function useCyclePrediction(cycleDurations: number[]): CyclePredictionResult {
  const [prediction, setPrediction] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current model so we can dispose it on re-train or unmount.
  const modelRef = useRef<tf.Sequential | null>(null);

  useEffect(() => {
    // Not enough data — surface a friendly message and bail out early.
    if (cycleDurations.length < MIN_CYCLES) {
      setPrediction(null);
      setLoading(false);
      setError(
        cycleDurations.length === 0
          ? null
          : `Registre ao menos ${MIN_CYCLES} ciclos para ativar a previsão inteligente.`
      );
      return;
    }

    // Flag to ignore async results after the effect is cleaned up.
    let cancelled = false;

    const trainAndPredict = async () => {
      setLoading(true);
      setError(null);

      // Dispose the previous model before creating a new one.
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }

      try {
        const n = cycleDurations.length;

        // ── Normalise inputs & outputs to [0, 1] ───────────────────────────
        // xs: position indices 0 … n-1  →  represents "which cycle in time"
        // ys: actual durations          →  what we want to predict
        const xsRaw = Array.from({ length: n }, (_, i) => i);
        const ysRaw = cycleDurations;

        const xMax = n - 1 || 1; // avoid division by zero when n === 1
        const yMin = Math.min(...ysRaw);
        const yMax = Math.max(...ysRaw);
        const yRange = yMax - yMin || 1; // avoid division by zero for constant series

        const xsNorm = xsRaw.map((x) => x / xMax);
        const ysNorm = ysRaw.map((y) => (y - yMin) / yRange);

        // Create tensors (disposed below after training).
        const xsTensor = tf.tensor2d(xsNorm, [n, 1]);
        const ysTensor = tf.tensor2d(ysNorm, [n, 1]);

        // ── Build model: single Dense layer = linear regression ────────────
        const model = tf.sequential();
        model.add(
          tf.layers.dense({
            units: 1,
            inputShape: [1],
            // Default kernel/bias initializers are fine for linear regression.
          })
        );
        model.compile({
          optimizer: tf.train.adam(0.1),
          loss: 'meanSquaredError',
        });

        modelRef.current = model;

        // ── Train ───────────────────────────────────────────────────────────
        await model.fit(xsTensor, ysTensor, {
          epochs: 250,
          verbose: 0,
        });

        // Dispose input tensors as soon as training is done.
        xsTensor.dispose();
        ysTensor.dispose();

        if (cancelled) return;

        // ── Predict the NEXT cycle (index n) ───────────────────────────────
        // tf.tidy automatically disposes intermediate tensors.
        const rawPrediction = tf.tidy(() => {
          const nextIndexNorm = n / xMax;
          const inputTensor = tf.tensor2d([nextIndexNorm], [1, 1]);
          const output = model.predict(inputTensor) as tf.Tensor;
          return output.dataSync()[0];
        });

        // ── Denormalise & clamp ─────────────────────────────────────────────
        const predictedDays = Math.round(rawPrediction * yRange + yMin);
        const clamped = Math.min(
          Math.max(predictedDays, MIN_PLAUSIBLE_DAYS),
          MAX_PLAUSIBLE_DAYS
        );

        if (!cancelled) {
          setPrediction(clamped);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Não foi possível gerar a previsão. Tente novamente mais tarde.');
          console.error('[useCyclePrediction] Training error:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    trainAndPredict();

    // ── Cleanup: cancel pending async work and free GPU/CPU memory ──────────
    return () => {
      cancelled = true;
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
    // Re-run whenever the array content changes (stringify for deep comparison).
  }, [JSON.stringify(cycleDurations)]);

  // Final safety-net disposal when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
        modelRef.current = null;
      }
    };
  }, []);

  return { prediction, loading, error };
}
