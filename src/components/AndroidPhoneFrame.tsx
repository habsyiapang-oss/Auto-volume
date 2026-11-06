import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Wifi,
  Battery,
  Music,
  Phone,
  Bell,
  Clock,
  Sparkles,
  Pocket,
  Gauge,
  SlidersHorizontal,
  Navigation,
} from 'lucide-react';
import { StreamConfig, AudioStreamType } from '../types/volume';

interface AndroidPhoneFrameProps {
  streams: StreamConfig[];
  activeStreamId: AudioStreamType;
  onSelectStream: (id: AudioStreamType) => void;
  onVolumeChange: (id: AudioStreamType, newVol: number) => void;
  currentDecibels: number;
  isEngineActive: boolean;
  inPocket: boolean;
  currentSpeedKmh: number;
  speedVolumeEnabled: boolean;
  adaptiveMuteAtZeroNoise: boolean;
}

export const AndroidPhoneFrame: React.FC<AndroidPhoneFrameProps> = ({
  streams,
  activeStreamId,
  onSelectStream,
  onVolumeChange,
  currentDecibels,
  isEngineActive,
  inPocket,
  currentSpeedKmh,
  speedVolumeEnabled,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeStream = streams.find((s) => s.id === activeStreamId) || streams[0];

  const getStreamIcon = (type: AudioStreamType, vol: number) => {
    if (vol === 0) return <VolumeX className="h-4 w-4" />;
    switch (type) {
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
        return <Volume2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[360px] rounded-[44px] bg-slate-900 border-[7px] border-slate-800 shadow-2xl shadow-cyan-950/20 overflow-hidden select-none">
      {/* Front Camera Notch / Punch Hole */}
      <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-black border border-slate-800 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
        </div>
      </div>

      {/* Outer Volume Rocker buttons (Visual hardware representation) */}
      <div className="absolute -left-[10px] top-28 w-1 h-12 bg-slate-700 rounded-l-sm" />
      <div className="absolute -left-[10px] top-44 w-1 h-12 bg-slate-700 rounded-l-sm" />
      <div className="absolute -right-[10px] top-32 w-1 h-16 bg-slate-700 rounded-r-sm" />

      {/* Screen Area (Android 15 OS Mockup) */}
      <div className="relative min-h-[580px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 flex flex-col justify-between">
        {/* Status Bar */}
        <div className="relative z-20 flex items-center justify-between text-[11px] font-semibold text-slate-300 pt-1 px-2 font-mono">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-cyan-400 font-sans tracking-wide">5G</span>
            <Wifi className="h-3 w-3 text-slate-300" />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px]">88%</span>
              <Battery className="h-3.5 w-3.5 text-slate-300" />
            </div>
          </div>
        </div>

        {/* Ambient Sensor Badge overlay */}
        <div className="mt-3 px-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-slate-800/90 border border-slate-700/60 text-[10px] text-slate-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isEngineActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>Mic: {currentDecibels.toFixed(0)} dB</span>
          </div>

          {inPocket && (
            <div className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-medium text-amber-400">
              <Pocket className="h-3 w-3" />
              <span>In Pocket</span>
            </div>
          )}

          {speedVolumeEnabled && currentSpeedKmh > 20 && (
            <div className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-medium text-cyan-300">
              <Gauge className="h-3 w-3" />
              <span>{Math.round(currentSpeedKmh)} km/h</span>
            </div>
          )}
        </div>

        {/* Android 15 Floating Volume Panel (The Star UI element) */}
        <div className="my-auto py-4 px-2">
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-xl">
            {/* Header info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                  {getStreamIcon(activeStream.id, activeStream.currentVolume)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white capitalize">
                    {activeStream.name} Volume
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEngineActive ? 'Dynamic Adaptive' : 'Manual Lock'}
                  </div>
                </div>
              </div>

              {/* Volume Percentage */}
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono tabular-nums text-white">
                  {Math.round(activeStream.currentVolume)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">%</span>
              </div>
            </div>

            {/* Material 3 Android 15 Thick Slider Bar */}
            <div className="relative h-14 w-full rounded-2xl bg-slate-950 p-1 flex items-center overflow-hidden border border-slate-800">
              {/* Fill Track */}
              <div
                className="h-full rounded-xl bg-cyan-400 transition-all duration-150 ease-out flex items-center justify-end pr-3"
                style={{ width: `${Math.max(8, activeStream.currentVolume)}%` }}
              >
                {/* Visual tactile thumb wave */}
                <div className="w-1.5 h-6 rounded-full bg-slate-950/40" />
              </div>

              {/* Interactive Range Input overlay */}
              <input
                type="range"
                min={0}
                max={100}
                value={activeStream.currentVolume}
                onChange={(e) => onVolumeChange(activeStream.id, Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
              />
            </div>

            {/* Stream Selector Buttons (Android Sound Assistant pill bar) */}
            <div className="mt-3 grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/60">
              {streams.map((stream) => {
                const isSelected = stream.id === activeStreamId;
                return (
                  <button
                    key={stream.id}
                    onClick={() => onSelectStream(stream.id)}
                    className={`py-2 px-1 rounded-xl text-center transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold'
                        : 'bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {getStreamIcon(stream.id, stream.currentVolume)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider truncate">
                      {stream.name}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums">
                      {Math.round(stream.currentVolume)}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Android 15 Ongoing Adaptive Notification Card */}
          <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <div className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200">
                    Adaptive Sound Engine
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Now</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  {currentDecibels > 70
                    ? `Noisy environment (${currentDecibels.toFixed(0)} dB). Automatically boosted for speech intelligibility.`
                    : currentDecibels < 45
                    ? `Quiet environment (${currentDecibels.toFixed(0)} dB). Volume softened for comfort.`
                    : `Balanced ambient noise (${currentDecibels.toFixed(0)} dB). Auto-tracking engaged.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Android Navigation Gesture Pill Bar */}
        <div className="relative z-20 flex justify-center pb-1">
          <div className="w-32 h-1 bg-slate-500 rounded-full" />
        </div>
      </div>
    </div>
  );
};
