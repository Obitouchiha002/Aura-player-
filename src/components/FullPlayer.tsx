import { ChevronDown, MoreHorizontal, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart, BookOpen, Plus, X, AlignLeft, Loader2, Edit3, Check, Music } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { Visualizer } from './Visualizer';
import { triggerHaptic } from '../lib/haptics';

const AVAILABLE_TAGS = ['Happy 😊', 'Sad 😢', 'Nostalgic 🕰️', 'Energetic 🔥', 'Chill 🍃', 'Focus 🧠'];

interface FullPlayerProps {
  onClose: () => void;
}

export function FullPlayer({ onClose }: FullPlayerProps) {
  const { 
    songs, currentSongId, isPlaying, setIsPlaying, 
    nextSong, prevSong, progress, duration, seekTo,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    favorites, toggleFavorite, updateSongData,
    volume, setVolume
  } = usePlayerStore();
  
  const currentSong = songs.find(s => s.id === currentSongId);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const [showStory, setShowStory] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState('');
  const [isBroken, setIsBroken] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const volumePopupTimeoutDelay = useRef<number | null>(null);
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const initialVolume = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    initialVolume.current = volume;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diffY = touchStartY.current - e.touches[0].clientY;
    const diffX = Math.abs(touchStartX.current - e.touches[0].clientX);

    // If vertical swipe is more prominent than horizontal swipe
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      let newVolume = initialVolume.current + (diffY / 200); // ~200px equivalent to 0-100% volume
      newVolume = Math.max(0, Math.min(1, newVolume));
      setVolume(newVolume);
      
      setShowVolumePopup(true);
      if (volumePopupTimeoutDelay.current) {
        clearTimeout(volumePopupTimeoutDelay.current);
      }
      volumePopupTimeoutDelay.current = window.setTimeout(() => {
        setShowVolumePopup(false);
      }, 1000);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;
    
    // Song skip (only if horizontal movement is larger than vertical)
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        triggerHaptic('medium');
        nextSong();
      } else {
        triggerHaptic('medium');
        prevSong();
      }
    }
  };

  interface ParsedLyric {
    time: number;
    text: string;
  }

  const parseLRC = (lrc: string): ParsedLyric[] => {
    const lines = lrc.split('\n');
    const parsed: ParsedLyric[] = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
      const match = timeReg.exec(line);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = parseInt(match[3]);
        const time = min * 60 + sec + (ms / (match[3].length === 2 ? 100 : 1000));
        const text = line.replace(timeReg, '').trim();
        if (text) parsed.push({ time, text });
      } else if (line.trim() && !line.startsWith('[')) {
        parsed.push({ time: -1, text: line.trim() });
      }
    }
    return parsed;
  };

  const parsedLyrics = parseLRC(currentSong?.lyrics || '');
  const hasTimestamps = parsedLyrics.some(l => l.time !== -1);
  
  // Find active lyric index
  let activeLyricIndex = -1;
  if (hasTimestamps) {
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time !== -1 && progress >= parsedLyrics[i].time) {
        activeLyricIndex = i;
      }
    }
  }

  useEffect(() => {
    if (showLyrics && !isEditingLyrics && lyricsContainerRef.current && activeLyricIndex !== -1) {
      const activeElement = lyricsContainerRef.current.children[activeLyricIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLyricIndex, showLyrics, isEditingLyrics]);

  const quotes = [
    "Music is the silence between the notes.",
    "Where words fail, music speaks.",
    "Without music, life would be a mistake.",
    "Music gives a soul to the universe, wings to the mind, flight to the imagination and life to everything."
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  if (!currentSong) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekTo(newTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!isDragging || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    setLocalProgress(percent * duration);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      seekTo(localProgress);
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, localProgress]);

  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0;

  const isFavorite = favorites.includes(currentSong.id);

  const toggleTag = (tag: string) => {
    const currentTags = currentSong.tags || [];
    if (currentTags.includes(tag)) {
      updateSongData(currentSong.id, { tags: currentTags.filter(t => t !== tag) });
    } else {
      updateSongData(currentSong.id, { tags: [...currentTags, tag] });
    }
  };

  useEffect(() => {
    setLyricsText(currentSong.lyrics || '');
    setIsBroken(false);
  }, [showLyrics, currentSong.id]);

  const saveLyrics = () => {
    updateSongData(currentSong.id, { lyrics: lyricsText });
    setIsEditingLyrics(false);
  };

  return (
    <div className="bg-background flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-8 sm:py-6 flex-shrink-0 w-full max-w-5xl mx-auto">
        <button 
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }} 
          className="p-2 -ml-2 text-surface-foreground hover:bg-surface-foreground/5 rounded-full transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[1px]">Playing from Library</p>
          <p className="text-sm font-bold text-surface-foreground mt-0.5 tracking-tight">Offline Music</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowLyrics(!showLyrics);
              setShowStory(false);
            }}
            className={cn("p-2 rounded-full transition-colors", showLyrics ? "text-primary bg-primary/10" : "text-surface-foreground hover:bg-surface-foreground/5")}
          >
            <AlignLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowDetails(!showDetails);
            }}
            className={cn("p-2 rounded-full transition-colors", showDetails ? "text-primary bg-primary/10" : "text-surface-foreground hover:bg-surface-foreground/5")}
          >
            <BookOpen className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Details Overlay */}
      {showDetails && (
        <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-xl flex flex-col pt-24 pb-32 px-6 sm:px-12 animate-in fade-in duration-300 overflow-hidden">
          <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-surface-foreground">Song Details</h2>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowDetails(false);
                }}
                className="p-2 rounded-full bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-12 space-y-4">
              <div className="bg-surface p-6 rounded-2xl border border-surface-foreground/10">
                <p className="text-sm text-muted mb-1">Album</p>
                <p className="text-xl font-bold text-surface-foreground">{currentSong.album || 'Unknown'}</p>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-surface-foreground/10">
                <p className="text-sm text-muted mb-1">Genre</p>
                <p className="text-xl font-bold text-surface-foreground">{'N/A'}</p>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-surface-foreground/10">
                <p className="text-sm text-muted mb-1">Release Year</p>
                <p className="text-xl font-bold text-surface-foreground">{'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Overlay */}
      {showLyrics && (
        <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-xl flex flex-col pt-24 pb-32 px-6 sm:px-12 animate-in fade-in duration-300 overflow-hidden">
          <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-surface-foreground">Lyrics</h2>
              <div className="flex gap-2">
                {!isEditingLyrics && (
                  <button 
                    onClick={() => {
                      triggerHaptic('light');
                      setIsEditingLyrics(true);
                    }}
                    className="p-2 rounded-full bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground transition-colors"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
                {isEditingLyrics && (
                  <button 
                    onClick={() => {
                      triggerHaptic('medium');
                      saveLyrics();
                    }}
                    className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setShowLyrics(false);
                  }}
                  className="p-2 rounded-full bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
              {isEditingLyrics ? (
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  className="w-full h-full bg-surface border border-surface-foreground/10 rounded-2xl p-6 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Paste lyrics here..."
                />
              ) : (
                <div ref={lyricsContainerRef} className="whitespace-pre-wrap text-xl sm:text-2xl font-medium leading-relaxed sm:leading-loose text-center pb-32">
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((line, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "transition-all duration-300 py-2",
                          hasTimestamps 
                            ? (index === activeLyricIndex 
                                ? "text-primary scale-105 font-bold" 
                                : "text-surface-foreground/50 hover:text-surface-foreground/80 cursor-pointer")
                            : "text-surface-foreground/90"
                        )}
                        onClick={() => {
                          if (line.time !== -1) {
                            seekTo(line.time);
                          }
                        }}
                      >
                        {line.text}
                      </div>
                    ))
                  ) : (
                    <div className="text-surface-foreground/90">{currentSong.lyrics || "No lyrics available."}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Album Art */}
      <div 
        className="flex-1 min-h-0 flex items-center justify-center px-8 py-2 sm:px-12 sm:py-8 w-full max-w-5xl mx-auto relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Animated Volume Indicator */}
        <div className={cn(
          "absolute z-20 top-4 max-w-[200px] w-full bg-background/80 backdrop-blur-md px-4 py-2 border border-surface-foreground/10 rounded-full flex items-center gap-3 transition-all duration-300 pointer-events-none",
          showVolumePopup ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}>
           <div className="text-surface-foreground">
              {volume === 0 ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-x"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>}
           </div>
           <div className="flex-1 h-1.5 bg-surface-foreground/20 rounded-full overflow-hidden">
             <div className="h-full bg-primary" style={{ width: `${volume * 100}%` }}></div>
           </div>
        </div>

        <div className={cn(
          "w-full max-w-[220px] sm:max-w-[400px] md:max-w-[500px] aspect-square rounded-[24px] sm:rounded-[32px] shadow-soft overflow-hidden bg-[#EEEBE3] dark:bg-surface transition-transform duration-500 mx-auto",
          isPlaying ? "scale-100" : "scale-95"
        )}>
          {currentSong.coverArt && !isBroken ? (
            <img 
              src={currentSong.coverArt} 
              alt={currentSong.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setIsBroken(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
              <Music className="w-24 h-24" />
            </div>
          )}
        </div>
      </div>

      {/* Controls Section */}
      <div className="px-6 pb-6 sm:px-12 sm:pb-12 flex-shrink-0 mt-auto w-full max-w-3xl mx-auto">
        {/* Song Info */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 relative">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-[24px] sm:text-[36px] md:text-[42px] font-extrabold text-surface-foreground truncate tracking-[-1px] leading-none mb-1 sm:mb-2">{currentSong.title}</h2>
            <p className="text-sm sm:text-lg md:text-xl text-muted truncate mb-2">{currentSong.artist}</p>
            
            {/* Emotion Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {(currentSong.tags || []).map(tag => (
                <span key={tag} className="text-[10px] sm:text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {tag}
                </span>
              ))}
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowTagSelector(!showTagSelector);
                }}
                className="text-[10px] sm:text-xs font-bold px-2 py-1 bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground rounded-full flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Tag
              </button>
            </div>

            {/* Tag Selector Popover */}
            {showTagSelector && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface/95 backdrop-blur-xl border border-surface-foreground/10 rounded-2xl shadow-xl z-50 p-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Emotion Tags</span>
                  <button onClick={() => {
                    triggerHaptic('light');
                    setShowTagSelector(false);
                  }} className="p-1 hover:bg-surface-foreground/10 rounded-full">
                    <X className="w-4 h-4 text-surface-foreground" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(tag => {
                    const isActive = (currentSong.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          triggerHaptic('medium');
                          toggleTag(tag);
                        }}
                        className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                          isActive ? "bg-primary text-white" : "bg-surface-foreground/5 text-surface-foreground hover:bg-surface-foreground/10"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              triggerHaptic('light');
              toggleFavorite(currentSong.id);
            }}
            className="p-2 sm:p-4 hover:bg-surface-foreground/5 rounded-full transition-colors flex-shrink-0 self-start"
          >
            <Heart className={cn("w-6 h-6 sm:w-8 sm:h-8 transition-colors", isFavorite ? "fill-primary text-primary" : "text-surface-foreground")} />
          </button>
        </div>

        {/* Visualizer */}
        <div className="mb-2 sm:mb-6 h-10 sm:h-16 md:h-20">
          <Visualizer />
        </div>

        {/* Progress Bar */}
        <div className="mb-4 sm:mb-8">
          <div 
            ref={progressBarRef}
            className="h-2 sm:h-3 bg-[#E0DCD4] dark:bg-surface-foreground/10 rounded-full cursor-pointer relative group"
            onPointerDown={handlePointerDown}
            onClick={(e) => {
              triggerHaptic('light');
              handleProgressClick(e);
            }}
          >
            <div 
              className={cn("absolute top-0 left-0 h-full bg-primary rounded-full", !isDragging && "transition-all duration-300 ease-out")}
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] sm:text-[12px] font-bold text-muted mt-2 tracking-wide">
            <span>{formatTime(localProgress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-between pb-safe">
          <button 
            onClick={() => {
              triggerHaptic('light');
              toggleShuffle();
            }}
            className={cn("p-2 sm:p-3 transition-colors", isShuffle ? "text-primary" : "text-surface-foreground/50 hover:text-surface-foreground")}
          >
            <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </button>
          
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            <button 
              onClick={() => {
                triggerHaptic('medium');
                prevSong();
              }}
              className="p-3 sm:p-4 text-surface-foreground hover:bg-surface-foreground/5 rounded-full transition-colors"
            >
              <SkipBack className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-current" />
            </button>
            
            <button 
              onClick={() => {
                triggerHaptic('heavy');
                setIsPlaying(!isPlaying);
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-soft"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-current" />
              ) : (
                <Play className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-current ml-1 sm:ml-2" />
              )}
            </button>
            
            <button 
              onClick={() => {
                triggerHaptic('medium');
                nextSong();
              }}
              className="p-3 sm:p-4 text-surface-foreground hover:bg-surface-foreground/5 rounded-full transition-colors"
            >
              <SkipForward className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-current" />
            </button>
          </div>

          <button 
            onClick={() => {
              triggerHaptic('light');
              toggleRepeat();
            }}
            className={cn("p-2 sm:p-3 transition-colors", repeatMode !== 'off' ? "text-primary" : "text-surface-foreground/50 hover:text-surface-foreground")}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" /> : <Repeat className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />}
          </button>
        </div>
      </div>
    </div>
  );
}
