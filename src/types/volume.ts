export type AudioStreamType = 'media' | 'call' | 'ring' | 'alarm' | 'navigation';

export type VolumeCurveType = 'sigmoid' | 'linear' | 'stepped' | 'speed_boost';

export interface StreamConfig {
  id: AudioStreamType;
  name: string;
  description: string;
  iconName: 'music' | 'phone' | 'bell' | 'alarm-clock' | 'navigation';
  currentVolume: number; // 0 - 100
  targetVolume: number; // 0 - 100
  minVolume: number; // 0 - 100
  maxVolume: number; // 0 - 100
  sensitivity: number; // 0.5 - 2.0 multiplier
  enabled: boolean;
  color: string;
}

export interface FrequencyBands {
  subBass: number; // 20 - 120 Hz
  bass: number; // 120 - 500 Hz
  speech: number; // 500 - 3500 Hz (critical voice clarity)
  presence: number; // 3.5k - 8k Hz
  air: number; // 8k - 20k Hz
}

export interface AudioSampleData {
  rms: number;
  decibels: number; // calibrated dB SPL
  peakDecibels: number;
  frequencyBands: FrequencyBands;
  spectrum: Uint8Array;
}

export interface AutoVolumeSettings {
  isEnabled: boolean;
  curveType: VolumeCurveType;
  baseOffsetDb: number; // Calibration offset (default: 90)
  minNoiseDb: number; // Floor below which minVolume applies (e.g. 35 dB)
  maxNoiseDb: number; // Ceiling above which maxVolume applies (e.g. 85 dB)
  attackTimeMs: number; // Ramp up speed on noise spike (default: 1200ms)
  releaseTimeMs: number; // Decay speed when noise recedes (default: 3200ms)
  hysteresisDb: number; // Jitter filter deadband (default: 2.0 dB)
  maxSafeVolume: number; // WHO safe listening cap (e.g. 85%)
  hearingProtectionAlert: boolean;
  speedVolumeEnabled: boolean;
  currentSpeedKmh: number;
  pocketModeEnabled: boolean;
  inPocket: boolean;
  speechClarityBoost: boolean; // Fletcher-Munson dynamic speech EQ
  adaptiveMuteAtZeroNoise: boolean;
}

export interface AmbientPreset {
  id: string;
  name: string;
  decibels: number;
  description: string;
  category: 'indoor' | 'commute' | 'outdoor';
}
