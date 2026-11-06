import React, { useState } from 'react';
import { Pocket, Gauge, Sparkles, Compass, MapPin, EyeOff, ShieldCheck } from 'lucide-react';
import { AutoVolumeSettings } from '../types/volume';

interface SensorSimulatorProps {
  settings: AutoVolumeSettings;
  onUpdateSettings: (newSettings: AutoVolumeSettings) => void;
}

export const SensorSimulator: React.FC<SensorSimulatorProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const toggleGpsSpeed = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    if (isGpsActive) {
      setIsGpsActive(false);
      setGpsError(null);
      return;
    }

    setIsGpsActive(true);
    setGpsError(null);

    navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.speed !== null) {
          // speed is in m/s, convert to km/h
          const kmh = Math.round(pos.coords.speed * 3.6);
          onUpdateSettings({ ...settings, currentSpeedKmh: kmh });
        } else {
          // If stationary or speed null
          onUpdateSettings({ ...settings, currentSpeedKmh: 0 });
        }
      },
      (err) => {
        setGpsError(err.message || 'Unable to retrieve location speed.');
        setIsGpsActive(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const calculatedSpeedBoost =
    settings.speedVolumeEnabled && settings.currentSpeedKmh > 20
      ? Math.min(25, Math.round((settings.currentSpeedKmh - 20) * 0.35))
      : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Sensor Fusion & Mobility Adaptation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pocket detection via proximity sensor, GPS velocity compensation, and psychoacoustic EQ
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-400">
          Hardware Sensor Hub (Android HAL)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        {/* Pocket Mode Card */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Pocket className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Pocket & Bag Proximity Boost
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Proximity sensor + ambient light sensor
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    pocketModeEnabled: !settings.pocketModeEnabled,
                  })
                }
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                  settings.pocketModeEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {settings.pocketModeEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              When the phone is placed inside a pocket or backpack, sound is muffled by clothing fabric.
              Pocket Mode boosts ringtone and incoming alerts to 100% volume with haptic vibrations so you never miss urgent calls.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Test Device Pocket State:</span>
            <button
              onClick={() => onUpdateSettings({ ...settings, inPocket: !settings.inPocket })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                settings.inPocket
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {settings.inPocket ? 'Simulating In Pocket' : 'Simulating Handheld'}
            </button>
          </div>
        </div>

        {/* Speed Volume Boost Card */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Speed-Adaptive Wind & Road Boost
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    GPS / Car Bluetooth / Bike velocity
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    speedVolumeEnabled: !settings.speedVolumeEnabled,
                  })
                }
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                  settings.speedVolumeEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {settings.speedVolumeEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Road tire friction and aerodynamic wind noise increase exponentially with vehicle and cycling speed.
              Automatically adds dynamic gain above 20 km/h so navigation voice prompts and music stay crisp.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Simulated Velocity:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums text-white font-semibold">
                  {settings.currentSpeedKmh} km/h
                </span>
                {calculatedSpeedBoost > 0 && (
                  <span className="text-[10px] text-cyan-400 font-mono">
                    (+{calculatedSpeedBoost}% Boost)
                  </span>
                )}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={130}
              step={5}
              value={settings.currentSpeedKmh}
              onChange={(e) =>
                onUpdateSettings({ ...settings, currentSpeedKmh: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={toggleGpsSpeed}
                className={`text-[11px] flex items-center gap-1 font-medium transition-colors ${
                  isGpsActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin className="h-3 w-3" />
                <span>{isGpsActive ? 'Listening to GPS...' : 'Use Real Device GPS'}</span>
              </button>
              {gpsError && <span className="text-[10px] text-rose-400">{gpsError}</span>}
            </div>
          </div>
        </div>

        {/* Dynamic Fletcher-Munson Speech Clarity EQ Card */}
        <div className="md:col-span-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">
                Fletcher-Munson Psychoacoustic Speech Clarity Boost
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Human hearing has non-linear frequency sensitivity (ISO 226 equal-loudness contours). When low-frequency background noise (engines, fans, chatter) masks dialogue, simply cranking the master volume causes harshness. Dynamic clarity boosts the 1 kHz – 3.5 kHz formant band to restore vocal crispness without blaring loudness.
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              onUpdateSettings({
                ...settings,
                speechClarityBoost: !settings.speechClarityBoost,
              })
            }
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
              settings.speechClarityBoost
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {settings.speechClarityBoost ? 'Clarity Boost Active' : 'Flat Response'}
          </button>
        </div>
      </div>
    </div>
  );
};
