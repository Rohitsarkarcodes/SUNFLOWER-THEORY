import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundscape } from '../utils/audio';

export default function AudioController() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsPlaying(soundscape.isSoundPlaying());
  }, []);

  const toggleSound = async () => {
    if (isPlaying) {
      soundscape.pause();
      setIsPlaying(false);
    } else {
      await soundscape.init();
      soundscape.play();
      setIsPlaying(true);
    }
  };

  return (
    <button
      id="sound-control-btn"
      onClick={toggleSound}
      className="fixed top-6 right-6 z-50 flex items-center justify-center w-8 h-8 rounded-full bg-black/25 backdrop-blur-md border border-white/10 text-[#FFF3B0]/80 hover:text-[#FFF3B0] hover:bg-black/45 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md pointer-events-auto cursor-pointer"
      title={isPlaying ? 'Mute Soundscape' : 'Enable Cinematic Soundscape'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isPlaying ? (
          <Volume2 className="w-4 h-4 text-[#FFD54F]" />
        ) : (
          <VolumeX className="w-4 h-4 text-white/40" />
        )}
      </div>
    </button>
  );
}
