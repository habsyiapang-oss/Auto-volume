import React from 'react';
import { Play, Square, Headphones, Zap, Radio, Music, Compass, BellRing } from 'lucide-react';

interface AudioDemoPlayerProps {
  isPlaying: boolean;
  onTogglePlay: (track: 'podcast' | 'music' | 'navigation' | 'ring') => void;
  currentTrack: 'podcast' | 'music' | 'navigation' | 'ring';
  isAutoVolumeEnabled: boolean;
  onToggleAutoVolume: (enabled: boolean) => void;
  calculatedMediaVolume: number;
  currentDecibels: number;
  speechClarityBoost: boolean;
}

export const AudioDemoPlayer: React.FC<AudioDemoPlayerProps> = ({
  isPlaying,
  onTogglePlay,
  currentTrack,
  isAutoVolumeEnabled,
  onToggleAutoVolume,
  calculatedMediaVolume,
  currentDecibels,
  speechClarityBoost,
}) => {
  const tracks: { id: 'podcast' | 'music' | 'navigation' | 'ring'; name: string; subtitle: string; icon: any }[] = [
    {
      id: 'podcast',
      name: 'Podcast Dialogue',
      subtitle: 'Speech Formants & Vocals',
      icon: Radio,
    },
    {
      id: 'music',
      name: 'Chill Melody',
      subtitle: 'Pentatonic Harmonics',
      icon: Music,
    },
    {
      id: 'navigation',
      name: 'GPS Directions',
      subtitle: 'Turn Prompts & Guidance',
      icon: Compass,
    },
    {
      id: 'ring',
      name: 'Incoming Call',
      subtitle: 'Android Ringtone Chime',
      icon: BellRing,
    },
  ];

  const effectiveVolume = isAutoVolumeEnabled ? calculatedMediaVolume : 40;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-tight">
              Interactive Sound Lab: Hear The Auto-Volume Difference
            </h2>
            <span className="text-[11px] font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 rounded-md px-2 py-0.5">
              Live Web Audio
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Test how ambient noise masks smartphone playback and how adaptive gain + speech EQ overcomes it
          </p>
        </div>

        {/* Global Play / Stop Button */}
        <button
          onClick={() => onTogglePlay(currentTrack)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md active:scale-[0.98] ${
            isPlaying
              ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/20'
              : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-cyan-500/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="h-4 w-4 fill-current" />
              <span>Stop Playback</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>Start Audio Demonstration</span>
            </>
          )}
        </button>
      </div>

      {/* A/B Comparison Toggle Bar */}
      <div className="mt-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">A/B Instant Listening Comparison</div>
            <div className="text-[11px] text-slate-400">
              Toggle between static 40% volume vs intelligent real-time dynamic level
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            onClick={() => onToggleAutoVolume(false)}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isAutoVolumeEnabled
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fixed Standard (40%)
          </button>
          <button
            onClick={() => onToggleAutoVolume(true)}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isAutoVolumeEnabled
                ? 'bg-cyan-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Smart Auto-Volume ({calculatedMediaVolume}%)</span>
          </button>
        </div>
      </div>

      {/* Selectable Test Audio Tracks */}
      <div className="mt-5">
        <span className="text-xs font-semibold text-slate-300 block mb-2.5">
          Select Demonstration Sound Stream:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tracks.map((track) => {
            const isSelected = currentTrack === track.id;
            const Icon = track.icon;
            return (
              <button
                key={track.id}
                onClick={() => onTogglePlay(track.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected && isPlaying && (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
                      <span className="w-0.5 h-2 bg-cyan-400 animate-pulse delay-75" />
                      <span className="w-0.5 h-3 bg-cyan-400 animate-pulse delay-150" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-semibold">{track.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{track.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Level & Intelligibility Feedback */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Applied Gain Level
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {effectiveVolume}%
            </span>
            <span className="text-xs text-slate-400">
              {isAutoVolumeEnabled ? 'Adaptive Mode' : 'Fixed Mode'}
            </span>
          </div>
          {/* Progress visual */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                isAutoVolumeEnabled ? 'bg-cyan-400' : 'bg-slate-400'
              }`}
              style={{ width: `${effectiveVolume}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Speech Clarity Dynamic EQ
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-sm font-semibold ${
                speechClarityBoost && isAutoVolumeEnabled ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {speechClarityBoost && isAutoVolumeEnabled ? '+4.5 dB (2.4 kHz Boost)' : 'Flat EQ (0 dB)'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Overcomes Fletcher-Munson auditory masking against traffic/crowd rumble.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Signal-to-Noise Ratio (SNR)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                effectiveVolume >= currentDecibels * 0.8 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {effectiveVolume >= currentDecibels * 0.8 ? '+9.5 dB' : '-3.2 dB (Masked)'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {effectiveVolume >= currentDecibels * 0.8
              ? 'Clear intelligibility over background'
              : 'Drowned out by ambient noise'}
          </p>
        </div>
      </div>
    </div>
  );
};
