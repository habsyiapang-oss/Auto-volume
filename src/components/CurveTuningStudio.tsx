import React from 'react';
import { AutoVolumeSettings, VolumeCurveType } from '../types/volume';
import { calculateRawVolume } from '../services/volumeCalculator';
import { Activity, ShieldAlert, Cpu, Sparkles, Sliders } from 'lucide-react';

interface CurveTuningStudioProps {
  settings: AutoVolumeSettings;
  onUpdateSettings: (newSettings: AutoVolumeSettings) => void;
  currentDecibels: number;
  calculatedVolume: number;
}

export const CurveTuningStudio: React.FC<CurveTuningStudioProps> = ({
  settings,
  onUpdateSettings,
  currentDecibels,
  calculatedVolume,
}) => {
  // Generate points along the curve from 30 dB to 100 dB for SVG rendering
  const curvePoints: { db: number; vol: number; x: number; y: number }[] = [];
  const minDb = 30;
  const maxDb = 100;
  const dummyStream = {
    id: 'media' as const,
    name: 'Media',
    description: '',
    iconName: 'music' as const,
    currentVolume: 50,
    targetVolume: 50,
    minVolume: 15,
    maxVolume: 95,
    sensitivity: 1.0,
    enabled: true,
    color: '#06b6d4',
  };

  const svgWidth = 420;
  const svgHeight = 200;
  const padding = { top: 20, right: 25, bottom: 30, left: 40 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  for (let db = minDb; db <= maxDb; db += 2) {
    const vol = calculateRawVolume(db, settings, dummyStream);
    const x = padding.left + ((db - minDb) / (maxDb - minDb)) * graphWidth;
    const y = padding.top + (1 - vol / 100) * graphHeight;
    curvePoints.push({ db, vol, x, y });
  }

  const pathD = curvePoints.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Calculate current real-time marker position
  const currentClampedDb = Math.max(minDb, Math.min(maxDb, currentDecibels));
  const markerX = padding.left + ((currentClampedDb - minDb) / (maxDb - minDb)) * graphWidth;
  const markerY = padding.top + (1 - calculatedVolume / 100) * graphHeight;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Psychoacoustic Curve & Response Dynamics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time mathematical transfer curve, damping time constants, and hysteresis filter
          </p>
        </div>

        {/* Curve Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          {(
            [
              { id: 'sigmoid', label: 'Sigmoid S-Curve' },
              { id: 'linear', label: 'Linear' },
              { id: 'stepped', label: 'Stepped Zones' },
              { id: 'speed_boost', label: 'Speed Biased' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => onUpdateSettings({ ...settings, curveType: c.id })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                settings.curveType === c.id
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* SVG Curve Graph */}
        <div className="lg:col-span-7 bg-slate-950/90 rounded-2xl p-4 border border-slate-800/90 relative">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">Transfer Function: Input dB → Output Volume</span>
            <span className="font-mono text-cyan-400 tabular-nums">
              Point: {currentDecibels.toFixed(0)} dB → {calculatedVolume}%
            </span>
          </div>

          <svg className="w-full h-52 overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* Grid Lines */}
            {[0, 25, 50, 75, 100].map((v) => {
              const y = padding.top + (1 - v / 100) * graphHeight;
              return (
                <g key={v}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    textAnchor="end"
                  >
                    {v}%
                  </text>
                </g>
              );
            })}

            {[30, 45, 60, 75, 90, 100].map((db) => {
              const x = padding.left + ((db - minDb) / (maxDb - minDb)) * graphWidth;
              return (
                <g key={db}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={svgHeight - padding.bottom}
                    stroke="#1e293b"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={x}
                    y={svgHeight - padding.bottom + 15}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    {db}dB
                  </text>
                </g>
              );
            })}

            {/* WHO Safe Limit Threshold Line (85%) */}
            {settings.maxSafeVolume > 0 && (
              <line
                x1={padding.left}
                y1={padding.top + (1 - settings.maxSafeVolume / 100) * graphHeight}
                x2={svgWidth - padding.right}
                y2={padding.top + (1 - settings.maxSafeVolume / 100) * graphHeight}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
            )}

            {/* The Volume Curve Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-all duration-150"
            />

            {/* Glowing Live Operating Point (Needle on Curve) */}
            <circle
              cx={markerX}
              cy={markerY}
              r="9"
              fill="#38bdf8"
              fillOpacity="0.25"
              className="animate-ping"
            />
            <circle
              cx={markerX}
              cy={markerY}
              r="6"
              fill="#06b6d4"
              stroke="#f8fafc"
              strokeWidth="2"
              className="transition-all duration-100 ease-out"
            />
          </svg>

          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
            <span>X-Axis: Ambient Sound Level (30 dB Whisper - 100 dB Train)</span>
            <span>Y-Axis: Android Stream Volume (0 - 100%)</span>
          </div>
        </div>

        {/* Dynamics & Jitter Damping Parameters */}
        <div className="lg:col-span-5 space-y-4">
          {/* Attack Time Slider */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-300">
                Attack Time (Ramp Up Response)
              </span>
              <span className="text-xs font-mono tabular-nums text-cyan-400">
                {(settings.attackTimeMs / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Dampens sudden short noise (cough, dropped pen) from jarring volume spikes.
            </p>
            <input
              type="range"
              min={300}
              max={3000}
              step={100}
              value={settings.attackTimeMs}
              onChange={(e) =>
                onUpdateSettings({ ...settings, attackTimeMs: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Release / Decay Time Slider */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-300">
                Release Time (Volume Recovery Decay)
              </span>
              <span className="text-xs font-mono tabular-nums text-cyan-400">
                {(settings.releaseTimeMs / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Smoothly relaxes volume when background noise ends, avoiding annoying pump flutter.
            </p>
            <input
              type="range"
              min={1000}
              max={6000}
              step={200}
              value={settings.releaseTimeMs}
              onChange={(e) =>
                onUpdateSettings({ ...settings, releaseTimeMs: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Hysteresis Deadband */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-300">
                Hysteresis Gate (Jitter Deadband)
              </span>
              <span className="text-xs font-mono tabular-nums text-cyan-400">
                ±{settings.hysteresisDb.toFixed(1)} dB
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Suppresses volume slider jitter if environmental noise is steady.
            </p>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={settings.hysteresisDb}
              onChange={(e) =>
                onUpdateSettings({ ...settings, hysteresisDb: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* WHO Safe Hearing Protection Limit */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  WHO 85 dB Safe Listening Cap
                </span>
                <span className="text-[10px] text-slate-400">
                  Clamps maximum media volume to prevent cumulative sensorineural hearing loss.
                </span>
              </div>
            </div>

            <button
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  maxSafeVolume: settings.maxSafeVolume > 0 ? 0 : 85,
                })
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                settings.maxSafeVolume > 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {settings.maxSafeVolume > 0 ? '85% Cap' : 'Uncapped'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
