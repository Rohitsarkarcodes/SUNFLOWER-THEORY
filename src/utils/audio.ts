// Procedural Web Audio API Soundscape Synthesizer for Sunflower Theory
import { StoryScene } from '../types';

const getAudioCandidateUrls = (): string[] => {
  if (typeof window === 'undefined') return [];

  let importedAssetUrl = '';
  try {
    importedAssetUrl = new URL('../assets/audio.mp3', import.meta.url).href;
  } catch {}

  const candidates: string[] = importedAssetUrl ? [importedAssetUrl] : [];
  const origin = window.location.origin;
  const href = window.location.href;
  const base = (import.meta as any).env?.BASE_URL || './';

  const filenames = ['audio.mp3', 'Khat - RaagTune.mp3', 'Khat%20-%20RaagTune.mp3'];

  for (const name of filenames) {
    try {
      candidates.push(new URL(name, href).href);
    } catch {}

    if (base.startsWith('/')) {
      try {
        candidates.push(origin + base + (base.endsWith('/') ? '' : '/') + name);
      } catch {}
    } else {
      try {
        candidates.push(new URL(base + name, href).href);
      } catch {}
    }

    candidates.push(`./${name}`);
    candidates.push(`/${name}`);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

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

  private bgAudio: HTMLAudioElement | null = null;
  private currentSourceIndex = 0;
  private audioCandidates: string[] = [];
  private unlockListenerAttached = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.bgAudio) return;
    this.audioCandidates = getAudioCandidateUrls();
    this.currentSourceIndex = 0;

    this.bgAudio = new Audio();
    this.bgAudio.loop = true;
    this.bgAudio.volume = 1.0;
    this.bgAudio.preload = 'auto';
    (this.bgAudio as any).playsInline = true;

    if (this.audioCandidates.length > 0) {
      this.bgAudio.src = this.audioCandidates[0];
    }
  }

  public init() {
    if (this.initialized) return;
    this.initAudioElement();

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.pianoGain = this.ctx.createGain();
      this.pianoGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.pianoGain.connect(this.masterGain);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.windGain.connect(this.masterGain);

      this.birdsGain = this.ctx.createGain();
      this.birdsGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.birdsGain.connect(this.masterGain);

      this.cricketsGain = this.ctx.createGain();
      this.cricketsGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.cricketsGain.connect(this.masterGain);

      this.heartbeatGain = this.ctx.createGain();
      this.heartbeatGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.heartbeatGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  private setupUserInteractionUnlock() {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const unlock = () => {
      if (this.isPlaying && this.bgAudio && this.bgAudio.paused) {
        this.bgAudio.play().then(() => {
          this.unlockListenerAttached = false;
        }).catch(() => {
          this.unlockListenerAttached = false;
        });
      } else {
        this.unlockListenerAttached = false;
      }
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  public play() {
    this.isPlaying = true;
    this.initAudioElement();

    if (!this.initialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.bgAudio) {
      this.bgAudio.volume = 1.0;

      const attemptPlay = (startIndex: number) => {
        if (!this.bgAudio) return;
        
        if (startIndex >= this.audioCandidates.length) {
          // If all candidates failed, reset source index back to 0 for next retry
          this.currentSourceIndex = 0;
          this.bgAudio.src = this.audioCandidates[0];
          this.setupUserInteractionUnlock();
          return;
        }

        const candidateSrc = this.audioCandidates[startIndex];
        if (this.bgAudio.src !== candidateSrc) {
          this.bgAudio.src = candidateSrc;
          this.bgAudio.load();
        }

        const promise = this.bgAudio.play();
        if (promise !== undefined) {
          promise.then(() => {
            this.currentSourceIndex = startIndex;
          }).catch((err) => {
            console.warn(`Audio play failed for source index ${startIndex} (${candidateSrc}):`, err);
            
            // Check if error is due to user interaction requirement (NotAllowedError)
            if (err?.name === 'NotAllowedError') {
              this.setupUserInteractionUnlock();
            } else {
              // Try next candidate source
              attemptPlay(startIndex + 1);
            }
          });
        }
      };

      attemptPlay(this.currentSourceIndex);
    }
  }

  public triggerOpeningChord() {
    return;
  }

  public pause() {
    this.isPlaying = false;
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
    if (this.ctx) {
      this.masterGain?.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
    }
  }

  public isSoundPlaying(): boolean {
    return this.isPlaying && !!this.bgAudio && !this.bgAudio.paused;
  }

  // Crossfade sound components based on the scroll scene progress
  public updateScene(_scene: StoryScene, _sceneProgress: number = 0) {
    if (!this.initialized || !this.ctx) return;

    const now = this.ctx.currentTime;

    // All synthesized ambient sounds disabled - only Khat music plays
    this.windGain?.gain.setTargetAtTime(0, now, 0.5);
    this.birdsGain?.gain.setTargetAtTime(0, now, 0.5);
    this.cricketsGain?.gain.setTargetAtTime(0, now, 0.5);
    this.heartbeatGain?.gain.setTargetAtTime(0, now, 0.5);
    this.pianoGain?.gain.setTargetAtTime(0, now, 0.5);
  }

  private startSynthesisLoops() {
    return;
  }

  public cleanup() {
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}

export const soundscape = new SoundscapeEngine();

