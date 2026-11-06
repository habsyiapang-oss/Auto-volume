import React from 'react';
import { StreamConfig, AudioStreamType } from '../types/volume';
import { Music, Phone, Bell, Clock, Navigation, CheckCircle2, Sliders, Play } from 'lucide-react';

interface StreamMixerProps {
  streams: StreamConfig[];
  onUpdateStream: (updated: StreamConfig) => void;
  activeStreamId: AudioStreamType;
  onSelectStream: (id: AudioStreamType) => void;
  onPreviewStreamSound: (id: AudioStreamType) => void;
}

export const StreamMixer: React.FC<StreamMixerProps> = ({
  streams,
  onUpdateStream,
  activeStreamId,
  onSelectStream,
  onPreviewStreamSound,
}) => {
  const getIcon = (id: AudioStreamType) => {
    switch (id) {
      case 'media':
        return <Music className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'ring':
        return <Bell className="h-4 w-4" />;
      case 'alarm':
        return <Clock className="h-4 w-4" />;
      case 'navigation':
        return <Navigation className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Android Multi-Stream Volume Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure independent dynamic sensitivity, floor boundaries, and ceilings per audio stream
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-400">
          Android AudioManager Stream Mapping
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {streams.map((stream) => {
          const isSelected = stream.id === activeStreamId;

          return (
            <div
              key={stream.id}
              onClick={() => onSelectStream(stream.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-950/90 border-cyan-500/40 shadow-sm shadow-cyan-950/20'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    {getIcon(stream.id)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white capitalize">
                      {stream.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{stream.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewStreamSound(stream.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Preview stream audio"
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStream({ ...stream, enabled: !stream.enabled });
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                      stream.enabled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {stream.enabled ? 'Auto' : 'Locked'}
                  </button>
                </div>
              </div>

              {/* Current Calculated Level Bar */}
              <div className="my-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Live Target Output:</span>
                  <span className="font-mono tabular-nums font-semibold text-white">
                    {Math.round(stream.currentVolume)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150 ease-out"
                    style={{ width: `${stream.currentVolume}%` }}
                  />
                </div>
              </div>

              {/* Range Boundaries & Sensitivity Sliders */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/60">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Floor:</span>
                    <span className="font-mono text-slate-300">{stream.minVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={stream.minVolume}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdateStream({ ...stream, minVolume: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Ceiling:</span>
                    <span className="font-mono text-slate-300">{stream.maxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={stream.maxVolume}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdateStream({ ...stream, maxVolume: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Gain Curve:</span>
                    <span className="font-mono text-slate-300">{stream.sensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={stream.sensitivity}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdateStream({ ...stream, sensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
