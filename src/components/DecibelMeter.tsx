import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Sliders, Shield, AlertTriangle } from 'lucide-react';
import { AudioSampleData, AmbientPreset } from '../types/volume';
import { calculateNoiseRisk } from '../services/volumeCalculator';

interface DecibelMeterProps {
  sampleData: AudioSampleData;
  isMicActive: boolean;
  onToggleMic: () => void;
  selectedPreset: string;
  onSelectPreset: (preset: AmbientPreset) => void;
  presets: AmbientPreset[];
  isAmbientNoisePlaying: boolean;
  onToggleAmbientNoise: (enable: boolean) => void;
  calibrationOffset: number;
  onChangeCalibration: (offset: number) => void;
  onManualDbChange: (db: number) => void;
}

export const DecibelMeter: React.FC<DecibelMeterProps> = ({
  sampleData,
  isMicActive,
  onToggleMic,
  selectedPreset,
  onSelectPreset,
  presets,
  isAmbientNoisePlaying,
  onToggleAmbientNoise,
  calibrationOffset,
  onChangeCalibration,
  onManualDbChange,
}) => {
  const [showCalibration, setShowCalibration] = useState(false);
  const risk = calculateNoiseRisk(sampleData.decibels);

  // Calculate needle rotation: 30 dB = -90 deg, 100 dB = +90 deg
  const clampedDb = Math.max(30, Math.min(105, sampleData.decibels));
  const rotationDeg = -90 + ((clampedDb - 30) / 75) * 180;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Ambient Acoustic Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time sound pressure level (dB SPL) & environmental noise spectrum
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalibration(!showCalibration)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/90 rounded-lg hover:bg-slate-700/80 border border-slate-700 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span>Calibrate ({calibrationOffset} dB)</span>
          </button>

          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              isMicActive
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            {isMicActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            <span>{isMicActive ? 'Stop Live Mic' : 'Start Live Mic'}</span>
          </button>
        </div>
      </div>

      {/* Calibration Drawer */}
      {showCalibration && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">
              Microphone Sensitivity & dB SPL Offset
            </span>
            <span className="text-xs font-mono tabular-nums text-cyan-400">
              +{calibrationOffset} dB
            </span>
          </div>
          <input
            type="range"
            min={70}
            max={115}
            value={calibrationOffset}
            onChange={(e) => onChangeCalibration(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Calibrate against a dedicated sound meter or phone app (Sound Meter / Decibel X) to align standard A-weighted sound pressure.
          </p>
        </div>
      )}

      {/* Main Meter View: Gauge + Spectrogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* Analog Radial Decibel Dial */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
          <div className="relative w-56 h-36 flex items-center justify-center">
            {/* Semicircular Track SVG */}
            <svg className="w-56 h-36 overflow-visible" viewBox="0 0 200 120">
              <defs>
                <linearGradient id="dbArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="35%" stopColor="#06b6d4" />
                  <stop offset="65%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>

              {/* Background Arc */}
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Colored Gauge Gradient Arc */}
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="url(#dbArcGrad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="251.3"
                strokeDashoffset={251.3 - (251.3 * ((clampedDb - 30) / 75))}
                className="transition-all duration-150 ease-out"
              />

              {/* Ticks */}
              {[30, 45, 60, 75, 90, 105].map((val) => {
                const angle = -180 + ((val - 30) / 75) * 180;
                const rad = (angle * Math.PI) / 180;
                const x1 = 100 + Math.cos(rad) * 65;
                const y1 = 110 + Math.sin(rad) * 65;
                const x2 = 100 + Math.cos(rad) * 58;
                const y2 = 110 + Math.sin(rad) * 58;
                const tx = 100 + Math.cos(rad) * 48;
                const ty = 110 + Math.sin(rad) * 48;
                return (
                  <g key={val}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="1.5" />
                    <text
                      x={tx}
                      y={ty}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Center Needle */}
              <g
                transform={`translate(100, 110) rotate(${rotationDeg})`}
                className="transition-transform duration-100 ease-out"
              >
                <polygon points="0,-72 -3,-5 0,0 3,-5" fill="#f8fafc" />
                <circle cx="0" cy="0" r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
              </g>
            </svg>
          </div>

          {/* Large Numerical Readout */}
          <div className="mt-2 text-center">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight font-mono tabular-nums text-white">
                {sampleData.decibels.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-slate-400">dB SPL</span>
            </div>

            {/* WHO Safety Level */}
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs">
              <span className={`font-semibold capitalize ${risk.color}`}>
                {risk.level} Environment
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{risk.maxSafeTime}</span>
            </div>
          </div>
        </div>

        {/* Real-time Spectrum & Frequency Analysis */}
        <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Acoustic Frequency Bands & Masking Zone
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                Speech Intelligibility Band: 500Hz - 3.5kHz
              </span>
            </div>

            {/* 32-bin Spectrogram Bars */}
            <div className="h-20 w-full bg-slate-950/80 rounded-xl p-2.5 flex items-end gap-1 border border-slate-800/80">
              {Array.from(sampleData.spectrum).map((val, idx) => {
                const heightPercent = Math.max(6, Math.min(100, (val / 255) * 100));
                // Highlight speech intelligibility band in cyan/amber
                const isSpeechBand = idx >= 6 && idx <= 18;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col justify-end h-full"
                    title={`Bin ${idx}: ${val}`}
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-75 ${
                        isSpeechBand
                          ? 'bg-gradient-to-t from-cyan-500 to-cyan-300'
                          : 'bg-gradient-to-t from-slate-700 to-slate-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1 font-mono">
              <span>20 Hz (Low Rumble)</span>
              <span className="text-cyan-400/90">1 kHz (Speech Core)</span>
              <span>8 kHz (Sibilance)</span>
              <span>20 kHz</span>
            </div>
          </div>

          {/* Quick Frequency Band Breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                Sub-Bass (Rumble)
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold font-mono text-slate-200">
                  {Math.round(sampleData.frequencyBands.subBass * 100)}%
                </span>
                <span className="text-[10px] text-slate-500">Engines/Train</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-cyan-900/30 bg-cyan-950/10">
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block">
                Speech Clarity
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold font-mono text-cyan-300">
                  {Math.round(sampleData.frequencyBands.speech * 100)}%
                </span>
                <span className="text-[10px] text-cyan-500">Conversations</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                High Presence
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold font-mono text-slate-200">
                  {Math.round(sampleData.frequencyBands.presence * 100)}%
                </span>
                <span className="text-[10px] text-slate-500">Wind/Dishes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Presets & Real Audio Simulator */}
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Simulated Acoustic Scenarios
            </span>
            <span className="text-[11px] text-slate-500">
              (Click to test adaptive response instantly)
            </span>
          </div>

          {/* Toggle background noise audio generator */}
          <button
            onClick={() => onToggleAmbientNoise(!isAmbientNoisePlaying)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              isAmbientNoisePlaying
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>
              {isAmbientNoisePlaying
                ? 'Mute Background Audio'
                : 'Synthesize Acoustic Noise in Headphones'}
            </span>
          </button>
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {presets.map((preset) => {
            const isActive = selectedPreset === preset.id && !isMicActive;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate">{preset.name}</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {preset.decibels}dB
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{preset.description}</p>
              </button>
            );
          })}
        </div>

        {/* Manual Decibel Slider for fine-grain testing */}
        {!isMicActive && (
          <div className="mt-4 flex items-center gap-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-xs text-slate-400 shrink-0">Manual dB Drag:</span>
            <input
              type="range"
              min={30}
              max={100}
              step={0.5}
              value={sampleData.decibels}
              onChange={(e) => onManualDbChange(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums text-cyan-300 shrink-0 w-16 text-right">
              {sampleData.decibels.toFixed(1)} dB
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
