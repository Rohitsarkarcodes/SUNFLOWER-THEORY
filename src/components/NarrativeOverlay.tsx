import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryScene } from '../types';

const getSceneChapterTagline = (scene: StoryScene): string => {
  switch (scene) {
    case StoryScene.HERO: return 'The Prelude';
    case StoryScene.MORNING: return 'The Dawn Chapter';
    case StoryScene.AFTERNOON: return 'The Radiant Chapter';
    case StoryScene.SCIENCE: return 'The Heliotropism Study';
    case StoryScene.GOLDEN_HOUR: return 'The Sunset Chapter';
    case StoryScene.SUNSET: return 'The Twilight Chapter';
    case StoryScene.NIGHT: return 'The Nightfall Chapter';
    case StoryScene.ENDING: return 'The Final Chapter';
    default: return 'The Sunflower Theory';
  }
};

const getSceneSceneTag = (scene: StoryScene): string => {
  switch (scene) {
    case StoryScene.HERO: return 'SCENE 01 // OVERTURE';
    case StoryScene.MORNING: return 'SCENE 02 // DAWN';
    case StoryScene.AFTERNOON: return 'SCENE 03 // VERTICAL BLOOM';
    case StoryScene.SCIENCE: return 'SCENE 04 // PHYSIOLOGY';
    case StoryScene.GOLDEN_HOUR: return 'SCENE 05 // REFLECTION';
    case StoryScene.SUNSET: return 'SCENE 06 // RESOLUTION';
    case StoryScene.NIGHT: return 'SCENE 09 // TWILIGHT';
    case StoryScene.ENDING: return 'SCENE 10 // ETERNITY';
    default: return 'SCENE 00 // CHRONICLES';
  }
};

interface NarrativeOverlayProps {
  progress: number;
  activeScene: StoryScene;
  isScienceMode: boolean;
  onToggleScience: (val: boolean) => void;
  onNextScene: () => void;
  onPrevScene: () => void;
}

export default function NarrativeOverlay({
  progress,
  activeScene,
  isScienceMode,
  onToggleScience,
  onNextScene,
  onPrevScene,
}: NarrativeOverlayProps) {
  // Determine which caption to show based on granular progress points
  const getCaptionInfo = (): { title: string; subtitle?: string; hint?: string } | null => {
    if (activeScene === StoryScene.HERO) {
      return {
        title: 'Every sunflower waits for its sun.',
        subtitle: 'A cinematic story of light, devotion, and silent connection.',
      };
    }

    if (activeScene === StoryScene.MORNING) {
      return {
        title: "Some lights don't need directions.",
        subtitle: 'They simply know where to belong.',
        hint: 'Hover cursor to affect the breeze',
      };
    }

    if (activeScene === StoryScene.AFTERNOON) {
      return {
        title: 'Basking in the golden rays of life.',
        subtitle: 'The field is fully alive, dancing in the warm afternoon god rays.',
        hint: 'Click anywhere to trigger a petal explosion',
      };
    }

    if (activeScene === StoryScene.SCIENCE) {
      return {
        title: "Drawn to the light's embrace.",
        subtitle: "Heliotropism guides young stems to follow the golden sun's path.",
        hint: 'Drag the glowing sun to guide their hearts',
      };
    }

    if (activeScene === StoryScene.GOLDEN_HOUR) {
      return {
        title: 'The world softens under long shadows.',
        subtitle: 'Pollen shimmers in the warm embers of a dying sun.',
      };
    }

    if (activeScene === StoryScene.SUNSET) {
      return {
        title: 'The sky bleeds from crimson to deep violet...',
        subtitle: 'And the light slowly slips away, leaving a cool twilight hush.',
      };
    }

    if (activeScene === StoryScene.NIGHT) {
      // Divide night into chapters
      if (progress >= 75 && progress < 80) {
        return {
          title: 'When the sun disappears...',
          subtitle: 'And cold shadows cover the landscape...',
        };
      }
      if (progress >= 80 && progress < 85) {
        return {
          title: "They don't face the darkness alone.",
          subtitle: 'They slowly rotate their heavy heads towards one another...',
        };
      }
      return {
        title: "They become each other's light.",
        subtitle: 'Sharing warmth when the sky is empty.',
        hint: 'Click the moon to summon fireflies',
      };
    }

    if (activeScene === StoryScene.ENDING) {
      if (progress >= 90 && progress < 96) {
        return {
          title: 'Not every sunflower reaches the sun...',
        };
      }
      return {
        title: 'Sometimes, the greatest love is found when two sunflowers become each other’s light.',
      };
    }

    return null;
  };

  const caption = getCaptionInfo();

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 md:p-16 z-30">
      {/* Cinematic Frame Border / Letterbox elements for extra prestige */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

      {/* Top Header Section */}
      <div className="flex justify-between items-start w-full">
        <div className="flex flex-col gap-1 select-none">
          {/* Header text removed to keep the interface completely clean and clutter-free */}
        </div>

        {/* Narrative progress slider (made ultra-minimal, no text labels) */}
        {activeScene !== StoryScene.LOADING && activeScene !== StoryScene.ENDING && (
          <div className="flex items-center gap-3">
            <div className="relative w-24 md:w-36 h-[1.5px] bg-[#FFF3B0]/10 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-[#FFD54F]/80 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Center Narrative Core */}
      <div className="flex-1 flex items-start justify-center max-w-3xl mx-auto w-full text-center pt-8 md:pt-14">
        <AnimatePresence mode="wait">
          {caption && (
            <motion.div
              key={caption.title}
              initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -25, filter: 'blur(8px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4 px-4"
            >
              <p className="uppercase tracking-[0.4em] text-[10px] opacity-60 text-[#FFD54F] font-mono">
                {getSceneChapterTagline(activeScene)}
              </p>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-light italic leading-tight max-w-2xl mx-auto text-[#FFF3B0]" style={{ fontFamily: "Georgia, serif" }}>
                {caption.title}
              </h2>
              {caption.subtitle && (
                <p className="text-xs md:text-sm text-[#FFF3B0]/70 tracking-widest max-w-xl font-sans font-light leading-relaxed uppercase">
                  {caption.subtitle}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls / Interactivity Prompt / Scene Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full pointer-events-auto">
        
        {/* Interaction hints */}
        <div className="min-h-[1.5rem] flex items-center">
          <AnimatePresence mode="wait">
            {caption?.hint && (
              <motion.div
                key={caption.hint}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-2 bg-[#FFF3B0]/5 border border-[#FFF3B0]/10 px-3 py-1 rounded-full text-[10px] font-mono text-[#FFF3B0]/60 tracking-wider"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD54F] animate-pulse" />
                {caption.hint}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimal Subtle Navigation Arrows */}
        {activeScene !== StoryScene.LOADING && activeScene !== StoryScene.ENDING && (
          <div className="flex gap-2 glass-panel p-1 rounded-full">
            <button
              onClick={onPrevScene}
              disabled={progress <= 5}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#FFF3B0]/60 hover:text-[#FFF3B0] hover:bg-[#FFF3B0]/10 transition-all duration-300 disabled:opacity-25 disabled:hover:bg-transparent pointer-events-auto cursor-pointer"
              title="Previous Chapter"
            >
              ←
            </button>
            <button
              onClick={onNextScene}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#FFF3B0]/60 hover:text-[#FFF3B0] hover:bg-[#FFF3B0]/10 transition-all duration-300 pointer-events-auto cursor-pointer"
              title="Next Chapter"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
