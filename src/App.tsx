/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DecibelMeter } from './components/DecibelMeter';
import { AudioDemoPlayer } from './components/AudioDemoPlayer';
import { AndroidPhoneFrame } from './components/AndroidPhoneFrame';
import { StreamMixer } from './components/StreamMixer';
import { CurveTuningStudio } from './components/CurveTuningStudio';
import { SensorSimulator } from './components/SensorSimulator';
import { AndroidExportModal } from './components/AndroidExportModal';
import {
  AudioSampleData,
  AutoVolumeSettings,
  StreamConfig,
  AudioStreamType,
  AmbientPreset,
} from './types/volume';
import { audioEngine } from './services/audioEngine';
import {
  calculateRawVolume,
  smoothVolumeTransition,
  calculateNoiseRisk,
} from './services/volumeCalculator';
import { Volume2, Sparkles, Smartphone, Shield, Zap, Info, Radio, Layers } from 'lucide-react';

const INITIAL_PRESETS: AmbientPreset[] = [
  {
    id: 'bedroom',
    name: 'Quiet Bedroom',
    decibels: 34,
    description: 'Subtle night ambience & stillness',
    category: 'indoor',
  },
  {
    id: 'library',
    name: 'Quiet Library',
    decibels: 42,
    description: 'Pages turning, gentle whisper floor',
    category: 'indoor',
  },
  {
    id: 'office',
    name: 'Modern Office',
    decibels: 54,
    description: 'Typing, distant ventilation, murmurs',
    category: 'indoor',
  },
  {
    id: 'cafe',
    name: 'Bustling Cafe',
    decibels: 68,
    description: 'Espresso machine, conversations, music',
    category: 'commute',
  },
  {
    id: 'traffic',
    name: 'Street Traffic',
    decibels: 76,
    description: 'Vehicles, engine hum, pedestrian crossing',
    category: 'outdoor',
  },
  {
    id: 'subway',
    name: 'Subway Train',
    decibels: 84,
    description: 'Rail track friction, tunnel reverberation',
    category: 'commute',
  },
  {
    id: 'airplane',
    name: 'Flight Cabin',
    decibels: 86,
    description: 'Turbofan jet engine steady drone',
    category: 'commute',
  },
];

const INITIAL_STREAMS: StreamConfig[] = [
  {
    id: 'media',
    name: 'Media',
    description: 'Music, YouTube, Podcasts & Spotify',
    iconName: 'music',
    currentVolume: 45,
    targetVolume: 45,
    minVolume: 15,
    maxVolume: 92,
    sensitivity: 1.0,
    enabled: true,
    color: '#06b6d4',
  },
  {
    id: 'call',
    name: 'Phone Calls',
    description: 'Voice calls & Google Meet earpiece',
    iconName: 'phone',
    currentVolume: 55,
    targetVolume: 55,
    minVolume: 25,
    maxVolume: 95,
    sensitivity: 1.2,
    enabled: true,
    color: '#3b82f6',
  },
  {
    id: 'ring',
    name: 'Ring & Alerts',
    description: 'Incoming calls & SMS chimes',
    iconName: 'bell',
    currentVolume: 60,
    targetVolume: 60,
    minVolume: 30,
    maxVolume: 100,
    sensitivity: 1.1,
    enabled: true,
    color: '#10b981',
  },
  {
    id: 'navigation',
    name: 'Navigation & Voice',
    description: 'Google Maps directions & alarms',
    iconName: 'navigation',
    currentVolume: 50,
    targetVolume: 50,
    minVolume: 20,
    maxVolume: 95,
    sensitivity: 1.15,
    enabled: true,
    color: '#f59e0b',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('meter');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Audio Telemetry State
  const [sampleData, setSampleData] = useState<AudioSampleData>({
    rms: 0.005,
    decibels: 48,
    peakDecibels: 50,
    frequencyBands: {
      subBass: 0.15,
      bass: 0.25,
      speech: 0.35,
      presence: 0.2,
      air: 0.1,
    },
    spectrum: new Uint8Array(32).fill(40),
  });

  const [isMicActive, setIsMicActive] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('office');
  const [isAmbientNoisePlaying, setIsAmbientNoisePlaying] = useState(false);
  const [calibrationOffset, setCalibrationOffset] = useState<number>(92);

  // Auto Volume Algorithm Settings
  const [settings, setSettings] = useState<AutoVolumeSettings>({
    isEnabled: true,
    curveType: 'sigmoid',
    baseOffsetDb: 92,
    minNoiseDb: 35,
    maxNoiseDb: 88,
    attackTimeMs: 1200,
    releaseTimeMs: 3200,
    hysteresisDb: 2.0,
    maxSafeVolume: 85,
    hearingProtectionAlert: true,
    speedVolumeEnabled: true,
    currentSpeedKmh: 0,
    pocketModeEnabled: true,
    inPocket: false,
    speechClarityBoost: true,
    adaptiveMuteAtZeroNoise: false,
  });

  // Android Streams Configuration
  const [streams, setStreams] = useState<StreamConfig[]>(INITIAL_STREAMS);
  const [activeStreamId, setActiveStreamId] = useState<AudioStreamType>('media');

  // Sound Lab Demonstration Player State
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [demoTrack, setDemoTrack] = useState<'podcast' | 'music' | 'navigation' | 'ring'>('podcast');
  const [isAutoVolumeAppliedInDemo, setIsAutoVolumeAppliedInDemo] = useState(true);

  // Animation & smoothing loop references
  const lastTimeRef = useRef<number>(performance.now());
  const smoothedDecibelsRef = useRef<number>(48);

  // Initialize and subscribe to audioEngine
  useEffect(() => {
    audioEngine.setSimulatedDecibels(54);

    const unsubscribe = audioEngine.subscribe((data) => {
      setSampleData(data);
    });

    return () => {
      unsubscribe();
      audioEngine.destroy();
    };
  }, []);

  // Update dynamic volume calculation per tick
  useEffect(() => {
    let animId: number;

    const updateLoop = () => {
      const now = performance.now();
      const deltaSec = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const rawDb = sampleData.decibels;

      // Hysteresis deadband filter
      if (Math.abs(rawDb - smoothedDecibelsRef.current) >= settings.hysteresisDb) {
        smoothedDecibelsRef.current = rawDb;
      }

      const activeDb = smoothedDecibelsRef.current;

      setStreams((prevStreams) => {
        return prevStreams.map((stream) => {
          if (!settings.isEnabled || !stream.enabled) {
            return stream;
          }

          const rawTarget = calculateRawVolume(activeDb, settings, stream);
          const smoothedVol = smoothVolumeTransition(
            stream.currentVolume,
            rawTarget,
            deltaSec,
            settings.attackTimeMs,
            settings.releaseTimeMs
          );

          return {
            ...stream,
            targetVolume: rawTarget,
            currentVolume: smoothedVol,
          };
        });
      });

      // Synchronize live Web Audio demo gain
      const mediaStream = streams.find((s) => s.id === 'media');
      if (mediaStream && isDemoPlaying) {
        audioEngine.updateDemoVolume(
          mediaStream.currentVolume,
          isAutoVolumeAppliedInDemo,
          settings.speechClarityBoost
        );
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [sampleData.decibels, settings, isDemoPlaying, isAutoVolumeAppliedInDemo]);

  // Handlers
  const handleToggleMic = async () => {
    if (isMicActive) {
      audioEngine.stopMicrophone();
      setIsMicActive(false);
    } else {
      const success = await audioEngine.startMicrophone();
      setIsMicActive(success);
      if (success) {
        setSelectedPreset('');
      }
    }
  };

  const handleSelectPreset = (preset: AmbientPreset) => {
    setSelectedPreset(preset.id);
    if (isMicActive) {
      audioEngine.stopMicrophone();
      setIsMicActive(false);
    }
    audioEngine.setSimulatedDecibels(preset.decibels);
    if (isAmbientNoisePlaying) {
      audioEngine.updateAmbientNoiseVolume(preset.decibels);
    }
  };

  const handleToggleAmbientNoise = (enable: boolean) => {
    setIsAmbientNoisePlaying(enable);
    audioEngine.toggleAmbientNoise(enable, sampleData.decibels);
  };

  const handleChangeCalibration = (offset: number) => {
    setCalibrationOffset(offset);
    audioEngine.setCalibrationOffset(offset);
    setSettings((s) => ({ ...s, baseOffsetDb: offset }));
  };

  const handleManualDbChange = (db: number) => {
    setSelectedPreset('');
    audioEngine.setSimulatedDecibels(db);
    if (isAmbientNoisePlaying) {
      audioEngine.updateAmbientNoiseVolume(db);
    }
  };

  const handleToggleDemoPlay = (track: 'podcast' | 'music' | 'navigation' | 'ring') => {
    if (isDemoPlaying && demoTrack === track) {
      audioEngine.stopDemoPlayer();
      setIsDemoPlaying(false);
    } else {
      setDemoTrack(track);
      audioEngine.startDemoPlayer(track);
      setIsDemoPlaying(true);
      const media = streams.find((s) => s.id === 'media');
      audioEngine.updateDemoVolume(
        media ? media.currentVolume : 50,
        isAutoVolumeAppliedInDemo,
        settings.speechClarityBoost
      );
    }
  };

  const handleStreamVolumeChange = (id: AudioStreamType, newVol: number) => {
    setStreams((prev) =>
      prev.map((s) => (s.id === id ? { ...s, currentVolume: newVol, targetVolume: newVol } : s))
    );
  };

  const handleUpdateStreamConfig = (updated: StreamConfig) => {
    setStreams((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handlePreviewStreamSound = (id: AudioStreamType) => {
    const trackMap: Record<AudioStreamType, 'podcast' | 'music' | 'navigation' | 'ring'> = {
      media: 'music',
      call: 'podcast',
      ring: 'ring',
      alarm: 'ring',
      navigation: 'navigation',
    };
    handleToggleDemoPlay(trackMap[id]);
  };

  const mediaStream = streams.find((s) => s.id === 'media') || streams[0];
  const noiseRisk = calculateNoiseRisk(sampleData.decibels);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Bar Contract Compliant Header */}
      <Header
        onOpenExportModal={() => setIsExportModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEngineActive={settings.isEnabled}
        onToggleEngine={() => setSettings((s) => ({ ...s, isEnabled: !s.isEnabled }))}
      />

      {/* Main Content Viewport: Full 1440px desktop baseline */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Top Info Strip with Clean Typographic Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Smart Auto Volume for Android
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span>Dynamic Sound Pressure Adaptation</span>
              <span aria-hidden="true">·</span>
              <span>Psychoacoustic Masking Protection</span>
              <span aria-hidden="true">·</span>
              <span>Android 10–15 Companion Engine</span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Ambient:</span>
              <span className="font-bold text-white tabular-nums">
                {sampleData.decibels.toFixed(1)} dB
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Target Media:</span>
              <span className="font-bold text-cyan-400 tabular-nums">
                {Math.round(mediaStream.currentVolume)}%
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Status:</span>
              <span className={`font-semibold capitalize ${noiseRisk.color}`}>
                {noiseRisk.level}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Left = Active Control Workspace, Right = Android Device Mirror */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Tabbed Modules */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tab navigation for mobile / small screens */}
            <div className="flex md:hidden items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab('meter')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeTab === 'meter' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'
                }`}
              >
                Telemetry
              </button>
              <button
                onClick={() => setActiveTab('demo')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeTab === 'demo' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'
                }`}
              >
                Sound Lab
              </button>
              <button
                onClick={() => setActiveTab('mixer')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeTab === 'mixer' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'
                }`}
              >
                Streams
              </button>
              <button
                onClick={() => setActiveTab('curves')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeTab === 'curves' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'
                }`}
              >
                Curves
              </button>
              <button
                onClick={() => setActiveTab('sensors')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeTab === 'sensors' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400'
                }`}
              >
                Sensors
              </button>
            </div>

            {/* Active Tab Panel */}
            {activeTab === 'meter' && (
              <DecibelMeter
                sampleData={sampleData}
                isMicActive={isMicActive}
                onToggleMic={handleToggleMic}
                selectedPreset={selectedPreset}
                onSelectPreset={handleSelectPreset}
                presets={INITIAL_PRESETS}
                isAmbientNoisePlaying={isAmbientNoisePlaying}
                onToggleAmbientNoise={handleToggleAmbientNoise}
                calibrationOffset={calibrationOffset}
                onChangeCalibration={handleChangeCalibration}
                onManualDbChange={handleManualDbChange}
              />
            )}

            {activeTab === 'demo' && (
              <AudioDemoPlayer
                isPlaying={isDemoPlaying}
                onTogglePlay={handleToggleDemoPlay}
                currentTrack={demoTrack}
                isAutoVolumeEnabled={isAutoVolumeAppliedInDemo}
                onToggleAutoVolume={setIsAutoVolumeAppliedInDemo}
                calculatedMediaVolume={Math.round(mediaStream.currentVolume)}
                currentDecibels={sampleData.decibels}
                speechClarityBoost={settings.speechClarityBoost}
              />
            )}

            {activeTab === 'mixer' && (
              <StreamMixer
                streams={streams}
                onUpdateStream={handleUpdateStreamConfig}
                activeStreamId={activeStreamId}
                onSelectStream={setActiveStreamId}
                onPreviewStreamSound={handlePreviewStreamSound}
              />
            )}

            {activeTab === 'curves' && (
              <CurveTuningStudio
                settings={settings}
                onUpdateSettings={setSettings}
                currentDecibels={sampleData.decibels}
                calculatedVolume={Math.round(mediaStream.currentVolume)}
              />
            )}

            {activeTab === 'sensors' && (
              <SensorSimulator settings={settings} onUpdateSettings={setSettings} />
            )}

            {/* Always visible secondary preview: When on Meter or Mixer, show Sound Lab quick controller below */}
            {activeTab !== 'demo' && (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">
                      Hear Audio Under {sampleData.decibels.toFixed(0)} dB Noise Floor
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Play simulated speech dialogue and switch between fixed vs adaptive gain.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab('demo')}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Open Sound Lab
                  </button>
                  <button
                    onClick={() => handleToggleDemoPlay('podcast')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      isDemoPlaying
                        ? 'bg-rose-500 text-white hover:bg-rose-400'
                        : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                    }`}
                  >
                    {isDemoPlaying ? 'Stop Audio' : 'Quick Listen'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Android 15 Smartphone Mirror & Active System Console */}
          <div className="lg:col-span-4 space-y-5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-300">
                Live Android Device Mirror
              </span>
              <span className="text-[11px] font-mono text-cyan-400">Material You 15</span>
            </div>

            {/* The Authentic Android Phone Mockup */}
            <AndroidPhoneFrame
              streams={streams}
              activeStreamId={activeStreamId}
              onSelectStream={setActiveStreamId}
              onVolumeChange={handleStreamVolumeChange}
              currentDecibels={sampleData.decibels}
              isEngineActive={settings.isEnabled}
              inPocket={settings.inPocket}
              currentSpeedKmh={settings.currentSpeedKmh}
              speedVolumeEnabled={settings.speedVolumeEnabled}
              adaptiveMuteAtZeroNoise={settings.adaptiveMuteAtZeroNoise}
            />

            {/* Android Companion Quick Actions Card */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Android System Deployment</span>
                <span className="text-[10px] text-slate-500">Ready Code</span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ready to run this auto-volume algorithm on your real Android phone? Export the complete Kotlin background service, Tasker automation profile, or Termux daemon.
              </p>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Smartphone className="h-4 w-4" />
                <span>View Kotlin Service & Android Setup</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Export & Android Companion Modal */}
      <AndroidExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        settings={settings}
        streams={streams}
      />
    </div>
  );
}
