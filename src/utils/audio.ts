// Procedural Web Audio API Soundscape Synthesizer for Sunflower Theory
import { StoryScene } from '../types';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private initialized = false;
  private isPlaying = false;

  // Master volumes & Gain nodes
  private masterGain: GainNode | null = null;
  private pianoGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private birdsGain: GainNode | null = null;
  private cricketsGain: GainNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;

  // Timers and intervals for active synthesis
  private pianoIntervalId: any = null;
  private windIntervalId: any = null;
  private birdsIntervalId: any = null;
  private cricketsIntervalId: any = null;
  private heartbeatIntervalId: any = null;

  // Current chord progression index
  private chordIndex = 0;

  // Chords definitions (frequencies in Hz)
  private chords: { [key in StoryScene]?: number[][] } = {
    [StoryScene.HERO]: [
      [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
      [174.61, 261.63, 329.63, 392.00, 440.00], // Fmaj9
    ],
    [StoryScene.MORNING]: [
      [130.81, 196.00, 246.94, 293.66, 392.00], // Cmaj7(9)
      [174.61, 261.63, 329.63, 392.00, 440.00], // Fmaj9
      [146.83, 220.00, 293.66, 349.23, 440.00], // Dm9
    ],
    [StoryScene.AFTERNOON]: [
      [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj7
      [174.61, 261.63, 329.63, 440.00, 523.25], // Fmaj9 (bright)
      [196.00, 293.66, 392.00, 440.00, 493.88], // G6/9
    ],
    [StoryScene.SCIENCE]: [
      [146.83, 220.00, 293.66, 349.23, 392.00], // Dm11
      [196.00, 293.66, 392.00, 440.00, 493.88], // G9
    ],
    [StoryScene.GOLDEN_HOUR]: [
      [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
      [110.00, 220.00, 261.63, 329.63, 440.00], // Am9
      [87.31, 174.61, 261.63, 329.63, 392.00],  // Fmaj7
    ],
    [StoryScene.SUNSET]: [
      [110.00, 220.00, 261.63, 329.63, 392.00], // Am7(9)
      [87.31, 174.61, 261.63, 329.63, 349.23],  // Fmaj7
      [98.00, 196.00, 293.66, 329.63, 392.00],  // Em7
    ],
    [StoryScene.NIGHT]: [
      [110.00, 164.81, 261.63, 329.63, 493.88], // Am9 (deep, moody)
      [87.31, 174.61, 261.63, 329.63, 440.00],  // Fmaj9
      [73.42, 146.83, 220.00, 293.66, 392.00],  // Dm9
      [110.00, 164.81, 220.00, 261.63, 329.63], // Am7
    ],
    [StoryScene.ENDING]: [
      [130.81, 196.00, 246.94, 329.63, 493.88], // Cmaj9
      [87.31, 174.61, 261.63, 329.63, 440.00],  // Fmaj9
    ]
  };

  private currentScene: StoryScene = StoryScene.LOADING;

  public async init() {
    if (this.initialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      // Create Nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // start silent
      this.masterGain.connect(this.ctx.destination);

      this.pianoGain = this.ctx.createGain();
      this.pianoGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      
      // Delay effect for beautiful ambient piano space
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.setValueAtTime(0.6, this.ctx.currentTime);
      this.feedbackGain = this.ctx.createGain();
      this.feedbackGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      this.pianoGain.connect(this.masterGain);
      this.pianoGain.connect(this.delayNode);
      this.delayNode.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayNode);
      this.feedbackGain.connect(this.masterGain);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      this.windGain.connect(this.masterGain);

      this.birdsGain = this.ctx.createGain();
      this.birdsGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.birdsGain.connect(this.masterGain);

      this.cricketsGain = this.ctx.createGain();
      this.cricketsGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.cricketsGain.connect(this.masterGain);

      this.heartbeatGain = this.ctx.createGain();
      this.heartbeatGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.heartbeatGain.connect(this.masterGain);

      this.initialized = true;
      this.startSynthesisLoops();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public play() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    
    // Smooth master fade-in
    this.masterGain?.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 2.0);
  }

  public pause() {
    if (!this.ctx) return;
    this.isPlaying = false;
    this.masterGain?.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
  }

  public isSoundPlaying(): boolean {
    return this.isPlaying;
  }

  // Crossfade sound components based on the scroll scene progress
  public updateScene(scene: StoryScene, sceneProgress: number = 0) {
    this.currentScene = scene;
    if (!this.initialized || !this.ctx) return;

    const now = this.ctx.currentTime;

    // Default target gains
    let targetWind = 0.08;
    let targetBirds = 0.0;
    let targetCrickets = 0.0;
    let targetHeartbeat = 0.0;
    let targetPiano = 0.35;

    switch (scene) {
      case StoryScene.LOADING:
        targetWind = 0.02;
        targetPiano = 0.1;
        break;

      case StoryScene.HERO:
        targetWind = 0.06;
        targetPiano = 0.35;
        break;

      case StoryScene.MORNING:
        targetWind = 0.08;
        targetBirds = 0.12 * (1 - sceneProgress); // birds loudest in morning
        targetPiano = 0.4;
        break;

      case StoryScene.AFTERNOON:
        targetWind = 0.07;
        targetBirds = 0.06;
        targetPiano = 0.42;
        break;

      case StoryScene.SCIENCE:
        targetWind = 0.04;
        targetPiano = 0.3;
        break;

      case StoryScene.GOLDEN_HOUR:
        targetWind = 0.09;
        targetCrickets = 0.02 * sceneProgress; // crickets start peeking in
        targetPiano = 0.45;
        break;

      case StoryScene.SUNSET:
        targetWind = 0.05 * (1 - sceneProgress) + 0.02 * sceneProgress;
        targetCrickets = 0.02 * (1 - sceneProgress) + 0.15 * sceneProgress;
        targetPiano = 0.35;
        break;

      case StoryScene.NIGHT:
        targetWind = 0.03;
        targetCrickets = 0.22;
        targetHeartbeat = 0.35;
        targetPiano = 0.3;
        break;

      case StoryScene.ENDING:
        targetWind = 0.01;
        targetCrickets = 0.02;
        targetPiano = 0.2 * (1 - sceneProgress); // slowly fade out completely
        break;
    }

    // Set smooth ramps
    this.windGain?.gain.setTargetAtTime(targetWind, now, 1.5);
    this.birdsGain?.gain.setTargetAtTime(targetBirds, now, 1.5);
    this.cricketsGain?.gain.setTargetAtTime(targetCrickets, now, 1.5);
    this.heartbeatGain?.gain.setTargetAtTime(targetHeartbeat, now, 2.0);
    this.pianoGain?.gain.setTargetAtTime(targetPiano, now, 1.5);
  }

  private startSynthesisLoops() {
    if (!this.ctx) return;

    // 1. Procedural Wind Synthesis (White Noise + Bandpass Filter Modulation)
    this.synthesizeWind();

    // 2. Procedural Piano (Dreamy ambient arpeggio chord player)
    this.schedulePianoArpeggio();

    // 3. Random Morning Bird Chirping
    this.scheduleBirdChirps();

    // 4. Night Crickets Noise
    this.scheduleCrickets();

    // 5. Heartbeat Bass
    this.scheduleHeartbeat();
  }

  private synthesizeWind() {
    if (!this.ctx || !this.windGain) return;

    try {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Fill buffer with white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoiseNode = this.ctx.createBufferSource();
      whiteNoiseNode.buffer = noiseBuffer;
      whiteNoiseNode.loop = true;

      // Bandpass filter to make it sound like rushing air
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      whiteNoiseNode.connect(filter);
      filter.connect(this.windGain);
      whiteNoiseNode.start();

      // Moderate filter frequency sweeps over time to mimic wind gusts
      let waveAngle = 0;
      this.windIntervalId = setInterval(() => {
        if (!this.isPlaying || !this.ctx) return;
        waveAngle += 0.05;
        // Sweeps between 150Hz and 650Hz
        const targetFreq = 400 + Math.sin(waveAngle) * 200 + Math.sin(waveAngle * 0.4) * 80;
        filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.4);
      }, 100);
    } catch (e) {
      console.warn('Wind synthesis error:', e);
    }
  }

  private schedulePianoArpeggio() {
    const playNextPianoNote = () => {
      if (!this.isPlaying || !this.ctx || !this.pianoGain) return;

      const now = this.ctx.currentTime;
      const sceneChords = this.chords[this.currentScene] || this.chords[StoryScene.HERO]!;
      const chord = sceneChords[this.chordIndex % sceneChords.length];

      // Arpeggiate chord notes randomly or sequentially
      const numNotes = chord.length;
      const randomNoteIndex = Math.floor(Math.random() * numNotes);
      const freq = chord[randomNoteIndex];

      // Mellow Synth design (piano-like)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Warm tone using triangle + low sine
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      
      osc2.type = 'sine';
      // Sub octave or harmonics depending on pitch
      osc2.frequency.setValueAtTime(freq * 0.5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(1.0, now);

      noteGain.gain.setValueAtTime(0, now);
      // Nice decay envelope
      noteGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

      // Connect nodes
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.pianoGain);

      // Start & Stop
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 4.6);
      osc2.stop(now + 4.6);

      // Slow chord shifting
      if (Math.random() < 0.25) {
        this.chordIndex++;
      }
    };

    // Play a notes sequentially on a dreamy clock
    this.pianoIntervalId = setInterval(() => {
      if (!this.isPlaying) return;
      playNextPianoNote();
    }, 1400);
  }

  private scheduleBirdChirps() {
    const playChirp = () => {
      if (!this.isPlaying || !this.ctx || !this.birdsGain) return;
      if (this.currentScene !== StoryScene.MORNING && this.currentScene !== StoryScene.AFTERNOON) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      // Bird sweep starting from high frequency and curving up/down rapidly
      const baseFreq = 2200 + Math.random() * 800;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.18);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.015, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gainNode);
      gainNode.connect(this.birdsGain);

      osc.start(now);
      osc.stop(now + 0.2);

      // Double-chirp occasionally
      if (Math.random() < 0.4) {
        setTimeout(() => {
          if (!this.isPlaying || !this.ctx) return;
          const now2 = this.ctx.currentTime;
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(baseFreq * 1.05, now2);
          osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.05 + 500, now2 + 0.06);
          gain2.gain.setValueAtTime(0, now2);
          gain2.gain.linearRampToValueAtTime(0.01, now2 + 0.02);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now2 + 0.14);
          osc2.connect(gain2);
          gain2.connect(this.birdsGain!);
          osc2.start(now2);
          osc2.stop(now2 + 0.15);
        }, 120);
      }
    };

    // Schedule random chirping every 3 to 7 seconds
    const scheduleNext = () => {
      if (this.birdsIntervalId) clearTimeout(this.birdsIntervalId);
      const delay = 3000 + Math.random() * 4000;
      this.birdsIntervalId = setTimeout(() => {
        playChirp();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  private scheduleCrickets() {
    const playCricketStrop = () => {
      if (!this.isPlaying || !this.ctx || !this.cricketsGain) return;
      if (this.currentScene !== StoryScene.NIGHT && this.currentScene !== StoryScene.SUNSET && this.currentScene !== StoryScene.GOLDEN_HOUR) return;

      const now = this.ctx.currentTime;
      
      // Synthesis of metallic cricket chirp: multiple rapid pulses of very high sine frequency
      const pulseDuration = 0.015;
      const numPulses = 4 + Math.floor(Math.random() * 4);
      const freq = 4200 + Math.random() * 300;

      for (let i = 0; i < numPulses; i++) {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const startTime = now + i * 0.025;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.01, startTime + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + pulseDuration);

        osc.connect(gainNode);
        gainNode.connect(this.cricketsGain);

        osc.start(startTime);
        osc.stop(startTime + pulseDuration + 0.01);
      }
    };

    const scheduleNextCricket = () => {
      if (this.cricketsIntervalId) clearTimeout(this.cricketsIntervalId);
      const delay = 800 + Math.random() * 1200;
      this.cricketsIntervalId = setTimeout(() => {
        playCricketStrop();
        scheduleNextCricket();
      }, delay);
    };

    scheduleNextCricket();
  }

  private scheduleHeartbeat() {
    const playHeartbeat = () => {
      if (!this.isPlaying || !this.ctx || !this.heartbeatGain) return;
      if (this.currentScene !== StoryScene.NIGHT) return;

      const now = this.ctx.currentTime;

      // Pulse 1 (lub)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, now); // deep 55Hz bass

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc1.connect(gain1);
      gain1.connect(this.heartbeatGain);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Pulse 2 (dub) after 0.15s
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      const t2 = now + 0.16;
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(52, t2);

      gain2.gain.setValueAtTime(0, t2);
      gain2.gain.linearRampToValueAtTime(0.16, t2 + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.28);

      osc2.connect(gain2);
      gain2.connect(this.heartbeatGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.35);
    };

    // Heartbeat pulses at 62 BPM (approx every 960ms)
    this.heartbeatIntervalId = setInterval(() => {
      if (!this.isPlaying) return;
      playHeartbeat();
    }, 960);
  }

  public cleanup() {
    if (this.pianoIntervalId) clearInterval(this.pianoIntervalId);
    if (this.windIntervalId) clearInterval(this.windIntervalId);
    if (this.birdsIntervalId) clearTimeout(this.birdsIntervalId);
    if (this.cricketsIntervalId) clearTimeout(this.cricketsIntervalId);
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);

    this.masterGain?.disconnect();
    this.pianoGain?.disconnect();
    this.windGain?.disconnect();
    this.birdsGain?.disconnect();
    this.cricketsGain?.disconnect();
    this.heartbeatGain?.disconnect();
    this.delayNode?.disconnect();
    this.feedbackGain?.disconnect();

    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}

export const soundscape = new SoundscapeEngine();
