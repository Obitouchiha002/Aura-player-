import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Music, Film } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';

interface MiniPlayerProps {
  onClick: () => void;
}

export function MiniPlayer({ onClick }: MiniPlayerProps) {
  const { songs, currentSongId, isPlaying, setIsPlaying, nextSong, progress, duration } = usePlayerStore();
  const [isBroken, setIsBroken] = useState(false);
  
  const currentSong = songs.find(s => s.id === currentSongId);

  useEffect(() => {
    setIsBroken(false);
  }, [currentSongId]);
  
  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const isVideo = currentSong.mediaType === 'video';

  return (
    <div 
      className="fixed bottom-[88px] left-2 right-2 md:left-auto md:right-4 md:w-80 h-16 bg-surface/90 backdrop-blur-xl rounded-2xl shadow-lg border border-surface-foreground/5 flex items-center px-3 cursor-pointer z-40 overflow-hidden"
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
    >
      {/* Progress bar background */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full"
      />
      {/* Progress bar fill */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-100"
        style={{ width: `${progressPercent}%` }}
      />

      <div className="w-10 h-10 rounded-xl overflow-hidden bg-accent flex-shrink-0 relative">
        {currentSong.coverArt && !isBroken ? (
          <img 
            src={currentSong.coverArt} 
            alt="" 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer" 
            onError={() => setIsBroken(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
            {isVideo ? <Film className="w-5 h-5" /> : <Music className="w-5 h-5" />}
          </div>
        )}
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-surface-foreground truncate">{currentSong.title}</h4>
        <p className="text-xs text-surface-foreground/60 truncate">{currentSong.artist}</p>
      </div>
      
      <div className="flex items-center gap-2 ml-2">
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-foreground/5 text-surface-foreground"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            setIsPlaying(!isPlaying);
          }}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-foreground/5 text-surface-foreground"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('medium');
            nextSong();
          }}
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>
      </div>
    </div>
  );
}
