import React, { useEffect, useRef, useState } from 'react';
import { StoryScene, Particle, InteractiveState, Point, ConstellationPoint } from '../types';

interface InteractiveCanvasProps {
  progress: number; // 0 to 100
  activeScene: StoryScene;
  isScienceMode: boolean;
  scientificSunPos: Point;
  onScientificSunMove?: (point: Point) => void;
  loadingProgress: number; // 0 to 100 for LOADING scene
  isCinematicPlaying: boolean;
  onSkipCinematic?: () => void;
}

export default function InteractiveCanvas({
  progress,
  activeScene,
  isScienceMode,
  scientificSunPos,
  onScientificSunMove,
  loadingProgress,
  isCinematicPlaying,
  onSkipCinematic,
}: InteractiveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showMiniSunDragMsg, setShowMiniSunDragMsg] = useState(false);

  // Keep interactive states in refs for real-time 60fps update access without re-renders
  const stateRef = useRef<InteractiveState>({
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    isMouseDown: false,
    constellation: [],
    windForceX: 0,
    windForceY: 0,
  });

  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const clickWavesRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; alpha: number }[]>([]);
  const bloomTimeRef = useRef<number>(0);
  const cinematicFrameRef = useRef<number>(0);
  const cinematicParticlesRef = useRef<any[]>([]);

  // Reset cinematic variables when activated
  useEffect(() => {
    if (isCinematicPlaying) {
      cinematicFrameRef.current = 0;
      cinematicParticlesRef.current = [];
    }
  }, [isCinematicPlaying]);

  // Track size
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
  }, [dimensions]);

  // Handle click effects (exploding petals or shockwaves)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCinematicPlaying) {
      if (onSkipCinematic) {
        onSkipCinematic();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if science mode: allow dragging sun
    if (activeScene === StoryScene.SCIENCE && isScienceMode) {
      const dx = clickX - scientificSunPos.x;
      const dy = clickY - scientificSunPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        // user clicked near sun
        return;
      }
    }

    // Add visual click wave
    clickWavesRef.current.push({
      x: clickX,
      y: clickY,
      radius: 0,
      maxRadius: 120,
      alpha: 1.0,
    });

    // Spawn petal burst!
    const numPetals = 16 + Math.floor(Math.random() * 12);
    for (let i = 0; i < numPetals; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particlesRef.current.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + Math.random() * 2), // tend upwards slightly
        size: 6 + Math.random() * 8,
        alpha: 1.0,
        color: Math.random() > 0.5 ? '#FFD54F' : '#FF8A65',
        type: 'petal',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
      });
    }

    // Interactive night clicks: increase fireflies
    if (activeScene === StoryScene.NIGHT) {
      // If clicked near top-right (moon)
      const moonX = dimensions.width * 0.8;
      const moonY = dimensions.height * 0.25;
      const distToMoon = Math.sqrt((clickX - moonX) ** 2 + (clickY - moonY) ** 2);
      if (distToMoon < 100) {
        // Spawn many fireflies!
        for (let i = 0; i < 15; i++) {
          particlesRef.current.push({
            x: moonX + (Math.random() - 0.5) * 40,
            y: moonY + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 3,
            alpha: 0.8,
            color: '#D4E157',
            type: 'firefly',
            waveFrequency: 0.02 + Math.random() * 0.04,
            waveAmplitude: 0.5 + Math.random() * 1.5,
          });
        }
      }
    }
  };

  // Drag listeners for Science mode sun & Night scene constellations
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    stateRef.current.isMouseDown = true;
    stateRef.current.targetMouseX = x;
    stateRef.current.targetMouseY = y;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    stateRef.current.targetMouseX = x;
    stateRef.current.targetMouseY = y;

    // Create interactive wind
    const dx = x - stateRef.current.mouseX;
    const dy = y - stateRef.current.mouseY;
    stateRef.current.windForceX = Math.min(Math.max(dx * 0.05, -3), 3);
    stateRef.current.windForceY = Math.min(Math.max(dy * 0.05, -3), 3);

    // If mouse is down in Science mode, update draggable sun
    if (stateRef.current.isMouseDown && activeScene === StoryScene.SCIENCE && isScienceMode && onScientificSunMove) {
      onScientificSunMove({ x, y });
    }

    // If mouse is down in Night mode, draw constellation stars
    if (stateRef.current.isMouseDown && activeScene === StoryScene.NIGHT) {
      stateRef.current.constellation.push({
        x,
        y,
        alpha: 1.0,
        time: Date.now(),
      });
      // Limit constellation points
      if (stateRef.current.constellation.length > 50) {
        stateRef.current.constellation.shift();
      }
    }
  };

  const handleMouseUp = () => {
    stateRef.current.isMouseDown = false;
  };

  // Setup initial particles
  useEffect(() => {
    const count = 120;
    const initialParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      initialParticles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 1.0,
        vy: -0.3 - Math.random() * 0.6,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.1 + Math.random() * 0.6,
        color: '#FFD54F',
        type: 'pollen',
        waveFrequency: 0.01 + Math.random() * 0.02,
        waveAmplitude: 0.2 + Math.random() * 0.8,
      });
    }

    // Add some clouds
    for (let i = 0; i < 4; i++) {
      initialParticles.push({
        x: Math.random() * dimensions.width,
        y: 40 + Math.random() * 100,
        vx: 0.05 + Math.random() * 0.08,
        vy: 0,
        size: 100 + Math.random() * 150,
        alpha: 0.04 + Math.random() * 0.08,
        color: '#FFFFFF',
        type: 'cloud',
      });
    }

    // Add starry backdrop
    for (let i = 0; i < 150; i++) {
      initialParticles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height * 0.7,
        vx: 0,
        vy: 0,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.8,
        color: '#FFFFFF',
        type: 'star',
        pulseSpeed: 0.01 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    particlesRef.current = initialParticles;
  }, [dimensions.width, dimensions.height]);

  // Color interpolation helpers
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const hex = (c: string) => {
      const matches = c.match(/\w\w/g);
      if (matches && matches.length === 3) {
        return matches.map((h) => parseInt(h, 16));
      }
      // handle short hex #fff
      const shortMatches = c.match(/\w/g);
      if (shortMatches && shortMatches.length === 3) {
        return shortMatches.map((h) => parseInt(h + h, 16));
      }
      return [0, 0, 0];
    };

    const r1 = hex(color1);
    const r2 = hex(color2);

    const r = Math.round(r1[0] + (r2[0] - r1[0]) * factor);
    const g = Math.round(r1[1] + (r2[1] - r1[1]) * factor);
    const b = Math.round(r1[2] + (r2[2] - r1[2]) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Get sky gradients depending on overall progress
  const getSkyGradientColors = (prog: number): { top: string; bottom: string } => {
    // prog runs from 0 to 100
    if (prog < 15) {
      // Loading into Hero: Dark Navy (#081229) to Dawn Pink (#FF8A65)
      const factor = prog / 15;
      return {
        top: interpolateColor('#040914', '#081229', factor),
        bottom: interpolateColor('#040914', '#FF8A65', factor),
      };
    } else if (prog < 30) {
      // Morning: Dawn Purple/Blue -> Bright Gold/Sky Blue
      const factor = (prog - 15) / 15;
      return {
        top: interpolateColor('#081229', '#64B5F6', factor),
        bottom: interpolateColor('#FF8A65', '#FFD54F', factor),
      };
    } else if (prog < 45) {
      // Afternoon: Bright Sky Blue (#64B5F6) -> Vivid Cyan-Gold
      const factor = (prog - 30) / 15;
      return {
        top: interpolateColor('#64B5F6', '#2196F3', factor),
        bottom: interpolateColor('#FFD54F', '#FFF3B0', factor),
      };
    } else if (prog < 60) {
      // Science / Golden Hour transition: Bright Blue -> Warm Gold Orange (#FF8A65)
      const factor = (prog - 45) / 15;
      return {
        top: interpolateColor('#2196F3', '#FF8A65', factor),
        bottom: interpolateColor('#FFF3B0', '#FFC107', factor),
      };
    } else if (prog < 75) {
      // Sunset: Golden Hour Orange -> Purple Pink Twilight (#6A4C93)
      const factor = (prog - 60) / 15;
      return {
        top: interpolateColor('#FF8A65', '#6A4C93', factor),
        bottom: interpolateColor('#FFC107', '#D32F2F', factor),
      };
    } else if (prog < 90) {
      // Twilight to Night: Purple/Pink -> Deep Navy Starry Void (#081229)
      const factor = (prog - 75) / 15;
      return {
        top: interpolateColor('#6A4C93', '#050B18', factor),
        bottom: interpolateColor('#D32F2F', '#0D1B3E', factor),
      };
    } else {
      // Night to Ending: Deep Navy -> Infinite Black
      const factor = (prog - 90) / 10;
      return {
        top: interpolateColor('#050B18', '#000000', factor),
        bottom: interpolateColor('#0D1B3E', '#000000', factor),
      };
    }
  };

  // Procedural Sunflower Head Drawing
  const drawSunflowerHead = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    bendAngle: number,
    time: number,
    glowIntensity: number = 0,
    petalScale: number = 1.0
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bendAngle);

    // Dynamic wind sway micro-vibration
    const vibr = Math.sin(time * 0.05) * 0.03;
    ctx.rotate(vibr);

    // 1. Core Glow (if applicable, e.g. Night scene)
    if (glowIntensity > 0) {
      ctx.save();
      const gradGlow = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 1.8);
      gradGlow.addColorStop(0, `rgba(255, 243, 176, ${0.4 * glowIntensity})`);
      gradGlow.addColorStop(0.3, `rgba(255, 193, 7, ${0.15 * glowIntensity})`);
      gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradGlow;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Layered Petals (Awwwards level visual detail!)
    const numPetals = 45;
    const layers = [
      { r: size * 0.85, color: '#F9A825', scaleY: 1.0 }, // Back layer (darker gold)
      { r: size * 0.78, color: '#FFC107', scaleY: 0.95 }, // Middle layer (golden yellow)
      { r: size * 0.70, color: '#FFD54F', scaleY: 0.9 }  // Front layer (warm gold)
    ];

    layers.forEach((layer, layerIdx) => {
      ctx.fillStyle = layer.color;
      for (let i = 0; i < numPetals; i++) {
        const angle = (i * Math.PI * 2) / numPetals + (layerIdx * 0.07);
        ctx.save();
        ctx.rotate(angle);
        
        // Petal shape curve
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Drawing gorgeous organic leaf-shaped curved paths
        ctx.quadraticCurveTo(size * 0.15, layer.r * 0.4, size * 0.04, layer.r * petalScale);
        ctx.quadraticCurveTo(-size * 0.15, layer.r * 0.4, 0, 0);
        ctx.closePath();
        ctx.fill();

        // Delicate central petal ridge lines
        ctx.strokeStyle = layerIdx === 2 ? '#F57F17' : '#F9A825';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.1);
        ctx.lineTo(0, layer.r * 0.75 * petalScale);
        ctx.stroke();

        ctx.restore();
      }
    });

    // 3. Central Seed Disk (Fibonacci Spiral pattern!)
    // Draw disk backing
    ctx.fillStyle = '#211204';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Dark ring border
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Golden Ratio seeds
    ctx.fillStyle = '#FFB300';
    const totalSeeds = 150;
    const c = size * 0.032; // scaling factor
    for (let n = 0; n < totalSeeds; n++) {
      const phi = n * 137.5 * (Math.PI / 180); // golden angle in radians
      const r = c * Math.sqrt(n);
      if (r > size * 0.38) continue; // contain in disk

      const sx = r * Math.cos(phi);
      const sy = r * Math.sin(phi);

      // Color variation based on depth
      const colorFactor = n / totalSeeds;
      ctx.fillStyle = colorFactor > 0.65 ? '#FFD54F' : colorFactor > 0.3 ? '#8D6E63' : '#3E2723';

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(0.6, size * 0.015 * (1 - colorFactor * 0.4)), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Procedural Flower Stem Drawing
  const drawFlowerStem = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    tx: number,
    ty: number,
    sway: number
  ) => {
    ctx.save();
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';

    // Control point for smooth curved Bezier stem
    const cx = (bx + tx) / 2 + sway * 15;
    const cy = (by + ty) / 2;

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();

    // Draw supportive green leaves on the stem
    ctx.fillStyle = '#1B5E20';
    const leafPositions = [0.3, 0.6];
    leafPositions.forEach((pos, idx) => {
      // Calculate coordinates along quadratic Bezier curve
      const t = pos;
      const lx = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * tx;
      const ly = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * cy + t * t * ty;

      ctx.save();
      ctx.translate(lx, ly);
      // Flip side based on index
      ctx.rotate((idx % 2 === 0 ? 0.6 : -0.6) + Math.sin(t * 10) * 0.05);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(20, -10, 45, -5);
      ctx.quadraticCurveTo(20, 15, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  };

  // Draw a beautiful high-fidelity glowing crescent moon
  const drawCrescentMoon = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    alpha: number = 1.0
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.25); // Elegant tilt for the moon

    ctx.fillStyle = `rgba(255, 253, 235, ${0.95 * alpha})`;
    ctx.shadowColor = '#FFF3B0';
    ctx.shadowBlur = r * 0.6;

    ctx.beginPath();
    // Outer arc on the right side
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    // Inner arc back to the top
    ctx.quadraticCurveTo(r * 0.22, 0, 0, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const getSkyColorCinematic = (f: number): { top: string; bottom: string } => {
    if (f < 360) {
      // Stage 1: Darkness
      return { top: '#010307', bottom: '#010307' };
    } else if (f < 720) {
      // Stage 2: Birth of Light
      const factor = (f - 360) / 360;
      return {
        top: interpolateColor('#010307', '#030712', factor),
        bottom: interpolateColor('#010307', '#050b1d', factor)
      };
    } else if (f < 1080) {
      // Stage 3: Petals Come Alive
      const factor = (f - 720) / 360;
      return {
        top: interpolateColor('#030712', '#091024', factor),
        bottom: interpolateColor('#050b1d', '#2d132c', factor) // deep dawn purple
      };
    } else if (f < 1440) {
      // Stage 4: Growing Together
      const factor = (f - 1080) / 360;
      return {
        top: interpolateColor('#091024', '#0e1633', factor),
        bottom: interpolateColor('#2d132c', '#722d3e', factor) // rose crimson
      };
    } else if (f < 1800) {
      // Stage 5: The Dance of Petals
      const factor = (f - 1440) / 360;
      return {
        top: interpolateColor('#0e1633', '#141f42', factor),
        bottom: interpolateColor('#722d3e', '#c85a44', factor) // dawn orange
      };
    } else if (f < 2280) {
      // Stage 6: Bloom
      const factor = (f - 1800) / 480;
      return {
        top: interpolateColor('#141f42', '#264c7a', factor),
        bottom: interpolateColor('#c85a44', '#ffd166', factor) // golden sunrise
      };
    } else if (f < 2580) {
      // Stage 7: First Look
      const factor = (f - 2280) / 300;
      return {
        top: interpolateColor('#264c7a', '#4f86c6', factor),
        bottom: interpolateColor('#ffd166', '#ffe893', factor)
      };
    } else {
      // Stage 8 & 9: Cinematic Camera & Reveal
      const factor = Math.min(1.0, (f - 2580) / 520);
      return {
        top: interpolateColor('#4f86c6', '#64b5f6', factor),
        bottom: interpolateColor('#ffe893', '#ffd54f', factor)
      };
    }
  };

  // Helper to draw a beautiful closed bud
  const drawCinematicBud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, angle: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Green outer sepals surrounding golden core
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Peeking golden petals inside bud
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.3, size * 0.28, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Secondary sepals
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5);
    ctx.quadraticCurveTo(size * 0.4, size * 0.2, size * 0.3, -size * 0.2);
    ctx.quadraticCurveTo(0, size * 0.1, 0, size * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Update cinematic particles
  const updateCinematicParticles = (width: number, height: number, cf: number) => {
    let pArr = cinematicParticlesRef.current;

    // 1. Spawning particles based on frame
    if (cf >= 120 && cf < 360 && cf % 12 === 0) {
      // Stage 1 Sparkles
      pArr.push({
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4 - 0.1,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.1,
        maxAlpha: 0.5 + Math.random() * 0.5,
        color: '#FFD54F',
        type: 'firefly',
        pulseSpeed: 0.03 + Math.random() * 0.04,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    if (cf >= 360 && cf < 720 && cf % 10 === 0) {
      // Stage 2: Birth of Light. They gather in center and then split
      const angle = Math.random() * Math.PI * 2;
      const radius = 100 + Math.random() * 150;
      pArr.push({
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: -Math.cos(angle) * 1.5,
        vy: -Math.sin(angle) * 1.5,
        size: 2 + Math.random() * 2,
        alpha: 0.1,
        maxAlpha: 0.8,
        color: '#FFF3B0',
        type: 'spiral',
        birthFrame: cf,
      });
    }

    if (cf >= 720 && cf < 1800 && cf % 4 === 0) {
      // Stage 3-5: Petals come alive
      const side = Math.random() > 0.5;
      pArr.push({
        x: side ? -20 : width + 20,
        y: Math.random() * height * 0.8,
        vx: side ? 1.5 + Math.random() * 3 : -1.5 - Math.random() * 3,
        vy: -0.5 - Math.random() * 1.5,
        size: 6 + Math.random() * 7,
        alpha: 0.9,
        color: '#FFD54F',
        type: 'petal',
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    // Stage 6 Climax: Bloom burst
    if (cf === 2000) {
      const leftX = width * 0.42;
      const rightX = width * 0.58;
      const flowerY = height * 0.72;
      const headY = flowerY - 170;

      // Spurt golden pollen particles from each flower head!
      for (let i = 0; i < 90; i++) {
        const angleL = Math.random() * Math.PI * 2;
        const speedL = 2 + Math.random() * 7;
        pArr.push({
          x: leftX,
          y: headY,
          vx: Math.cos(angleL) * speedL,
          vy: Math.sin(angleL) * speedL - 2,
          size: 2 + Math.random() * 3,
          alpha: 1.0,
          color: '#FFF3B0',
          type: 'pollen_burst',
          gravity: 0.05,
          drag: 0.98,
        });

        const angleR = Math.random() * Math.PI * 2;
        const speedR = 2 + Math.random() * 7;
        pArr.push({
          x: rightX,
          y: headY,
          vx: Math.cos(angleR) * speedR,
          vy: Math.sin(angleR) * speedR - 2,
          size: 2 + Math.random() * 3,
          alpha: 1.0,
          color: '#FFF3B0',
          type: 'pollen_burst',
          gravity: 0.05,
          drag: 0.98,
        });
      }
    }

    // Stage 7-9: Floating background elements, bees, and butterflies
    if (cf >= 2280 && cf % 40 === 0 && pArr.length < 300) {
      pArr.push({
        x: Math.random() > 0.5 ? -10 : width + 10,
        y: 100 + Math.random() * 300,
        vx: Math.random() > 0.5 ? 1 + Math.random() * 1.5 : -1 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 1.0,
        size: 5 + Math.random() * 4,
        alpha: 0.8,
        color: Math.random() > 0.5 ? '#FFD54F' : '#FF8A65',
        type: 'butterfly',
        waveFrequency: 0.06,
        waveAmplitude: 3,
      });
    }

    // 2. Update particle positions
    cinematicParticlesRef.current = pArr.filter((p) => {
      // Fireflies
      if (p.type === 'firefly') {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += (p.maxAlpha - p.alpha) * 0.05;
        p.pulsePhase += p.pulseSpeed;
        const curAlpha = p.alpha * (0.4 + Math.sin(p.pulsePhase) * 0.5);
        if (cf > 360) p.alpha -= 0.01; // start dying out or getting absorbed
        return p.alpha > 0;
      }

      // Spiral light stream particles
      if (p.type === 'spiral') {
        const elapsed = cf - p.birthFrame;
        const progress = Math.min(1.0, elapsed / 180);

        // Attracted to spiral centers or left/right streams
        if (cf < 540) {
          const angle = (cf * 0.06) + p.birthFrame;
          const targetR = 10 * (1 - progress);
          const tx = width / 2 + Math.cos(angle) * targetR;
          const ty = height / 2 + Math.sin(angle) * targetR;
          p.x += (tx - p.x) * 0.1;
          p.y += (ty - p.y) * 0.1;
        } else {
          const isLeft = p.birthFrame % 2 === 0;
          const targetX = isLeft ? width * 0.42 : width * 0.58;
          const targetY = height * 0.55;
          p.x += (targetX - p.x) * 0.08;
          p.y += (targetY - p.y) * 0.08;
        }

        p.alpha += (p.maxAlpha - p.alpha) * 0.1;
        if (cf > 720) p.alpha -= 0.015;
        return p.alpha > 0;
      }

      // Swirling petals
      if (p.type === 'petal') {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        // Swirling force around the stems in Stage 5
        if (cf >= 1440 && cf < 1800) {
          const isLeft = p.x < width / 2;
          const targetX = isLeft ? width * 0.42 : width * 0.58;
          const targetY = height * 0.72 - 170;

          const dx = targetX - p.x;
          const dy = targetY - p.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 180) {
            const force = (180 - d) * 0.003;
            p.vx += -dy * force * 0.02;
            p.vy += dx * force * 0.02;
          }
        }

        if (cf > 2280) {
          p.alpha -= 0.005;
        }
        return p.alpha > 0 && p.y < height + 50 && p.x > -50 && p.x < width + 50;
      }

      // Pollen burst
      if (p.type === 'pollen_burst') {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.alpha -= 0.006;
        return p.alpha > 0;
      }

      // Butterflies/bees
      if (p.type === 'butterfly') {
        p.x += p.vx;
        p.y += p.vy + Math.sin(cf * p.waveFrequency) * 0.3;
        return p.x > -50 && p.x < width + 50;
      }

      return false;
    });
  };

  const drawCinematicStages = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cf: number,
    time: number
  ) => {
    updateCinematicParticles(width, height, cf);

    // Draw stars
    if (cf < 1080) {
      const starAlphaFactor = Math.max(0.0, 1.0 - cf / 1080);
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * starAlphaFactor})`;
      for (let i = 0; i < 100; i++) {
        const sx = (Math.sin(i * 1234.56) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 7890.12) * 0.5 + 0.5) * height * 0.7;
        const size = (Math.sin(i * 4567.89 + cf * 0.04) * 0.4 + 0.6) * 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const flowerY = height * 0.72;
    if (cf >= 1080) {
      const groundAlpha = Math.min(1.0, (cf - 1080) / 120);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * groundAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.25, flowerY + 40);
      ctx.lineTo(width * 0.75, flowerY + 40);
      ctx.stroke();
      ctx.restore();
    }

    const leftX = width * 0.42;
    const rightX = width * 0.58;

    if (cf >= 1080) {
      const sproutProgress = Math.min(1.0, (cf - 1080) / 360);
      const stemHeight = 170 * sproutProgress;
      const headY = flowerY + 40 - stemHeight;
      const swayAngle = Math.sin(cf * 0.02) * 0.04;

      if (cf < 1440) {
        drawFlowerStem(ctx, leftX, flowerY + 40, leftX + swayAngle * 15, headY, swayAngle);
        drawFlowerStem(ctx, rightX, flowerY + 40, rightX + swayAngle * 15, headY, swayAngle);
      } else if (cf < 1800) {
        const leftBend = swayAngle - 0.04;
        const rightBend = swayAngle + 0.04;
        const lHeadY = flowerY + 40 - 170;
        
        drawFlowerStem(ctx, leftX, flowerY + 40, leftX + leftBend * 35, lHeadY, leftBend * 3);
        drawFlowerStem(ctx, rightX, flowerY + 40, rightX + rightBend * 35, lHeadY, rightBend * 3);

        drawCinematicBud(ctx, leftX + leftBend * 35, lHeadY, 30, leftBend);
        drawCinematicBud(ctx, rightX + rightBend * 35, lHeadY, 30, rightBend);
      } else if (cf < 2580) {
        const bloomProgress = Math.min(1.0, (cf - 1800) / 480);
        let leftBend = swayAngle - 0.04;
        let rightBend = swayAngle + 0.04;

        if (cf >= 2280) {
          const lookProgress = Math.min(1.0, (cf - 2280) / 300);
          leftBend += lookProgress * 0.45;
          rightBend -= lookProgress * 0.45;
        }

        const lHeadY = flowerY + 40 - 170;
        drawFlowerStem(ctx, leftX, flowerY + 40, leftX + leftBend * 35, lHeadY, leftBend * 3);
        drawFlowerStem(ctx, rightX, flowerY + 40, rightX + rightBend * 35, lHeadY, rightBend * 3);

        drawSunflowerHead(ctx, leftX + leftBend * 35, lHeadY, 52, leftBend, cf, 0.2, bloomProgress);
        drawSunflowerHead(ctx, rightX + rightBend * 35, lHeadY, 52, rightBend, cf, 0.2, bloomProgress);
      } else {
        ctx.save();
        let scaleFactor = 1.0;
        let dX = 0;
        let dY = 0;
        let rotateFactor = 0;

        if (cf >= 2580 && cf < 2880) {
          const orbitProgress = (cf - 2580) / 300;
          scaleFactor = 1.0 + Math.sin(orbitProgress * Math.PI) * 0.15;
          dX = Math.sin(orbitProgress * Math.PI * 2) * 20;
          dY = Math.cos(orbitProgress * Math.PI) * 10;
          rotateFactor = Math.sin(orbitProgress * Math.PI) * 0.02;
        } else if (cf >= 2880) {
          const revealProgress = (cf - 2880) / 220;
          scaleFactor = 1.0 - revealProgress * 0.35;
          dY = revealProgress * 60;
        }

        ctx.translate(width / 2 + dX, height / 2 + dY);
        ctx.rotate(rotateFactor);
        ctx.scale(scaleFactor, scaleFactor);
        ctx.translate(-width / 2, -height / 2);

        if (cf >= 2880) {
          const revealProgress = (cf - 2880) / 220;
          ctx.save();
          const baseFieldY = flowerY;
          for (let row = 4; row >= 1; row--) {
            const rowY = baseFieldY + row * 25;
            const rowScale = 0.2 + row * 0.12;
            const flowerDensity = 16 + row * 3;
            const swayFactor = Math.sin(cf * 0.02 + row) * 4;

            for (let f = 0; f < flowerDensity; f++) {
              const fx = (f / flowerDensity) * (width + 160) - 80 + Math.sin(cf * 0.015) * (0.3 * row);
              
              ctx.strokeStyle = `rgba(27, 94, 32, ${revealProgress * (0.3 + row * 0.15)})`;
              ctx.lineWidth = 1 + row * 0.5;
              ctx.beginPath();
              ctx.moveTo(fx, height);
              ctx.quadraticCurveTo(fx + swayFactor, rowY + (height - rowY) * 0.5, fx + swayFactor, rowY);
              ctx.stroke();

              ctx.fillStyle = `rgba(255, 193, 7, ${revealProgress * (0.4 + row * 0.15)})`;
              ctx.beginPath();
              ctx.arc(fx + swayFactor, rowY, 10 * rowScale, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = `rgba(62, 39, 35, ${revealProgress * (0.4 + row * 0.15)})`;
              ctx.beginPath();
              ctx.arc(fx + swayFactor, rowY, 4 * rowScale, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }

        const leftBend = swayAngle + 0.41;
        const rightBend = swayAngle - 0.41;
        const lHeadY = flowerY + 40 - 170;

        drawFlowerStem(ctx, leftX, flowerY + 40, leftX + leftBend * 35, lHeadY, leftBend * 3);
        drawFlowerStem(ctx, rightX, flowerY + 40, rightX + rightBend * 35, lHeadY, rightBend * 3);

        drawSunflowerHead(ctx, leftX + leftBend * 35, lHeadY, 52, leftBend, cf, 0.2, 1.0);
        drawSunflowerHead(ctx, rightX + rightBend * 35, lHeadY, 52, rightBend, cf, 0.2, 1.0);

        ctx.restore();
      }
    }

    if (cf >= 1800 && cf < 2880) {
      const rayAlpha = cf < 1900 ? (cf - 1800) / 100 : cf > 2580 ? Math.max(0, 1 - (cf - 2580) / 300) : 1.0;
      ctx.save();
      const godRayGrad = ctx.createLinearGradient(width / 2 - 100, 0, width / 2 + 100, height);
      godRayGrad.addColorStop(0, `rgba(255, 253, 220, ${0.28 * rayAlpha})`);
      godRayGrad.addColorStop(0.5, `rgba(255, 213, 79, ${0.1 * rayAlpha})`);
      godRayGrad.addColorStop(1, 'rgba(255, 213, 79, 0)');

      ctx.fillStyle = godRayGrad;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 150, 0);
      ctx.lineTo(width / 2 + 150, 0);
      ctx.lineTo(rightX + 120, height);
      ctx.lineTo(leftX - 120, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    cinematicParticlesRef.current.forEach((p) => {
      if (p.type === 'firefly' || p.type === 'spiral' || p.type === 'pollen_burst') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#FFD54F';
        ctx.shadowBlur = p.size * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'petal') {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.4, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'butterfly') {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        const flap = Math.sin(cf * 0.15) * 0.8;
        ctx.beginPath();
        ctx.ellipse(-2, -flap * 4, p.size * 0.4, p.size * 0.8, -0.4, 0, Math.PI * 2);
        ctx.ellipse(2, -flap * 4, p.size * 0.4, p.size * 0.8, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.restore();
  };

  // Main animation loop
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const width = dimensions.width;
      const height = dimensions.height;
      const time = timeRef.current++;

      if (activeScene !== StoryScene.LOADING) {
        bloomTimeRef.current++;
      } else {
        bloomTimeRef.current = 0;
      }

      // Smooth interactive mouse lag
      const state = stateRef.current;
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.1;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.1;

      // Decay wind force
      state.windForceX *= 0.95;
      state.windForceY *= 0.95;

      // CINEMATIC MODE BYPASS RENDERER
      if (isCinematicPlaying) {
        if (cinematicFrameRef.current === undefined) {
          cinematicFrameRef.current = 0;
        }
        const cf = cinematicFrameRef.current++;

        if (cf >= 3100) {
          if (onSkipCinematic) {
            onSkipCinematic();
          }
          animationFrameRef.current = requestAnimationFrame(render);
          return;
        }

        const colors = getSkyColorCinematic(cf);
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, colors.top);
        skyGrad.addColorStop(1, colors.bottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        drawCinematicStages(ctx, width, height, cf, time);

        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. BACKGROUND SKY GRADIENT
      const colors = getSkyGradientColors(progress);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, colors.top);
      skyGrad.addColorStop(1, colors.bottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. STARS AND MILKY WAY (In Night scene, progress > 70)
      if (progress > 65) {
        // Draw deep space dust glow
        const duskGrad = ctx.createRadialGradient(
          width * 0.4,
          height * 0.3,
          0,
          width * 0.4,
          height * 0.3,
          width * 0.6
        );
        duskGrad.addColorStop(0, `rgba(106, 76, 147, ${0.15 * ((progress - 65) / 35)})`);
        duskGrad.addColorStop(0.6, `rgba(8, 18, 41, 0)`);
        ctx.fillStyle = duskGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Update and draw particles (Stars, pollen, petals, fireflies, bees)
      const currentParticles = particlesRef.current;
      currentParticles.forEach((p) => {
        // Star twinkling
        if (p.type === 'star') {
          if (p.pulseSpeed && p.pulsePhase !== undefined) {
            p.pulsePhase += p.pulseSpeed;
            p.alpha = 0.15 + Math.sin(p.pulsePhase) * 0.45;
          }

          // Stars fade in at twilight and night
          const starAlphaFactor = progress < 60 ? 0 : progress < 75 ? (progress - 60) / 15 : 1;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * starAlphaFactor})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        // Cloud movement
        if (p.type === 'cloud') {
          p.x += p.vx;
          if (p.x - p.size > width) {
            p.x = -p.size;
          }

          // Clouds only visible in day
          const cloudAlphaFactor = progress > 85 ? 0 : progress > 70 ? 1 - (progress - 70) / 15 : 1;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * cloudAlphaFactor})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        // Update particle physics (pollen, petals, fireflies, insects)
        // Add cursor wind response
        const dx = state.mouseX - p.x;
        const dy = state.mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const forceLimit = 150;
        if (dist < forceLimit) {
          const force = (1 - dist / forceLimit) * 1.5;
          p.x += state.windForceX * force;
          p.y += state.windForceY * force;
        }

        // Apply normal speeds
        p.x += p.vx;
        p.y += p.vy;

        // Dynamic waving paths for floaty look
        if (p.waveFrequency && p.waveAmplitude) {
          p.x += Math.sin(time * p.waveFrequency) * p.waveAmplitude * 0.5;
        }

        // Wrap around borders
        if (p.x < -50) p.x = width + 50;
        if (p.x > width + 50) p.x = -50;
        if (p.y < -50) p.y = height + 50;
        if (p.y > height + 50) p.y = -50;

        // Rendering specific styles
        if (p.type === 'pollen') {
          // Pollen fades out at night, replaced by fireflies
          const pollenAlphaFactor = progress > 80 ? 0 : progress > 70 ? 1 - (progress - 70) / 10 : 1;
          ctx.fillStyle = `rgba(255, 213, 79, ${p.alpha * pollenAlphaFactor})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'firefly') {
          // Fireflies fade in at twilight and night
          const fireflyAlphaFactor = progress < 65 ? 0 : progress < 78 ? (progress - 65) / 13 : 1;
          const pulsing = 0.3 + Math.sin(time * 0.04 + p.x * 0.01) * 0.7;
          ctx.shadowColor = '#D4E157';
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(212, 225, 87, ${p.alpha * pulsing * fireflyAlphaFactor})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        } else if (p.type === 'petal') {
          // Beautiful falling petals
          p.rotation = (p.rotation || 0) + (p.rotSpeed || 0.01);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(p.size * 0.6, -p.size * 0.4, p.size, 0);
          ctx.quadraticCurveTo(p.size * 0.6, p.size * 0.4, 0, 0);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'bee' || p.type === 'butterfly') {
          // Flying insects (active in morning/afternoon)
          const insectAlpha = progress > 65 ? 0 : progress > 50 ? 1 - (progress - 50) / 15 : 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = p.type === 'bee' ? '#FFB300' : '#FF7043';
          
          // Draw insect body
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Stripes for bee
          if (p.type === 'bee') {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -p.size * 0.5);
            ctx.lineTo(0, p.size * 0.5);
            ctx.stroke();
          }

          // Flapping wings
          const flap = Math.sin(time * 0.3) * p.size;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.ellipse(-2, -p.size * 0.4, p.size * 0.6, Math.abs(flap), -0.4, 0, Math.PI * 2);
          ctx.ellipse(2, -p.size * 0.4, p.size * 0.6, Math.abs(flap), 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // 3. SUN / MOON VISUALS
      let sunX = width * 0.5;
      let sunY = height * 1.2; // default hidden bottom
      let sunScale = 0;
      let isSunVisible = false;

      // Sun rises from lower left, peaks overhead, and sets in lower right
      if (progress < 72) {
        isSunVisible = true;
        // Map progress (0-72) to Sun angle across the sky
        const angle = Math.PI + (progress / 72) * Math.PI; // runs PI to 2*PI (arc)
        const radiusX = width * 0.42;
        const radiusY = height * 0.65;
        sunX = width * 0.5 + Math.cos(angle) * radiusX;
        sunY = height * 0.8 + Math.sin(angle) * radiusY;

        // Size adapts slightly
        sunScale = progress < 15 ? progress / 15 : progress > 55 ? (72 - progress) / 17 : 1;
      }

      // Draw Sun, Volumetric God Rays, and Lens Flares
      if (isSunVisible && activeScene !== StoryScene.LOADING && activeScene !== StoryScene.SCIENCE) {
        ctx.save();
        // Warm halo glow
        const glowRad = 50 + sunScale * 140;
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, glowRad);
        sunGlow.addColorStop(0, 'rgba(255, 253, 230, 0.9)');
        sunGlow.addColorStop(0.15, 'rgba(255, 213, 79, 0.6)');
        sunGlow.addColorStop(0.4, 'rgba(255, 138, 101, 0.25)');
        sunGlow.addColorStop(1, 'rgba(255, 243, 176, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sunX, sunY, glowRad, 0, Math.PI * 2);
        ctx.fill();

        // Core sun disk
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 20 + sunScale * 15, 0, Math.PI * 2);
        ctx.fill();

        // 3.1 DRAW GOD RAYS (In Afternoon & Golden hour)
        if (progress > 20 && progress < 65) {
          const rayProgress = progress > 50 ? (65 - progress) / 15 : 1.0;
          ctx.strokeStyle = `rgba(255, 248, 220, ${0.07 * rayProgress})`;
          ctx.lineWidth = 15;
          const numRays = 8;
          for (let r = 0; r < numRays; r++) {
            const rayAngle = (r * Math.PI * 2) / numRays + time * 0.001;
            ctx.beginPath();
            ctx.moveTo(sunX, sunY);
            ctx.lineTo(sunX + Math.cos(rayAngle) * width, sunY + Math.sin(rayAngle) * height);
            ctx.stroke();
          }
        }

        // 3.2 LENS FLARES (Cinematic!)
        if (progress > 10 && progress < 68) {
          const centerX = width / 2;
          const centerY = height / 2;
          const vectorX = centerX - sunX;
          const vectorY = centerY - sunY;

          const flarePositions = [0.3, 0.55, 0.8, -0.2, 1.2];
          const flareColors = [
            'rgba(255, 213, 79, 0.08)',
            'rgba(255, 138, 101, 0.05)',
            'rgba(121, 85, 72, 0.04)',
            'rgba(255, 255, 255, 0.1)',
            'rgba(255, 213, 79, 0.03)',
          ];

          flarePositions.forEach((pos, idx) => {
            const fx = sunX + vectorX * pos;
            const fy = sunY + vectorY * pos;
            const size = Math.abs(vectorX) * 0.07 * (idx + 1) * 0.5;

            const flareGlow = ctx.createRadialGradient(fx, fy, 2, fx, fy, size);
            flareGlow.addColorStop(0, flareColors[idx]);
            flareGlow.addColorStop(0.8, flareColors[idx]);
            flareGlow.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = flareGlow;
            ctx.beginPath();
            ctx.arc(fx, fy, size, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        ctx.restore();
      }

      // Draw Silver Moon in Twilight & Night (progress > 68)
      if (progress > 68 && activeScene !== StoryScene.ENDING) {
        const moonAlphaFactor = progress < 78 ? (progress - 68) / 10 : 1;
        const moonX = width * 0.8;
        const moonY = height * 0.25;

        ctx.save();
        // Moon soft glow
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 70);
        moonGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 * moonAlphaFactor})`);
        moonGlow.addColorStop(0.3, `rgba(212, 225, 87, ${0.08 * moonAlphaFactor})`);
        moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 70, 0, Math.PI * 2);
        ctx.fill();

        // Crescent moon drawing (Subtract circles)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * moonAlphaFactor})`;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
        ctx.fill();

        // Overlay offset dark circle to create crescent
        ctx.fillStyle = colors.top; // Match sky top
        ctx.beginPath();
        ctx.arc(moonX - 8, moonY - 4, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. PARALLAX DISTANT SUNFLOWER FIELD BACKGROUND
      if (activeScene !== StoryScene.LOADING && activeScene !== StoryScene.ENDING && activeScene !== StoryScene.SCIENCE) {
        ctx.save();
        const baseFieldY = height * 0.65;
        // Dynamic horizontal sways
        const backgroundSway = Math.sin(time * 0.015) * 8;

        // Draw multiple parallax layers of flower beds
        for (let row = 4; row >= 1; row--) {
          const rowY = baseFieldY + row * 45;
          const scale = 0.3 + row * 0.17;
          const flowerDensity = 12 + row * 4;
          const swayFactor = Math.sin(time * 0.02 + row) * 6;

          for (let f = 0; f < flowerDensity; f++) {
            const fx = (f / flowerDensity) * (width + 100) - 50 + backgroundSway * (0.4 * row);
            
            // Stem
            ctx.strokeStyle = `rgba(27, 94, 32, ${0.4 + row * 0.15})`;
            ctx.lineWidth = 1.5 + row * 0.8;
            ctx.beginPath();
            ctx.moveTo(fx, height);
            ctx.quadraticCurveTo(fx + swayFactor, rowY + (height - rowY) * 0.5, fx + swayFactor, rowY);
            ctx.stroke();

            // Simple distant flower face
            ctx.fillStyle = `rgba(255, 193, 7, ${0.5 + row * 0.15})`;
            ctx.beginPath();
            ctx.arc(fx + swayFactor, rowY, 12 * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(62, 39, 35, ${0.5 + row * 0.15})`;
            ctx.beginPath();
            ctx.arc(fx + swayFactor, rowY, 5 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 5. INTUITIVE CLICKS VISUAL EFFECT SHOCKWAVES
      const activeWaves = clickWavesRef.current;
      clickWavesRef.current = activeWaves.filter((wave) => {
        wave.radius += (wave.maxRadius - wave.radius) * 0.08;
        wave.alpha -= 0.025;

        ctx.strokeStyle = `rgba(255, 213, 79, ${wave.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();

        return wave.alpha > 0;
      });

      // 6. MAIN SUNFLOWER STORIES (LOADING vs. STORY vs. SCIENCE vs. THE NIGHT vs. ENDING)

      // A. LOADING SCENE FLOWER GROWTH
      if (activeScene === StoryScene.LOADING) {
        const lp = loadingProgress / 100; // 0 to 1
        const cx = width / 2;
        const cy = height * 0.72;

        if (lp < 0.25) {
          // 1. Tiny Seed with soft pulsing glow
          const seedGlow = Math.sin(time * 0.08) * 0.4 + 0.6;
          ctx.shadowColor = '#FFD54F';
          ctx.shadowBlur = 15 * seedGlow;
          ctx.fillStyle = '#FFC107';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 8, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        } else if (lp < 0.55) {
          // 2. Growing roots downwards
          const rootProgress = (lp - 0.25) / 0.3;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(cx - 20, cy + 30 * rootProgress, cx - 15, cy + 60 * rootProgress);
          ctx.moveTo(cx, cy + 5);
          ctx.quadraticCurveTo(cx + 25, cy + 25 * rootProgress, cx + 10, cy + 50 * rootProgress);
          ctx.stroke();

          // Sprouts stem upwards
          ctx.strokeStyle = '#2E7D32';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(cx, cy - 30 * rootProgress, cx, cy - 70 * rootProgress);
          ctx.stroke();
        } else if (lp < 0.85) {
          // 3. Growing leaves and stems taller
          const stemProgress = (lp - 0.55) / 0.3;
          const stemHeight = 70 + 130 * stemProgress;
          drawFlowerStem(ctx, cx, cy, cx, cy - stemHeight, Math.sin(time * 0.02) * 0.1);
        } else {
          // 4. Full Bloom!
          const bloomProgress = (lp - 0.85) / 0.15;
          const stemHeight = 200;
          const headY = cy - stemHeight;

          drawFlowerStem(ctx, cx, cy, cx, headY, Math.sin(time * 0.02) * 0.2);
          drawSunflowerHead(ctx, cx, headY, 50, 0, time, bloomProgress, bloomProgress);
          
          // Emit golden particle burst once fully bloomed
          if (time % 8 === 0 && lp > 0.98) {
            particlesRef.current.push({
              x: cx + (Math.random() - 0.5) * 40,
              y: headY + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4 - 1,
              size: 2 + Math.random() * 3,
              alpha: 0.9,
              color: '#FFD54F',
              type: 'pollen',
              waveFrequency: 0.05,
              waveAmplitude: 2,
            });
          }
        }
      }

      // B. SCIENCE SPLIT-SCREEN HELIOTROPISM
      else if (activeScene === StoryScene.SCIENCE) {
        if (isScienceMode) {
          const flowerLeftX = width * 0.42;
          const flowerRightX = width * 0.58;
          const flowerY = height * 0.72;

          // Draw ground line
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width * 0.3, flowerY + 40);
          ctx.lineTo(width * 0.7, flowerY + 40);
          ctx.stroke();

          // Left flower angle to sun
          const dxL = scientificSunPos.x - flowerLeftX;
          const dyL = scientificSunPos.y - (flowerY - 140);
          const rawAngleL = Math.atan2(dyL, dxL);
          const clampedAngleL = Math.max(Math.min(rawAngleL - Math.PI / 2, 0.9), -0.9);

          // Right flower angle to sun
          const dxR = scientificSunPos.x - flowerRightX;
          const dyR = scientificSunPos.y - (flowerY - 140);
          const rawAngleR = Math.atan2(dyR, dxR);
          const clampedAngleR = Math.max(Math.min(rawAngleR - Math.PI / 2, 0.9), -0.9);

          // Draw left stem & head
          drawFlowerStem(ctx, flowerLeftX, flowerY + 40, flowerLeftX + clampedAngleL * 18, flowerY - 120, clampedAngleL * 2);
          drawSunflowerHead(ctx, flowerLeftX + clampedAngleL * 18, flowerY - 120, 44, clampedAngleL, time, 0.1);

          // Draw right stem & head
          drawFlowerStem(ctx, flowerRightX, flowerY + 40, flowerRightX + clampedAngleR * 18, flowerY - 120, clampedAngleR * 2);
          drawSunflowerHead(ctx, flowerRightX + clampedAngleR * 18, flowerY - 120, 44, clampedAngleR, time, 0.1);

          // Draw draggable interactive Sun indicator
          ctx.save();
          ctx.shadowColor = '#FFC107';
          ctx.shadowBlur = 25;
          ctx.fillStyle = '#FFF3B0';
          ctx.beginPath();
          ctx.arc(scientificSunPos.x, scientificSunPos.y, 25, 0, Math.PI * 2);
          ctx.fill();
          
          // Sun flare rings
          ctx.strokeStyle = 'rgba(255,213,79,0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(scientificSunPos.x, scientificSunPos.y, 35, 0, Math.PI * 2);
          ctx.stroke();

          // Drag message helper popup pulsing
          const showPulsingMsg = Math.sin(time * 0.06) > 0;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DRAG ME', scientificSunPos.x, scientificSunPos.y + 4);
          ctx.restore();
        }
      }

      // C. THE NIGHT SCENE (75% to 90% progress) — TWO FLOWERS ROTATE TO EACH OTHER
      else if (progress >= 72 && progress < 90) {
        const sceneProgress = (progress - 72) / 18; // 0 to 1
        
        const flowerLeftX = width * 0.35;
        const flowerRightX = width * 0.65;
        const flowerY = height * 0.72;

        // Bending/turning toward each other as scroll reaches the night climax
        // Left flower rotates clockwise, Right flower rotates counterclockwise
        const leftRotate = 0.15 + sceneProgress * 0.55; // turns right
        const rightRotate = -0.15 - sceneProgress * 0.55; // turns left

        // Stem positions
        const leftHeadX = flowerLeftX + leftRotate * 35;
        const leftHeadY = flowerY - 170;
        const rightHeadX = flowerRightX + rightRotate * 35;
        const rightHeadY = flowerY - 170;

        // Draw Left Stem
        drawFlowerStem(ctx, flowerLeftX, height, leftHeadX, leftHeadY, leftRotate * 3);
        // Draw Right Stem
        drawFlowerStem(ctx, flowerRightX, height, rightHeadX, rightHeadY, rightRotate * 3);

        // Core light orb between them
        // Orb emerges as sceneProgress increases
        const orbX = (leftHeadX + rightHeadX) / 2;
        const orbY = (leftHeadY + rightHeadY) / 2 - 180;

        // Let the orb react subtly to mouse interaction
        const mdx = (state.mouseX - orbX) * 0.08;
        const mdy = (state.mouseY - orbY) * 0.08;
        const interactiveOrbX = orbX + mdx;
        const interactiveOrbY = orbY + mdy;

        const orbPulse = 1.0 + Math.sin(time * 0.05) * 0.08;
        const orbSize = sceneProgress * 30 * orbPulse;
        const glowFactor = sceneProgress;

        // Draw Left Sunflower
        drawSunflowerHead(ctx, leftHeadX, leftHeadY, 48, leftRotate, time, glowFactor, 1.0);
        // Draw Right Sunflower
        drawSunflowerHead(ctx, rightHeadX, rightHeadY, 48, rightRotate, time, glowFactor, 1.0);

        if (sceneProgress > 0.05) {
          ctx.save();
          // Radiating orb glow
          const radialGlow = ctx.createRadialGradient(
            interactiveOrbX,
            interactiveOrbY,
            2,
            interactiveOrbX,
            interactiveOrbY,
            orbSize * 5
          );
          radialGlow.addColorStop(0, `rgba(255, 243, 176, ${0.8 * sceneProgress})`);
          radialGlow.addColorStop(0.3, `rgba(255, 193, 7, ${0.35 * sceneProgress})`);
          radialGlow.addColorStop(0.6, `rgba(255, 138, 101, ${0.1 * sceneProgress})`);
          radialGlow.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(interactiveOrbX, interactiveOrbY, orbSize * 5, 0, Math.PI * 2);
          ctx.fill();

          // Solid bright crescent moon core
          drawCrescentMoon(ctx, interactiveOrbX, interactiveOrbY, orbSize * 0.75, sceneProgress);
          ctx.restore();
        }

        // Draw dynamic constellation connections (secret stars dragging!)
        const constellation = state.constellation;
        if (constellation.length > 1) {
          ctx.save();
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#FFD54F';
          ctx.shadowBlur = 4;
          for (let i = 1; i < constellation.length; i++) {
            const p1 = constellation[i - 1];
            const p2 = constellation[i];
            
            // Fades over time
            const age = Date.now() - p1.time;
            const alpha = Math.max(0, 1 - age / 1500);

            if (alpha > 0) {
              ctx.strokeStyle = `rgba(255, 243, 176, ${alpha * 0.7})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();

              // Draw star nodes
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
              ctx.beginPath();
              ctx.arc(p1.x, p1.y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        }
      }

      // D. ENDING SCENE (90% to 100%) — DRONES FAR AWAY INTO INFINITE BEAUTY (ZOOM CLAMPED SO THEY STAY LARGE AND BEAUTIFUL)
      else if (progress >= 90) {
        const sceneProgress = (progress - 90) / 10; // 0 to 1
        const zoomOutScale = 1.0 - sceneProgress * 0.15; // keep them even larger
        const fadeToBlack = 1.0; 

        const flowerLeftX = width * 0.38 + (width * 0.02 * (1 - zoomOutScale));
        const flowerRightX = width * 0.62 - (width * 0.02 * (1 - zoomOutScale));
        const flowerY = height * 0.72;

        const leftRotate = 0.70; // Face each other
        const rightRotate = -0.70; // Face each other

        const leftHeadX = flowerLeftX + leftRotate * 35 * zoomOutScale;
        const leftHeadY = flowerY - 170 * zoomOutScale;
        const rightHeadX = flowerRightX + rightRotate * 35 * zoomOutScale;
        const rightHeadY = flowerY - 170 * zoomOutScale;

        // Draw Left Stem
        drawFlowerStem(ctx, flowerLeftX, height, leftHeadX, leftHeadY, leftRotate * 3 * zoomOutScale);
        // Draw Right Stem
        drawFlowerStem(ctx, flowerRightX, height, rightHeadX, rightHeadY, rightRotate * 3 * zoomOutScale);

        // Draw left & right flowers beautiful and large
        const baseSize = 65; // increased size
        drawSunflowerHead(ctx, leftHeadX, leftHeadY, baseSize * zoomOutScale, leftRotate, time, 1.0, zoomOutScale);
        drawSunflowerHead(ctx, rightHeadX, rightHeadY, baseSize * zoomOutScale, rightRotate, time, 1.0, zoomOutScale);

        // Radiant core gold orb between them
        const orbX = (leftHeadX + rightHeadX) / 2;
        const orbY = (leftHeadY + rightHeadY) / 2 - 180 * zoomOutScale;
        const orbPulse = 1.0 + Math.sin(time * 0.05) * 0.08;
        const orbSize = 35 * orbPulse * zoomOutScale;

        ctx.save();
        const radialGlow = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, orbSize * 6);
        radialGlow.addColorStop(0, `rgba(255, 243, 176, 0.95)`);
        radialGlow.addColorStop(0.3, `rgba(255, 193, 7, 0.5)`);
        radialGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize * 6, 0, Math.PI * 2);
        ctx.fill();

        // Solid bright crescent moon core
        drawCrescentMoon(ctx, orbX, orbY, orbSize * 0.88, 1.0);
        ctx.restore();
      }

      // E. GENERAL TWO SUNFLOWERS DRAMATIC STORY SCENE (0% to 72% progress) - PROTHOM THEKEI TWO FLOWERS
      else {
        const flowerLeftBaseX = width * 0.42;
        const flowerRightBaseX = width * 0.58;
        const flowerY = height * 0.72;

        // Calculate the gorgeous, high-fidelity bloom factor when they first sprout from the ground.
        // It animates over 180 frames (3 seconds at 60fps) starting from 0 when entering the Hero chapter.
        const bloomFrames = 180;
        const bloomProgress = Math.min(1.0, bloomTimeRef.current / bloomFrames);
        
        // Use an elegant back-ease-out curve to sprout and then gently bounce into shape:
        const x = bloomProgress;
        const c1 = 1.1; // Customize back-bounce factor
        const c3 = c1 + 1;
        const organicScale = x === 1.0 ? 1.0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        const finalScale = Math.max(0.0, organicScale);

        // Angle face depends on Sun location
        // Morning (12-25%): turns towards sun rising east (left)
        // Afternoon (25-50%): stands perfectly straight, swaying
        // Golden hour (50-65%): turns towards setting sun (right)
        // Sunset (65-72%): slowly droops as daylight dies
        let bendAngle = 0;
        let scaleSize = 1.0;

        if (progress < 25) {
          // Morning: faces east (left)
          const factor = (progress - 12) / 13;
          bendAngle = -0.4 + (factor * 0.35);
        } else if (progress < 50) {
          // Afternoon: straight and tall, small sway
          const factor = (progress - 25) / 25;
          bendAngle = -0.05 + Math.sin(time * 0.02) * 0.04;
        } else if (progress < 65) {
          // Golden hour: turns west (right)
          const factor = (progress - 50) / 15;
          bendAngle = -0.05 + (factor * 0.35);
        } else {
          // Sunset: starts drooping downwards in exhaustion
          const factor = (progress - 65) / 7;
          bendAngle = 0.3 + (factor * 0.25);
          scaleSize = 1.0 - factor * 0.05;
        }

        // Draw Left Sunflower
        const leftBend = bendAngle - 0.04;
        const leftHeadX = flowerLeftBaseX + leftBend * 35;
        const leftHeadY = flowerY - 170 * finalScale; // Stem grows
        drawFlowerStem(ctx, flowerLeftBaseX, height, leftHeadX, leftHeadY, leftBend * 3);

        const leftMouseDx = (state.mouseX - leftHeadX) * 0.0003;
        const leftHoverAngle = leftBend + leftMouseDx;
        // Head blooms from scale 0 to full size
        drawSunflowerHead(ctx, leftHeadX, leftHeadY, 52 * scaleSize * finalScale, leftHoverAngle, time, 0.2, finalScale);

        // Draw Right Sunflower
        const rightBend = bendAngle + 0.04;
        const rightHeadX = flowerRightBaseX + rightBend * 35;
        const rightHeadY = flowerY - 170 * finalScale; // Stem grows
        drawFlowerStem(ctx, flowerRightBaseX, height, rightHeadX, rightHeadY, rightBend * 3);

        const rightMouseDx = (state.mouseX - rightHeadX) * 0.0003;
        const rightHoverAngle = rightBend + rightMouseDx;
        // Head blooms from scale 0 to full size
        drawSunflowerHead(ctx, rightHeadX, rightHeadY, 52 * scaleSize * finalScale, rightHoverAngle, time, 0.2, finalScale);

        // Spawn a couple of butterflies/bees in Afternoon scene
        if (activeScene === StoryScene.AFTERNOON && currentParticles.length < 150 && time % 60 === 0) {
          particlesRef.current.push({
            x: Math.random() > 0.5 ? -10 : width + 10,
            y: 100 + Math.random() * 200,
            vx: Math.random() > 0.5 ? 1 + Math.random() * 1.5 : -1 - Math.random() * 1.5,
            vy: (Math.random() - 0.5) * 1.2,
            size: 4 + Math.random() * 3,
            alpha: 0.8,
            color: Math.random() > 0.5 ? '#FFB300' : '#FF7043',
            type: Math.random() > 0.6 ? 'butterfly' : 'bee',
            waveFrequency: 0.06,
            waveAmplitude: 3,
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, progress, activeScene, isScienceMode, scientificSunPos, loadingProgress, isCinematicPlaying, onSkipCinematic]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full select-none cursor-crosshair overflow-hidden pointer-events-auto"
      id="interactive-stage"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="block w-full h-full pointer-events-auto"
        id="canvas-stage"
      />
    </div>
  );
}
