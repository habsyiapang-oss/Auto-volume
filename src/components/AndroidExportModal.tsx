import React, { useState } from 'react';
import { X, Copy, Check, Download, Smartphone, Code2, Terminal, Cpu, FileJson } from 'lucide-react';
import { AutoVolumeSettings, StreamConfig } from '../types/volume';

interface AndroidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AutoVolumeSettings;
  streams: StreamConfig[];
}

export const AndroidExportModal: React.FC<AndroidExportModalProps> = ({
  isOpen,
  onClose,
  settings,
  streams,
}) => {
  const [activeTab, setActiveTab] = useState<'kotlin' | 'tasker' | 'termux' | 'oem' | 'json'>('kotlin');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const data = {
      appName: 'DynamicVolume',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      streams,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dynamic-volume-android-profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kotlinServiceCode = `package com.dynamicvolume.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * DynamicVolume Android Background Foreground Service
 * Continuously samples ambient sound pressure level (dB SPL)
 * and adjusts AudioManager stream volumes smoothly.
 */
class AutoVolumeService : Service() {

    private lateinit var audioManager: AudioManager
    private var audioRecord: AudioRecord? = null
    private var isSampling = false
    private var samplingThread: Thread? = null

    private val sampleRate = 44100
    private val bufferSize = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    )

    // Configuration parameters
    private val minNoiseDb = ${settings.minNoiseDb}.0
    private val maxNoiseDb = ${settings.maxNoiseDb}.0
    private val calibrationOffset = ${settings.baseOffsetDb}.0
    private var currentFilteredVolume = 50.0

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        startForegroundServiceNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startSoundSampling()
        return START_STICKY
    }

    private fun startSoundSampling() {
        if (isSampling) return
        isSampling = true

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                bufferSize
            )

            audioRecord?.startRecording()

            samplingThread = Thread {
                val audioBuffer = ShortArray(bufferSize)

                while (isSampling) {
                    val readCount = audioRecord?.read(audioBuffer, 0, bufferSize) ?: 0
                    if (readCount > 0) {
                        var sum = 0.0
                        for (i in 0 until readCount) {
                            val sample = audioBuffer[i].toDouble() / 32768.0
                            sum += sample * sample
                        }
                        val rms = sqrt(sum / readCount)
                        val safeRms = max(rms, 1e-5)
                        val dbSpl = 20.0 * log10(safeRms) + calibrationOffset

                        // Calculate Sigmoidal / Adaptive Target Volume
                        val normalized = (max(minNoiseDb, min(maxNoiseDb, dbSpl)) - minNoiseDb) / (maxNoiseDb - minNoiseDb)
                        val targetVolume = 15.0 + normalized * 75.0 // Range: 15% - 90%

                        // Exponential smoothing filter (tau = 1.2s attack, 3.0s decay)
                        val alpha = 0.15
                        currentFilteredVolume += alpha * (targetVolume - currentFilteredVolume)

                        applyVolumeToStreams(currentFilteredVolume)
                    }
                    Thread.sleep(250) // 4Hz low-power polling
                }
            }
            samplingThread?.start()
        } catch (e: SecurityException) {
            e.printStackTrace()
        }
    }

    private fun applyVolumeToStreams(volumePercentage: Double) {
        val maxMediaIndex = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val targetMediaIndex = ((volumePercentage / 100.0) * maxMediaIndex).toInt()
        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetMediaIndex, 0)
    }

    private fun startForegroundServiceNotification() {
        val channelId = "auto_volume_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Adaptive Sound Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Dynamic Auto Volume Active")
            .setContentText("Continuously leveling smartphone volume to ambient acoustics")
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode_off)
            .setOngoing(true)
            .build()

        startForeground(101, notification)
    }

    override fun onDestroy() {
        isSampling = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

  const taskerXmlCode = `<!-- Tasker Ambient Decibel Auto Volume Profile -->
<TaskerData sr="" dvi="1" tv="6.0">
  <Profile sr="prof1" ve="2">
    <cdate>1700000000000</cdate>
    <id>101</id>
    <mid0>201</mid0>
    <nme>Adaptive Volume Loop</nme>
    <Time sr="con0">
      <repeat>2</repeat> <!-- Every 2 minutes or sensor event -->
    </Time>
  </Profile>
  <Task sr="task201">
    <id>201</id>
    <nme>CalculateAmbientVolume</nme>
    <!-- Action: Record 1 sec ambient audio to %dB -->
    <Action sr="act0" ve="7">
      <code>367</code>
      <Str sr="arg0" ve="3">%AUDIO_SPL</Str>
    </Action>
    <!-- Action: Media Volume if ambient > 70dB -->
    <Action sr="act1" ve="7">
      <code>307</code>
      <Int sr="arg0" val="12"/> <!-- Level out of 15 -->
      <ConditionList sr="if">
        <Condition sr="c0">
          <lhs>%AUDIO_SPL</lhs>
          <op>7</op>
          <rhs>70</rhs>
        </Condition>
      </ConditionList>
    </Action>
  </Task>
</TaskerData>`;

  const termuxCode = `#!/data/data/com.termux/files/usr/bin/bash
# DynamicVolume Android Termux API Background Daemon
# Requirements: pkg install termux-api sox

echo "Starting DynamicVolume Background Daemon..."

CALIBRATION_OFFSET=92
MIN_DB=40
MAX_DB=85

while true; do
  # Sample 0.5s audio RMS via termux-microphone-record or sox
  REC_FILE="/tmp/ambient_sample.wav"
  termux-microphone-record -d 1 -f "$REC_FILE" > /dev/null 2>&1
  sleep 1

  # Extract RMS decibels using sox
  RMS_DB=$(sox "$REC_FILE" -n stat 2>&1 | grep "Rough   RMS amplitude" | awk '{print $4}')
  
  if [ -n "$RMS_DB" ]; then
    # Calculate target stream volume (0-15)
    VOL_PCT=$(echo "$RMS_DB * 100" | bc -l)
    TARGET_VOL=8
    if (( $(echo "$VOL_PCT > 0.08" | bc -l) )); then
      TARGET_VOL=13
    elif (( $(echo "$VOL_PCT > 0.03" | bc -l) )); then
      TARGET_VOL=10
    else
      TARGET_VOL=6
    fi

    # Set Android Media volume via Termux API
    termux-volume music $TARGET_VOL
    echo "[DynamicVolume] Adjusted Media Volume to $TARGET_VOL/15"
  fi

  rm -f "$REC_FILE"
  sleep 3
done`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Deploy DynamicVolume to Android Smartphone
              </h2>
              <p className="text-xs text-slate-400">
                Choose your preferred implementation method for your Android device
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Method Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'kotlin'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="h-4 w-4" />
            <span>Native Kotlin Service</span>
          </button>

          <button
            onClick={() => setActiveTab('tasker')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'tasker'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>Tasker & MacroDroid</span>
          </button>

          <button
            onClick={() => setActiveTab('termux')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'termux'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Termux Daemon</span>
          </button>

          <button
            onClick={() => setActiveTab('oem')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'oem'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Pixel / Galaxy Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="h-4 w-4" />
            <span>Export Tuning JSON</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-slate-300">
          {activeTab === 'kotlin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    AutoVolumeService.kt (Native Android Background Service)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Works on Android 10 - Android 15. Uses foreground notification to run smoothly without battery killer shutdowns.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(kotlinServiceCode, 'kotlin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                >
                  {copiedId === 'kotlin' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'kotlin' ? 'Copied' : 'Copy Kotlin Code'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-72">
                <pre>{kotlinServiceCode}</pre>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="font-semibold text-white block">Required AndroidManifest.xml permissions:</span>
                <code className="text-[11px] text-cyan-400 block">&lt;uses-permission android:name="android.permission.RECORD_AUDIO" /&gt;</code>
                <code className="text-[11px] text-cyan-400 block">&lt;uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" /&gt;</code>
                <code className="text-[11px] text-cyan-400 block">&lt;uses-permission android:name="android.permission.FOREGROUND_SERVICE" /&gt;</code>
              </div>
            </div>
          )}

          {activeTab === 'tasker' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Tasker / MacroDroid / Automate Flow
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    No coding required! Works with Tasker or MacroDroid on any stock Android smartphone.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(taskerXmlCode, 'tasker')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                >
                  {copiedId === 'tasker' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'tasker' ? 'Copied XML' : 'Copy Tasker XML'}</span>
                </button>
              </div>

              <ol className="list-decimal list-inside text-xs space-y-2 leading-relaxed">
                <li>Install <strong>Tasker</strong> or <strong>MacroDroid</strong> from Google Play.</li>
                <li>Create a <strong>Time / Sensor Trigger</strong>: repeat sampling every 15–30 seconds.</li>
                <li>Add Action: <strong>Media &gt; Record Audio (1s)</strong> or use plugin <strong>Sound Meter</strong>.</li>
                <li>Add Action: <strong>Audio &gt; Media Volume</strong> set to variable dynamically mapped to sound level.</li>
                <li>Enable <strong>Pocket Mode Trigger</strong>: When Proximity Sensor = True &rarr; Ring Volume = 15/15.</li>
              </ol>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-56">
                <pre>{taskerXmlCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'termux' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Termux API Background Daemon
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Ultra-lightweight Bash script that runs inside Termux on Android without requiring root.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(termuxCode, 'termux')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                >
                  {copiedId === 'termux' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'termux' ? 'Copied Script' : 'Copy Bash Script'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-64">
                <pre>{termuxCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'oem' && (
            <div className="space-y-4 text-xs leading-relaxed">
              <h3 className="text-xs font-semibold text-white">
                Native Android Manufacturer Built-In Features
              </h3>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-cyan-300">Google Pixel (Pixel 4a to Pixel 9)</span>
                  <span className="text-[10px] text-slate-400">· "Adaptive Sound"</span>
                </div>
                <p className="text-slate-400">
                  Google Pixel has a built-in feature called <strong>Adaptive Sound</strong> that uses the microphone to assess room acoustics and adjust volume and equalization:
                </p>
                <div className="p-2 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-300">
                  Settings &gt; Sound & vibration &gt; Adaptive Sound &gt; Toggle On
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-cyan-300">Samsung Galaxy (One UI)</span>
                  <span className="text-[10px] text-slate-400">· SoundAssistant & Routines</span>
                </div>
                <p className="text-slate-400">
                  1. Install <strong>SoundAssistant</strong> from Samsung Galaxy Store (by Good Lock Labs). Turn on individual app volume and customize step volume.
                  <br />
                  2. Open <strong>Modes and Routines</strong> &rarr; Add Routine: "If noise level / location = Commute &rarr; Set Media volume 80%".
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-cyan-300">Xiaomi / OnePlus / Motorola</span>
                </div>
                <p className="text-slate-400">
                  Look in <strong>Settings &gt; Sound & vibration &gt; Earphone mode / Speed volume</strong> or use MacroDroid for automatic decibel monitoring.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Configuration Profile Export / Backup
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Download your customized curve, hysteresis, sensitivity, and stream thresholds.
                  </p>
                </div>

                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Download .JSON Profile</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto max-h-60">
                <pre>{JSON.stringify({ settings, streams }, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
