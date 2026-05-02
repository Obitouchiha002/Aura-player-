import { ChevronDown, MoreHorizontal, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart, BookOpen, Plus, X, AlignLeft, Loader2, Edit3, Check, Music, Download, MoonStar, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { Visualizer } from './Visualizer';
import { triggerHaptic } from '../lib/haptics';
import { useShallow } from 'zustand/react/shallow';

const AVAILABLE_TAGS = ['Happy 😊', 'Sad 😢', 'Nostalgic 🕰️', 'Energetic 🔥', 'Chill 🍃', 'Focus 🧠'];

interface FullPlayerProps {
  onClose: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlayerProgressBar = () => {
  const { progress, duration, seekTo } = usePlayerStore(useShallow(state => ({
    progress: state.progress,
    duration: state.duration,
    seekTo: state.seekTo
  })));
  
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);
  
  const handleSeek = (e: React.MouseEvent | React.TouchEvent) => {
    if (progressBarRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setLocalProgress(percent * duration);
      seekTo(percent * duration);
    }
  };

  const progressPercent = duration > 0 ? (localProgress / duration) * 100 : 0;
  
  return (
    <>
      <div 
        className="h-10 flex items-center mb-1 cursor-pointer group touch-none"
        ref={progressBarRef}
        onMouseDown={(e) => { setIsDragging(true); handleSeek(e); }}
        onMouseMove={(e) => { if (isDragging) handleSeek(e); }}
        onMouseUp={() => { setIsDragging(false); triggerHaptic('light'); }}
        onMouseLeave={() => setIsDragging(false)}
        onTouchStart={(e) => { setIsDragging(true); handleSeek(e); }}
        onTouchMove={(e) => { if (isDragging) handleSeek(e); }}
        onTouchEnd={() => { setIsDragging(false); triggerHaptic('light'); }}
      >
        <div className="w-full h-1.5 bg-surface-foreground/10 rounded-full relative overflow-hidden group-hover:h-2.5 transition-all">
          <div 
            className="absolute top-0 left-0 h-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs font-medium text-surface-foreground/60 mb-6 font-mono">
        <span>{formatTime(localProgress)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </>
  );
};

export function FullPlayer({ onClose }: FullPlayerProps) {
  const { 
    songs, currentSongId, isPlaying, setIsPlaying, 
    nextSong, prevSong, duration, seekTo, progress,
    isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    favorites, toggleFavorite, updateSongData,
    volume, setVolume, sleepTimerEndTime, setSleepTimer, setExactSleepTimer
  } = usePlayerStore(useShallow(state => ({
    songs: state.songs, currentSongId: state.currentSongId, isPlaying: state.isPlaying, setIsPlaying: state.setIsPlaying,
    nextSong: state.nextSong, prevSong: state.prevSong, duration: state.duration, seekTo: state.seekTo, progress: state.progress,
    isShuffle: state.isShuffle, toggleShuffle: state.toggleShuffle, repeatMode: state.repeatMode, toggleRepeat: state.toggleRepeat,
    favorites: state.favorites, toggleFavorite: state.toggleFavorite, updateSongData: state.updateSongData,
    volume: state.volume, setVolume: state.setVolume,
    sleepTimerEndTime: state.sleepTimerEndTime, setSleepTimer: state.setSleepTimer, setExactSleepTimer: state.setExactSleepTimer
  })));
  
  const currentSong = songs.find(s => s.id === currentSongId);
  const [showStory, setShowStory] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [lyricsText, setLyricsText] = useState('');
  const [isBroken, setIsBroken] = useState(false);
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState<string | null>(null);
  const volumePopupTimeoutDelay = useRef<number | null>(null);

  useEffect(() => {
    if (!sleepTimerEndTime) {
      setTimerRemaining(null);
      return;
    }
    const updateTimerRemaining = () => {
      const remainingMs = sleepTimerEndTime - Date.now();
      if (remainingMs <= 0) {
        setTimerRemaining(null);
        return;
      }
      const mins = Math.floor(remainingMs / 60000);
      setTimerRemaining(mins > 0 ? `${mins}m` : '<1m');
    };
    updateTimerRemaining();
    const interval = setInterval(updateTimerRemaining, 10000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);
  
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
    if (currentSong) {
      setLyricsText(currentSong.lyrics || '');
      setIsBroken(false);
    }
  }, [showLyrics, currentSong?.id]);

  if (!currentSong) return null;

  const isFavorite = favorites.includes(currentSong.id);

  const toggleTag = (tag: string) => {
    const currentTags = currentSong.tags || [];
    if (currentTags.includes(tag)) {
      updateSongData(currentSong.id, { tags: currentTags.filter(t => t !== tag) });
    } else {
      updateSongData(currentSong.id, { tags: [...currentTags, tag] });
    }
  };

  const saveLyrics = () => {
    updateSongData(currentSong.id, { lyrics: lyricsText });
    setIsEditingLyrics(false);
  };

  const handleDownload = async () => {
    if (isDownloading || isDownloaded || !currentSong.url) return;
    triggerHaptic('medium');
    setIsDownloading(true);

    try {
      // Simulate download process or actually download URL
      const response = await fetch(currentSong.url);
      const blob = await response.blob();
      const link = document.createElement('url'); // dummy elements
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${currentSong.title}.mp3`;
      a.click();
      URL.revokeObjectURL(href);
      
      setIsDownloading(false);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
      triggerHaptic('heavy');
    } catch (error) {
      console.error(error);
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-background flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-8 sm:py-6 flex-shrink-0 w-full max-w-7xl mx-auto z-10 relative">
        <button 
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }} 
          className="p-2 -ml-2 text-surface-foreground hover:bg-surface-foreground/5 active:scale-95 hover:scale-105 rounded-full transition-all duration-300"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold text-primary uppercase tracking-[1px]">Playing from Library</p>
          <p className="text-sm font-bold text-surface-foreground mt-0.5 tracking-tight">Offline Music</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowLyrics(!showLyrics);
              setShowDetails(false);
              setShowSleepTimer(false);
            }}
            className={cn("p-2 rounded-full transition-all duration-300 active:scale-95 hover:scale-105", showLyrics ? "text-primary bg-primary/10" : "text-surface-foreground hover:bg-surface-foreground/5")}
          >
            <AlignLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowDetails(!showDetails);
              setShowLyrics(false);
              setShowSleepTimer(false);
            }}
            className={cn("p-2 rounded-full transition-all duration-300 active:scale-95 hover:scale-105", showDetails ? "text-primary bg-primary/10" : "text-surface-foreground hover:bg-surface-foreground/5")}
          >
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowSleepTimer(!showSleepTimer);
              setShowDetails(false);
              setShowLyrics(false);
            }}
            className={cn("p-2 rounded-full transition-all duration-300 active:scale-95 hover:scale-105 relative", sleepTimerEndTime ? "text-primary bg-primary/10" : "text-surface-foreground hover:bg-surface-foreground/5")}
          >
            <MoonStar className="w-5 h-5 sm:w-6 sm:h-6" />
            {timerRemaining && (
              <span className="absolute -bottom-2 -right-1 bg-surface border border-surface-foreground/20 text-[9px] font-bold px-1 rounded-full text-primary pointer-events-none">
                {timerRemaining}
              </span>
            )}
          </button>
          <div className="w-px h-6 bg-surface-foreground/10 mx-1"></div>
          <button 
            onClick={() => {
              triggerHaptic('medium');
              onClose();
            }}
            className="p-2 -mr-2 rounded-full transition-all duration-300 active:scale-95 hover:scale-105 text-surface-foreground hover:bg-red-500/10 hover:text-red-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Sleep Timer Overlay */}
      <AnimatePresence>
        {showSleepTimer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface border border-surface-foreground/10 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => { triggerHaptic('light'); setShowSleepTimer(false); }}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-foreground/10 transition-colors"
              >
                <X className="w-5 h-5 text-surface-foreground" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <MoonStar className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-surface-foreground">Sleep Timer</h3>
                  <p className="text-sm text-surface-foreground/60">{timerRemaining ? `${timerRemaining} left` : 'Stop music automatically'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[15, 30, 45, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => { setSleepTimer(mins); triggerHaptic('light'); setShowSleepTimer(false); }}
                    className="py-3 rounded-2xl bg-surface-foreground/5 hover:bg-primary/10 hover:text-primary text-surface-foreground font-bold transition-all duration-300 active:scale-95 text-sm sm:text-base border border-transparent hover:border-primary/20"
                  >
                    {mins} min
                  </button>
                ))}
              </div>

              <div className="relative group rounded-2xl bg-surface-foreground/5 hover:bg-surface-foreground/10 transition-colors flex items-center justify-between px-4 py-3 cursor-pointer mb-4">
                 <div className="flex items-center gap-3 text-surface-foreground/70 group-hover:text-primary transition-colors z-10 pointer-events-none">
                   <Clock className="w-5 h-5" />
                   <span className="text-sm font-bold uppercase tracking-wider">Set Exact Time</span>
                 </div>
                 <div className="flex items-center gap-1 z-10 pointer-events-none text-surface-foreground/40 group-hover:text-primary transition-colors relative">
                   <ChevronRight className="w-5 h-5" />
                 </div>
                 <input
                   type="time"
                   onChange={(e) => {
                     const timeString = e.target.value;
                     if (!timeString) return;
                     triggerHaptic('light');
                     const [hours, minutes] = timeString.split(':').map(Number);
                     const targetTime = new Date();
                     targetTime.setHours(hours, minutes, 0, 0);
                     if (targetTime.getTime() <= Date.now()) {
                       targetTime.setDate(targetTime.getDate() + 1);
                     }
                     setExactSleepTimer(targetTime.getTime());
                     setShowSleepTimer(false);
                   }}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                 />
              </div>

              {timerRemaining && (
                <button 
                  onClick={() => { setSleepTimer(null); triggerHaptic('light'); setShowSleepTimer(false); }} 
                  className="w-full py-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold transition-all duration-300 active:scale-95 text-sm sm:text-base border border-red-500/20 shadow-sm"
                >
                  Turn Off Timer
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Overlay */}
      {showDetails && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col pt-24 pb-32 px-6 sm:px-12 animate-in fade-in duration-300 overflow-hidden">
          <div className="w-full max-w-3xl mx-auto flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-surface-foreground">Song Details</h2>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setShowDetails(false);
                }}
                className="p-2 rounded-full bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-12 space-y-4">
              <div className="bg-surface p-6 rounded-2xl border border-surface-foreground/10 hover:border-surface-foreground/20 transition-all duration-300">
                <p className="text-sm text-muted mb-1">Album</p>
                <p className="text-xl font-bold text-surface-foreground">{currentSong.album || 'Unknown'}</p>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-surface-foreground/10 hover:border-surface-foreground/20 transition-all duration-300">
                <p className="text-sm text-muted mb-1">Genre</p>
                <p className="text-xl font-bold text-surface-foreground">{'N/A'}</p>
              </div>
              <div className="bg-surface p-6 rounded-2xl border border-surface-foreground/10 hover:border-surface-foreground/20 transition-all duration-300">
                <p className="text-sm text-muted mb-1">Release Year</p>
                <p className="text-xl font-bold text-surface-foreground">{'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Overlay */}
      {showLyrics && (
        <div className="absolute inset-0 z-50 bg-background flex flex-col pt-24 pb-32 px-6 sm:px-12 animate-in fade-in duration-300 overflow-hidden">
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
                    className="p-2 rounded-full bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground transition-all duration-300 hover:scale-105 active:scale-95"
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
                    className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setShowLyrics(false);
                  }}
                  className="p-2 rounded-full bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground transition-all duration-300 hover:scale-105 active:scale-95"
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
                  className="w-full h-full bg-surface border border-surface-foreground/10 rounded-2xl p-6 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all duration-300"
                  placeholder="Paste lyrics here..."
                />
              ) : (
                <div ref={lyricsContainerRef} className="whitespace-pre-wrap text-[20px] md:text-[24px] lg:text-[28px] font-medium leading-[1.8] sm:leading-[2] text-center pb-32">
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((line, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "transition-all duration-500 py-3 md:py-4",
                          hasTimestamps 
                            ? (index === activeLyricIndex 
                                ? "text-primary scale-[1.08] font-bold" 
                                : "text-surface-foreground/40 hover:text-surface-foreground/70 cursor-pointer")
                            : "text-surface-foreground/80 hover:text-surface-foreground transition-colors"
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
                    <div className="text-surface-foreground/60">{currentSong.lyrics || "No lyrics available."}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto min-h-0 overflow-y-auto no-scrollbar md:overflow-hidden relative z-0">
        
        {/* Album Art Side */}
        <div 
          className="flex-shrink-0 md:flex-1 w-full md:w-1/2 flex items-center justify-center px-8 py-2 md:py-8 lg:p-14 relative group touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Animated Volume Indicator */}
          <div className={cn(
            "absolute z-20 top-4 max-w-[200px] w-full bg-surface px-4 py-2 border border-surface-foreground/10 rounded-full flex flex-row items-center gap-3 transition-all duration-300 pointer-events-none shadow-lg",
            showVolumePopup ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}>
             <div className="text-surface-foreground">
                {volume === 0 ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-x"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-volume-2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>}
             </div>
             <div className="flex-1 h-1.5 bg-surface-foreground/20 rounded-full overflow-hidden">
               <div className="h-full bg-primary transition-all duration-100" style={{ width: `${volume * 100}%` }}></div>
             </div>
          </div>

          <div className={cn(
            "w-full max-w-[240px] sm:max-w-[400px] md:max-w-full aspect-square rounded-[24px] sm:rounded-[32px] md:rounded-[40px] shadow-soft overflow-hidden bg-[#EEEBE3] dark:bg-surface transition-transform duration-[600ms] mx-auto md:mx-0 ease-out",
            isPlaying ? "scale-100 rotate-0" : "scale-[0.93] -rotate-[1deg]"
          )}>
            {currentSong.coverArt && !isBroken ? (
              <img 
                src={currentSong.coverArt} 
                alt={currentSong.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={() => setIsBroken(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary transition-transform duration-700 ease-in-out hover:scale-105">
                <Music className="w-24 h-24 md:w-32 md:h-32 opacity-80" />
              </div>
            )}
          </div>
        </div>

        {/* Controls Section Side */}
        <div className="flex-1 md:flex-1 w-full md:w-1/2 flex flex-col px-6 pb-8 pt-4 sm:px-12 sm:pb-12 md:justify-center mt-auto md:mt-0">
          {/* Song Info */}
          <div className="flex items-start justify-between mb-6 md:mb-10 relative">
            <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center">
              <h2 className="text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] font-extrabold text-surface-foreground truncate tracking-[-1px] leading-[1.1] mb-1 sm:mb-2 md:mb-3 pb-1">{currentSong.title}</h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted truncate mb-2">{currentSong.artist}</p>
              
              {/* Emotion Tags */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {(currentSong.tags || []).map(tag => (
                  <span key={tag} className="text-[10px] sm:text-xs md:text-sm font-bold px-2 py-1 md:px-3 md:py-1.5 bg-primary/10 text-primary rounded-full transition-transform hover:scale-105 duration-300">
                    {tag}
                  </span>
                ))}
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setShowTagSelector(!showTagSelector);
                  }}
                  className="text-[10px] sm:text-xs md:text-sm font-bold px-2 py-1 md:px-3 md:py-1.5 bg-surface-foreground/5 hover:bg-surface-foreground/10 text-surface-foreground rounded-full flex items-center gap-1 transition-all duration-300 active:scale-95 hover:scale-105"
                >
                  <Plus className="w-3 h-3 md:w-4 md:h-4" /> Tag
                </button>
              </div>

              {/* Tag Selector Popover */}
              {showTagSelector && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-surface/90 backdrop-blur-3xl border border-surface-foreground/10 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Emotion Tags</span>
                    <button onClick={() => {
                      triggerHaptic('light');
                      setShowTagSelector(false);
                    }} className="p-1 hover:bg-surface-foreground/10 rounded-full transition-colors active:scale-95">
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
                            "text-xs md:text-sm font-medium px-3 flex-1 min-w-[30%] py-1.5 md:py-2 rounded-full transition-all duration-300 active:scale-95 hover:scale-105",
                            isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-surface-foreground/5 text-surface-foreground hover:bg-surface-foreground/10"
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
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 self-start flex-shrink-0 pt-1">
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  toggleFavorite(currentSong.id);
                }}
                className="p-3 sm:p-4 hover:bg-surface-foreground/5 rounded-full transition-all duration-300 hover:scale-110 active:scale-90 bg-surface-foreground/5 sm:bg-transparent"
              >
                <Heart className={cn("w-5 h-5 sm:w-7 sm:h-7 transition-colors duration-300", isFavorite ? "fill-primary text-primary" : "text-surface-foreground")} />
              </button>
              <button 
                onClick={handleDownload}
                className="p-3 sm:p-4 hover:bg-surface-foreground/5 rounded-full transition-all duration-300 hover:scale-110 active:scale-90 relative bg-surface-foreground/5 sm:bg-transparent"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 sm:w-7 sm:h-7 text-primary animate-spin" />
                ) : isDownloaded ? (
                  <Check className="w-5 h-5 sm:w-7 sm:h-7 text-green-500 animate-in zoom-in" />
                ) : (
                  <Download className="w-5 h-5 sm:w-7 sm:h-7 text-surface-foreground hover:text-primary transition-colors duration-300" />
                )}
              </button>
            </div>
          </div>

          {/* Visualizer */}
          <div className="mb-4 sm:mb-6 h-8 sm:h-12 md:h-16 lg:h-20 w-full overflow-hidden opacity-80">
            <Visualizer />
          </div>

          {/* Progress Bar */}
          <div className="mb-4 sm:mb-8 md:mb-10 lg:mb-12">
             <PlayerProgressBar />
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between pb-safe w-full">
            <button 
              onClick={() => {
                triggerHaptic('light');
                toggleShuffle();
              }}
              className={cn("p-2 sm:p-3 transition-colors hover:scale-110 active:scale-95 duration-300", isShuffle ? "text-primary drop-shadow-[0_0_8px_rgba(255,100,50,0.4)]" : "text-surface-foreground/50 hover:text-surface-foreground")}
            >
              <Shuffle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
            </button>
            
            <div className="flex items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
              <button 
                onClick={() => {
                  triggerHaptic('medium');
                  prevSong();
                }}
                className="p-3 sm:p-4 text-surface-foreground hover:bg-surface-foreground/5 rounded-full transition-all duration-300 hover:scale-110 active:scale-90"
              >
                <SkipBack className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-current" />
              </button>
              
              <button 
                onClick={() => {
                  triggerHaptic('heavy');
                  setIsPlaying(!isPlaying);
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-primary text-white rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/95"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 fill-current transition-all duration-300" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 fill-current ml-1 sm:ml-2 transition-all duration-300" />
                )}
              </button>
              
              <button 
                onClick={() => {
                  triggerHaptic('medium');
                  nextSong();
                }}
                className="p-3 sm:p-4 text-surface-foreground hover:bg-surface-foreground/5 rounded-full transition-all duration-300 hover:scale-110 active:scale-90"
              >
                <SkipForward className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-current" />
              </button>
            </div>

            <button 
              onClick={() => {
                triggerHaptic('light');
                toggleRepeat();
              }}
              className={cn("p-2 sm:p-3 transition-colors hover:scale-110 active:scale-95 duration-300", repeatMode !== 'off' ? "text-primary drop-shadow-[0_0_8px_rgba(255,100,50,0.4)]" : "text-surface-foreground/50 hover:text-surface-foreground")}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" /> : <Repeat className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
