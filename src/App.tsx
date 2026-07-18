import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryScene, Point } from './types';
import InteractiveCanvas from './components/InteractiveCanvas';
import NarrativeOverlay from './components/NarrativeOverlay';
import AudioController from './components/AudioController';
import { soundscape } from './utils/audio';

const QUOTES = [
  "Love is becoming someone's sunrise.",
  "Some flowers bloom because of light. Others bloom because of love.",
  "Distance hides the sun. Never the connection.",
  "True love shines brightest after sunset.",
  "In the field of souls, you are my golden hour.",
  "Sometimes... becoming each other's light is all we need to survive."
];

export default function App() {
  const [activeScene, setActiveScene] = useState<StoryScene>(StoryScene.LOADING);
  const [isCinematicPlaying, setIsCinematicPlaying] = useState(false);
  const [isFadingTransition, setIsFadingTransition] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0); // target progress 0-100
  const [lerpedProgress, setLerpedProgress] = useState(0); // smooth momentum progress

  // Science / Symbolism panel state
  const [isScienceMode, setIsScienceMode] = useState(true);
  const [scientificSunPos, setScientificSunPos] = useState<Point>({ x: 300, y: 150 });

  // Floating Secret Quote State
  const [secretQuote, setSecretQuote] = useState<string | null>(null);
  const [quotePosition, setQuotePosition] = useState<Point>({ x: 0, y: 0 });
  const [isPressing, setIsPressing] = useState(false);
  const pressTimerRef = useRef<any>(null);

  // Track touch positions for swipe/scroll
  const touchStartY = useRef<number>(0);

  // Smooth scroll interpolation loop
  useEffect(() => {
    if (activeScene === StoryScene.LOADING) return;

    let active = true;
    const lerpLoop = () => {
      if (!active) return;
      setLerpedProgress((prev) => {
        const diff = scrollProgress - prev;
        if (Math.abs(diff) < 0.01) {
          return scrollProgress;
        }
        return prev + diff * 0.08; // LERP speed
      });
      requestAnimationFrame(lerpLoop);
    };
    requestAnimationFrame(lerpLoop);
    return () => {
      active = false;
    };
  }, [scrollProgress, activeScene]);

  // Loading timer simulation
  useEffect(() => {
    if (activeScene !== StoryScene.LOADING) return;

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Organic seed growing speeds
        const step = prev < 25 ? 1.5 : prev < 75 ? 0.8 : 1.2;
        return Math.min(100, prev + step);
      });
    }, 35);

    return () => clearInterval(interval);
  }, [activeScene]);

  // Map progress to active story scene
  useEffect(() => {
    if (activeScene === StoryScene.LOADING) return;

    let scene = StoryScene.HERO;
    if (lerpedProgress < 12) {
      scene = StoryScene.HERO;
    } else if (lerpedProgress < 27) {
      scene = StoryScene.MORNING;
    } else if (lerpedProgress < 46) {
      scene = StoryScene.AFTERNOON;
    } else if (lerpedProgress < 62) {
      scene = StoryScene.GOLDEN_HOUR;
    } else if (lerpedProgress < 75) {
      scene = StoryScene.SUNSET;
    } else if (lerpedProgress < 90) {
      scene = StoryScene.NIGHT;
    } else {
      scene = StoryScene.ENDING;
    }

    setActiveScene(scene);

    // Crossfade the synthesized audio tracks dynamically
    const sceneProgress = getSceneRelativeProgress(lerpedProgress, scene);
    soundscape.updateScene(scene, sceneProgress);
  }, [lerpedProgress, activeScene]);

  // Helper to map 0-100 overall progress to a 0-1 scene progress
  const getSceneRelativeProgress = (p: number, scene: StoryScene): number => {
    switch (scene) {
      case StoryScene.HERO: return p / 12;
      case StoryScene.MORNING: return (p - 12) / 15;
      case StoryScene.AFTERNOON: return (p - 27) / 19;
      case StoryScene.GOLDEN_HOUR: return (p - 46) / 16;
      case StoryScene.SUNSET: return (p - 62) / 13;
      case StoryScene.NIGHT: return (p - 75) / 15;
      case StoryScene.ENDING: return (p - 90) / 10;
      default: return 0;
    }
  };

  // Scroll, Keyboard and Touch Gesture Listeners
  useEffect(() => {
    if (activeScene === StoryScene.LOADING) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScrollProgress((prev) => {
        // Slow natural scroll steps
        const step = e.deltaY * 0.04;
        return Math.min(Math.max(0, prev + step), 100);
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        setScrollProgress((prev) => Math.min(100, prev + 3));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        setScrollProgress((prev) => Math.max(0, prev - 3));
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY.current - currentY;
      touchStartY.current = currentY;

      setScrollProgress((prev) => {
        const step = deltaY * 0.15;
        return Math.min(Math.max(0, prev + step), 100);
      });
    };

    // Bind event listeners with passive set to false to allow preventing default scroll stutters
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeScene]);

  // Jump Scene click helpers
  const handleNextScene = () => {
    setScrollProgress((prev) => {
      if (prev < 12) return 12;
      if (prev < 25) return 25;
      if (prev < 38) return 38;
      if (prev < 50) return 50;
      if (prev < 65) return 65;
      if (prev < 75) return 75;
      if (prev < 90) return 90;
      return 100;
    });
  };

  const handlePrevScene = () => {
    setScrollProgress((prev) => {
      if (prev > 90) return 75;
      if (prev > 75) return 65;
      if (prev > 65) return 50;
      if (prev > 50) return 38;
      if (prev > 38) return 25;
      if (prev > 25) return 12;
      return 0;
    });
  };

  // Start Experience click handler (Required to unlock Web Audio API)
  const handleBeginStory = async () => {
    setActiveScene(StoryScene.HERO);
    setScrollProgress(0);
    setLerpedProgress(0);
    setIsCinematicPlaying(true);

    // Initialise synthesized soundtrack
    await soundscape.init();
    soundscape.play();
    soundscape.updateScene(StoryScene.HERO, 0);
  };

  const handleSkipCinematic = () => {
    if (isFadingTransition) return;
    setIsFadingTransition(true);

    setTimeout(() => {
      setIsCinematicPlaying(false);
      setActiveScene(StoryScene.HERO);
      setScrollProgress(0);
      setLerpedProgress(0);
      soundscape.updateScene(StoryScene.HERO, 0);
    }, 800);

    setTimeout(() => {
      setIsFadingTransition(false);
    }, 1800);
  };

  // Long press handler to reveal secret quotes
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeScene === StoryScene.LOADING) return;
    setIsPressing(true);
    const x = e.clientX;
    const y = e.clientY;

    pressTimerRef.current = setTimeout(() => {
      // Trigger Quote
      const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setSecretQuote(randomQuote);
      setQuotePosition({ x, y });
    }, 600); // long press threshold
  };

  const handleMouseUp = () => {
    setIsPressing(false);
    setSecretQuote(null);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  // Keep Science Sun anchored to a relative space on resize
  useEffect(() => {
    const handleResize = () => {
      setScientificSunPos({
        x: window.innerWidth * 0.25 + 60,
        y: window.innerHeight * 0.4
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="relative w-full h-screen bg-[#081229] text-[#FFF3B0] select-none overflow-hidden font-serif"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        // Trigger same long press for mobile
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        setIsPressing(true);
        pressTimerRef.current = setTimeout(() => {
          const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
          setSecretQuote(randomQuote);
          setQuotePosition({ x, y });
        }, 600);
      }}
      onTouchEnd={() => {
        setIsPressing(false);
        setSecretQuote(null);
        if (pressTimerRef.current) {
          clearTimeout(pressTimerRef.current);
        }
      }}
    >
      {/* Cinematic Ambient Atmosphere Overlays */}
      <div className="atmosphere pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none z-0" />

      {/* 1. CINEMATIC BACKGROUND DRAWING SURFACE */}
      <InteractiveCanvas
        progress={lerpedProgress}
        activeScene={activeScene}
        isScienceMode={isScienceMode}
        scientificSunPos={scientificSunPos}
        onScientificSunMove={setScientificSunPos}
        loadingProgress={loadingProgress}
        isCinematicPlaying={isCinematicPlaying}
        onSkipCinematic={handleSkipCinematic}
      />

      {/* DELICATE CINEMATIC ESCAPE BUTTON */}
      <AnimatePresence>
        {isCinematicPlaying && !isFadingTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            whileHover={{ opacity: 1.0 }}
            transition={{ duration: 1.0 }}
            className="absolute bottom-6 right-6 z-50 pointer-events-auto"
            id="skip-cinematic-btn-container"
          >
            <button
              onClick={handleSkipCinematic}
              className="px-4 py-2 rounded-full border border-white/20 bg-black/10 backdrop-blur-sm text-white text-[10px] tracking-[0.25em] font-mono uppercase transition-all duration-300 hover:bg-white/10 hover:border-white/40 cursor-pointer"
              id="skip-cinematic-btn"
            >
              Skip Intro
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. AUDIO CONTROLLER FLOTATION (Only when story starts) */}
      {activeScene !== StoryScene.LOADING && !isCinematicPlaying && !isFadingTransition && <AudioController />}

      {/* 3. NARRATIVE TEXTS AND CONTROLS LAYERS */}
      {activeScene !== StoryScene.LOADING && !isCinematicPlaying && !isFadingTransition && (
        <NarrativeOverlay
          progress={lerpedProgress}
          activeScene={activeScene}
          isScienceMode={isScienceMode}
          onToggleScience={setIsScienceMode}
          onNextScene={handleNextScene}
          onPrevScene={handlePrevScene}
        />
      )}

      {/* CINEMATIC TRANSITION OVERLAY */}
      <AnimatePresence>
        {isFadingTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-50 bg-[#010307] flex flex-col items-center justify-center pointer-events-auto"
            id="cinematic-transition-overlay"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 1.0 }}
              className="w-2 h-2 rounded-full bg-[#FFD54F] shadow-[0_0_20px_#FFD54F]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. LOADING SCREEN (PRESTIGE BLOOM LOADER) */}
      <AnimatePresence>
        {activeScene === StoryScene.LOADING && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(15px)' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-0 z-40 flex flex-col justify-between items-center p-12 bg-[#081229] pointer-events-auto overflow-hidden"
          >
            {/* Ambient Overlays for loading scene */}
            <div className="atmosphere pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-25 pointer-events-none z-0" />

            {/* Minimal Header */}
            <div className="flex flex-col items-center gap-2 mt-6 relative z-10 select-none">
              <span className="text-[10px] tracking-[0.4em] font-mono text-[#FFD54F]/70 uppercase">Prestige Storybook</span>
              <h2 className="text-xl tracking-widest font-light text-[#FFF3B0] uppercase" style={{ fontFamily: "Georgia, serif" }}>
                🌻 The Sunflower Theory 🌻
              </h2>
            </div>

            {/* Central sprout instructions */}
            <div className="flex flex-col items-center gap-4 text-center select-none relative z-10">
              <div className="h-64 flex items-center justify-center">
                {/* Visual placeholder while canvas grows */}
              </div>
              
              <AnimatePresence mode="wait">
                {loadingProgress < 100 ? (
                  <motion.p
                    key="grow-txt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-mono tracking-widest text-[#FFF3B0]/60 uppercase"
                  >
                    {loadingProgress < 25 && "Planted in silence..."}
                    {loadingProgress >= 25 && loadingProgress < 55 && "Growing roots..."}
                    {loadingProgress >= 55 && loadingProgress < 85 && "Reaching for sunlight..."}
                    {loadingProgress >= 85 && "Preparing the bloom..."}
                  </motion.p>
                ) : (
                  <motion.div
                    key="begin-btn"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <button
                      onClick={handleBeginStory}
                      className="px-8 py-3.5 rounded-full border border-[#FFD54F]/30 bg-[#FFD54F]/5 text-[#FFD54F] hover:text-black hover:bg-[#FFD54F] hover:border-[#FFD54F] tracking-[0.25em] font-mono text-xs uppercase transition-all duration-500 shadow-[0_0_20px_rgba(255,213,79,0.15)] hover:shadow-[0_0_35px_rgba(255,213,79,0.45)] pointer-events-auto cursor-pointer"
                    >
                      Let It Bloom
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom spacer to maintain layout */}
            <div className="mb-6 h-4 relative z-10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. FLOATING SECRET QUOTE MODAL ON LONG PRESS */}
      <AnimatePresence>
        {secretQuote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.85, y: -10, filter: 'blur(5px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 pointer-events-none p-6 rounded-2xl glass-panel shadow-2xl max-w-sm text-center"
            style={{
              left: Math.min(window.innerWidth - 340, Math.max(20, quotePosition.x - 170)),
              top: Math.min(window.innerHeight - 150, Math.max(20, quotePosition.y - 120)),
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-[9px] font-mono text-[#FFD54F] tracking-widest uppercase">Secret Whisper</span>
              <p className="text-base font-serif text-[#FFF3B0] leading-relaxed italic">
                "{secretQuote}"
              </p>
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A65] animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. CORNER INSTRUCTIONS OR INTERACTIVITY HELPER FOR EXTRA DELIGHT */}
      <AnimatePresence>
        {isPressing && !secretQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/10 pointer-events-none flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-white/40 border-t-transparent animate-spin" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-white/60">
                Holding to listen...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
