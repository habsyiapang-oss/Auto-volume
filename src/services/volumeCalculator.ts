import { AutoVolumeSettings, StreamConfig, VolumeCurveType } from '../types/volume';

/**
 * Calculates raw target volume percentage (0 - 100) based on measured ambient noise in dB SPL.
 */
export function calculateRawVolume(
  ambientDb: number,
  settings: AutoVolumeSettings,
  stream: StreamConfig
): number {
  const { minNoiseDb, maxNoiseDb, curveType } = settings;
  const clampedDb = Math.max(minNoiseDb, Math.min(maxNoiseDb, ambientDb));
  const normalized = (clampedDb - minNoiseDb) / (maxNoiseDb - minNoiseDb || 1);

  let curveFactor = 0;

  switch (curveType) {
    case 'sigmoid': {
      // Smooth Sigmoidal S-curve centered at 0.5
      // y = 1 / (1 + e^(-8 * (x - 0.5)))
      const k = 8;
      const x = normalized;
      const rawSigmoid = 1 / (1 + Math.exp(-k * (x - 0.5)));
      // Normalize between x=0 and x=1 boundaries
      const sig0 = 1 / (1 + Math.exp(-k * (-0.5)));
      const sig1 = 1 / (1 + Math.exp(-k * 0.5));
      curveFactor = (rawSigmoid - sig0) / (sig1 - sig0);
      break;
    }

    case 'linear': {
      // Direct linear mapping
      curveFactor = normalized;
      break;
    }

    case 'stepped': {
      // 4 discrete acoustic zones: Whisper / Quiet / Busy / Crowded
      if (clampedDb < 42) {
        curveFactor = 0.15;
      } else if (clampedDb < 58) {
        curveFactor = 0.45;
      } else if (clampedDb < 75) {
        curveFactor = 0.75;
      } else {
        curveFactor = 1.0;
      }
      break;
    }

    case 'speed_boost': {
      // Base curve plus speed factor
      curveFactor = Math.pow(normalized, 1.2);
      break;
    }

    default:
      curveFactor = normalized;
  }

  // Apply sensitivity multiplier to curve factor (center pivot at 0.5)
  let adjustedFactor = 0.5 + (curveFactor - 0.5) * stream.sensitivity;
  adjustedFactor = Math.max(0, Math.min(1, adjustedFactor));

  // Map into stream min & max volume limits
  let calculatedVolume = stream.minVolume + adjustedFactor * (stream.maxVolume - stream.minVolume);

  // Speed compensation if enabled
  if (settings.speedVolumeEnabled && settings.currentSpeedKmh > 20) {
    const extraSpeed = settings.currentSpeedKmh - 20;
    // +0.3% volume per km/h over 20km/h up to +25%
    const speedBoost = Math.min(25, extraSpeed * 0.35);
    calculatedVolume += speedBoost;
  }

  // Pocket Mode adjustment:
  // If in pocket, ring & alarm jump to max, while media can be muted or kept safe
  if (settings.pocketModeEnabled && settings.inPocket) {
    if (stream.id === 'ring' || stream.id === 'alarm') {
      calculatedVolume = Math.max(calculatedVolume, 95);
    } else if (stream.id === 'media') {
      // Don't blast media if in pocket unless headphones active
      calculatedVolume = Math.min(calculatedVolume, 50);
    }
  }

  // Safe Listening WHO 85dB Limit clamp
  if (settings.maxSafeVolume > 0 && stream.id === 'media') {
    calculatedVolume = Math.min(calculatedVolume, settings.maxSafeVolume);
  }

  return Math.round(Math.max(0, Math.min(100, calculatedVolume)));
}

/**
 * Applies exponential smoothing (attack / release) and hysteresis to volume transitions.
 * Prevents rapid volume jitter when noise momentarily spikes or drops.
 */
export function smoothVolumeTransition(
  currentVol: number,
  targetVol: number,
  deltaSec: number,
  attackTimeMs: number,
  releaseTimeMs: number
): number {
  if (Math.abs(targetVol - currentVol) < 0.2) {
    return targetVol;
  }

  const isRampingUp = targetVol > currentVol;
  const timeConstantMs = isRampingUp ? attackTimeMs : releaseTimeMs;
  const tau = Math.max(0.05, timeConstantMs / 1000);

  // alpha = 1 - e^(-dt / tau)
  const alpha = 1 - Math.exp(-deltaSec / tau);
  const nextVol = currentVol + alpha * (targetVol - currentVol);

  return Math.round(nextVol * 10) / 10;
}

/**
 * Calculates WHO safe listening weekly/daily exposure fraction based on volume level.
 * 85 dB allows 8 hours/day. Each 3 dB increase halves safe exposure time (equal energy rule).
 */
export function calculateNoiseRisk(decibels: number): {
  level: 'safe' | 'moderate' | 'elevated' | 'hazardous';
  color: string;
  maxSafeTime: string;
} {
  if (decibels < 70) {
    return { level: 'safe', color: 'text-emerald-400', maxSafeTime: 'Safe indefinitely' };
  } else if (decibels < 80) {
    return { level: 'moderate', color: 'text-cyan-400', maxSafeTime: '> 24 hours' };
  } else if (decibels < 85) {
    return { level: 'elevated', color: 'text-amber-400', maxSafeTime: '8 hours daily' };
  } else if (decibels < 90) {
    return { level: 'hazardous', color: 'text-orange-400', maxSafeTime: '2 hours daily' };
  } else {
    return { level: 'hazardous', color: 'text-rose-400', maxSafeTime: '< 30 minutes' };
  }
}
