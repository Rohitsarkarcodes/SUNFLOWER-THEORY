export enum StoryScene {
  LOADING = 'LOADING',
  HERO = 'HERO',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  SCIENCE = 'SCIENCE',
  GOLDEN_HOUR = 'GOLDEN_HOUR',
  SUNSET = 'SUNSET',
  NIGHT = 'NIGHT',
  ENDING = 'ENDING'
}

export interface Point {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: 'pollen' | 'petal' | 'firefly' | 'star' | 'cloud' | 'bee' | 'butterfly';
  angle?: number;
  speed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  rotation?: number;
  rotSpeed?: number;
  pulseSpeed?: number;
  pulsePhase?: number;
}

export interface ConstellationPoint extends Point {
  alpha: number;
  time: number;
}

export interface InteractiveState {
  mouseX: number;
  mouseY: number;
  targetMouseX: number;
  targetMouseY: number;
  isMouseDown: boolean;
  constellation: ConstellationPoint[];
  windForceX: number;
  windForceY: number;
}
