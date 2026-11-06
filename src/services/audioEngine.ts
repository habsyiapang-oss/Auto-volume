import { AudioSampleData, FrequencyBands } from '../types/volume';

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  // Ambient Noise Simulator Nodes
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private ambientFilterNode: BiquadFilterNode | null = null;
  private isAmbientNoisePlaying: boolean = false;

  // Demo Player Audio Nodes
  private demoGainNode: GainNode | null = null;
  private speechEqFilterNode: BiquadFilterNode | null = null;
  private demoTrackType: 'podcast' | 'music' | 'navigation' | 'ring' = 'podcast';
  private isDemoPlaying: boolean = false;
  private demoIntervalId: any = null;
  private currentDemoVolume: number = 0.5; // 0 - 1
  private isAutoVolumeApplied: boolean = true;

  // Real-time measurement state
  private calibrationOffset: number = 92; // dB SPL calibration
  private listeners: Set<(data: AudioSampleData) => void> = new Set();
  private simulatedDecibels: number = 42;
  private isMicActive: boolean = false;

  constructor() {
    // Initialized on user interaction
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setCalibrationOffset(offset: number) {
    this.calibrationOffset = offset;
  }

  public setSimulatedDecibels(db: number) {
    this.simulatedDecibels = db;
  }

  public getIsMicActive(): boolean {
    return this.isMicActive;
  }

  public subscribe(cb: (data: AudioSampleData) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Start live microphone input
   */
  public async startMicrophone(): Promise<boolean> {
    try {
      const ctx = this.ensureAudioContext();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
      });

      const micSource = ctx.createMediaStreamSource(this.micStream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.7;

      micSource.connect(this.analyser);
      this.isMicActive = true;

      this.startMeterLoop();
      return true;
    } catch (err) {
      console.warn('Microphone access denied or unavailable. Fallback to simulation mode.', err);
      this.isMicActive = false;
      this.startMeterLoop();
      return false;
    }
  }

  public stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.isMicActive = false;
  }

  /**
   * Main measurement tick running via requestAnimationFrame
   */
  private startMeterLoop() {
    if (this.animFrameId) return;

    const timeData = new Float32Array(512);
    const freqData = new Uint8Array(256);

    const tick = () => {
      let measuredDb = this.simulatedDecibels;
      let rms = 0;
      let bands: FrequencyBands = {
        subBass: 0.1,
        bass: 0.2,
        speech: 0.3,
        presence: 0.2,
        air: 0.1,
      };
      let spectrum = new Uint8Array(32);

      if (this.isMicActive && this.analyser) {
        this.analyser.getFloatTimeDomainData(timeData);
        this.analyser.getByteFrequencyData(freqData);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          sum += timeData[i] * timeData[i];
        }
        rms = Math.sqrt(sum / timeData.length);

        // Compute dB SPL with A-weighting approximation
        const minRms = 1e-5;
        const safeRms = Math.max(rms, minRms);
        const rawDbFs = 20 * Math.log10(safeRms); // -100 to 0 dBFS
        measuredDb = Math.max(30, Math.min(105, rawDbFs + this.calibrationOffset));

        // Aggregate frequency bands
        // freq resolution = (sampleRate / 512) ~ 86Hz per bin at 44.1kHz
        bands = {
          subBass: Math.min(1, (freqData[0] + freqData[1]) / 510),
          bass: Math.min(1, (freqData[2] + freqData[3] + freqData[4]) / 765),
          speech: Math.min(1, (freqData[6] + freqData[10] + freqData[18] + freqData[25]) / 1020),
          presence: Math.min(1, (freqData[35] + freqData[50] + freqData[70]) / 765),
          air: Math.min(1, (freqData[100] + freqData[150] + freqData[200]) / 765),
        };

        // Downsample spectrum for UI (32 bins)
        const step = Math.floor(freqData.length / 32);
        for (let i = 0; i < 32; i++) {
          spectrum[i] = freqData[i * step] || 0;
        }
      } else {
        // Realistic synthetic micro-fluctuations for simulation mode
        const jitter = (Math.random() - 0.5) * 1.8;
        measuredDb = Math.max(30, Math.min(100, this.simulatedDecibels + jitter));
        rms = Math.pow(10, (measuredDb - this.calibrationOffset) / 20);

        // Create representative spectrum shape based on decibels
        const factor = Math.min(1, (measuredDb - 30) / 70);
        for (let i = 0; i < 32; i++) {
          const decay = Math.exp(-i / 12);
          const noise = 0.7 + Math.random() * 0.3;
          spectrum[i] = Math.min(255, Math.floor(factor * 255 * decay * noise));
        }

        bands = {
          subBass: factor * 0.8,
          bass: factor * 0.7,
          speech: factor * 0.65,
          presence: factor * 0.5,
          air: factor * 0.3,
        };
      }

      const sample: AudioSampleData = {
        rms,
        decibels: Math.round(measuredDb * 10) / 10,
        peakDecibels: Math.round(measuredDb * 1.05 * 10) / 10,
        frequencyBands: bands,
        spectrum,
      };

      this.listeners.forEach((cb) => cb(sample));
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  /**
   * Plays realistic synthesized ambient background noise (pink noise + street rumble)
   * so user can hear the noisy environment through their speakers/headphones.
   */
  public toggleAmbientNoise(enable: boolean, decibels: number) {
    const ctx = this.ensureAudioContext();

    if (!enable) {
      if (this.ambientNoiseSource) {
        try {
          this.ambientNoiseSource.stop();
          this.ambientNoiseSource.disconnect();
        } catch (_) {}
        this.ambientNoiseSource = null;
      }
      this.isAmbientNoisePlaying = false;
      return;
    }

    if (this.isAmbientNoisePlaying) {
      this.updateAmbientNoiseVolume(decibels);
      return;
    }

    // Generate 3 seconds of looping pink noise buffer
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this.ambientNoiseSource = ctx.createBufferSource();
    this.ambientNoiseSource.buffer = buffer;
    this.ambientNoiseSource.loop = true;

    // Filter to simulate cafe chatter / street traffic
    this.ambientFilterNode = ctx.createBiquadFilter();
    this.ambientFilterNode.type = 'lowpass';
    this.ambientFilterNode.frequency.value = 1800;

    this.ambientGainNode = ctx.createGain();
    const gainValue = Math.max(0.01, Math.min(0.8, (decibels - 35) / 75));
    this.ambientGainNode.gain.setValueAtTime(gainValue, ctx.currentTime);

    this.ambientNoiseSource.connect(this.ambientFilterNode);
    this.ambientFilterNode.connect(this.ambientGainNode);
    this.ambientGainNode.connect(ctx.destination);

    this.ambientNoiseSource.start();
    this.isAmbientNoisePlaying = true;
  }

  public updateAmbientNoiseVolume(decibels: number) {
    if (this.ambientGainNode && this.audioCtx) {
      const gainValue = Math.max(0.01, Math.min(0.8, (decibels - 35) / 75));
      this.ambientGainNode.gain.setTargetAtTime(gainValue, this.audioCtx.currentTime, 0.2);
    }
  }

  public getIsAmbientNoisePlaying(): boolean {
    return this.isAmbientNoisePlaying;
  }

  /**
   * Live Audio Demo Synthesizer:
   * Plays simulated speech, music melody, GPS direction, or ringtone.
   */
  public startDemoPlayer(trackType: 'podcast' | 'music' | 'navigation' | 'ring') {
    const ctx = this.ensureAudioContext();
    this.stopDemoPlayer();

    this.demoTrackType = trackType;
    this.isDemoPlaying = true;

    // Create Gain Node for auto volume control
    this.demoGainNode = ctx.createGain();
    const effectiveGain = this.isAutoVolumeApplied ? this.currentDemoVolume : 0.4;
    this.demoGainNode.gain.setValueAtTime(effectiveGain, ctx.currentTime);

    // Speech Clarity Dynamic Biquad Filter (boosts 2.5kHz speech band)
    this.speechEqFilterNode = ctx.createBiquadFilter();
    this.speechEqFilterNode.type = 'peaking';
    this.speechEqFilterNode.frequency.value = 2400;
    this.speechEqFilterNode.Q.value = 1.2;
    this.speechEqFilterNode.gain.value = this.isAutoVolumeApplied ? 4 : 0;

    this.speechEqFilterNode.connect(this.demoGainNode);
    this.demoGainNode.connect(ctx.destination);

    this.playDemoPattern();
  }

  public stopDemoPlayer() {
    this.isDemoPlaying = false;
    if (this.demoIntervalId) {
      clearInterval(this.demoIntervalId);
      this.demoIntervalId = null;
    }
  }

  public getIsDemoPlaying(): boolean {
    return this.isDemoPlaying;
  }

  public getDemoTrackType(): 'podcast' | 'music' | 'navigation' | 'ring' {
    return this.demoTrackType;
  }

  /**
   * Updates real-time audio demo gain when auto-volume changes
   */
  public updateDemoVolume(targetPercentage: number, isAutoApplied: boolean, speechBoost: boolean = true) {
    this.isAutoVolumeApplied = isAutoApplied;
    this.currentDemoVolume = Math.max(0.05, Math.min(1.0, targetPercentage / 100));

    if (this.demoGainNode && this.audioCtx) {
      // In static mode, lock gain to 0.40 (simulating drowned-out audio)
      const targetGain = isAutoApplied ? this.currentDemoVolume : 0.40;
      this.demoGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
    }

    if (this.speechEqFilterNode && this.audioCtx) {
      const eqBoost = isAutoApplied && speechBoost ? (this.currentDemoVolume > 0.6 ? 6 : 3) : 0;
      this.speechEqFilterNode.gain.setTargetAtTime(eqBoost, this.audioCtx.currentTime, 0.15);
    }
  }

  /**
   * Procedural melody and speech simulator using Web Audio API
   */
  private playDemoPattern() {
    if (!this.isDemoPlaying || !this.audioCtx || !this.speechEqFilterNode) return;
    const ctx = this.audioCtx;

    let step = 0;

    // Podcast Speech rhythm simulation (harmonic formant pulses resembling human dialogue)
    const playSpeechSyllable = (freq: number, duration: number) => {
      if (!this.isDemoPlaying) return;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, ctx.currentTime + duration);

      oscGain.gain.setValueAtTime(0, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(oscGain);
      oscGain.connect(this.speechEqFilterNode!);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    };

    // Music tone generator (warm Rhodes / synth chord)
    const playMusicNote = (freq: number, duration: number) => {
      if (!this.isDemoPlaying) return;
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      oscGain.gain.setValueAtTime(0, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(oscGain);
      oscGain.connect(this.speechEqFilterNode!);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    };

    // Navigation chime / cue
    const playNavCue = () => {
      [587.33, 880.0].forEach((freq, i) => {
        setTimeout(() => {
          if (!this.isDemoPlaying) return;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0.28, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.connect(g);
          g.connect(this.speechEqFilterNode!);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }, i * 160);
      });
    };

    // Phone ring cadence (dual frequency: 440Hz + 480Hz US standard tone or marimba)
    const playRingTone = () => {
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        setTimeout(() => {
          if (!this.isDemoPlaying) return;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0.24, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.connect(g);
          g.connect(this.speechEqFilterNode!);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }, idx * 110);
      });
    };

    const intervalTime = this.demoTrackType === 'podcast' ? 180 :
                         this.demoTrackType === 'music' ? 320 :
                         this.demoTrackType === 'navigation' ? 1400 : 900;

    this.demoIntervalId = setInterval(() => {
      if (!this.isDemoPlaying) return;

      if (this.demoTrackType === 'podcast') {
        // Dialogue intonation contour: fundamental pitches 140-280 Hz
        const pitches = [180, 220, 195, 240, 170, 210, 260, 190, 150];
        const pitch = pitches[step % pitches.length];
        const isPause = step % 8 === 7;
        if (!isPause) {
          playSpeechSyllable(pitch, 0.16);
        }
      } else if (this.demoTrackType === 'music') {
        // Pentatonic chill melody (C major pentatonic: C4, D4, E4, G4, A4, C5)
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        const note = scale[Math.floor(Math.random() * scale.length)];
        playMusicNote(note, 0.45);
      } else if (this.demoTrackType === 'navigation') {
        playNavCue();
      } else if (this.demoTrackType === 'ring') {
        playRingTone();
      }

      step++;
    }, intervalTime);
  }

  public destroy() {
    this.stopMicrophone();
    this.toggleAmbientNoise(false, 0);
    this.stopDemoPlayer();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
