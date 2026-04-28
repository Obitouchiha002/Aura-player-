import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { 
  Play, Pause, ChevronLeft, FastForward, Rewind, Maximize, 
  Settings, Volume2, Sun, FileText, Minimize, Radio, Shield, RotateCw,
  MoreVertical, Check, Lock, Unlock, SkipForward
} from 'lucide-react';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoProgressBar = () => {
  const { progress, duration, seekTo } = usePlayerStore(useShallow(state => ({
    progress: state.progress,
    duration: state.duration,
    seekTo: state.seekTo
  })));
  
  return (
    <div className="flex items-center gap-4">
      <span className="text-white text-sm font-medium w-12 text-right">{formatTime(progress)}</span>
      <div 
        className="flex-1 h-3 bg-white/20 rounded-full cursor-pointer relative overflow-hidden group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - rect.left) / rect.width;
          seekTo(p * duration);
        }}
      >
        <div className="absolute inset-y-0 left-0 bg-primary w-full origin-left group-hover:bg-primary/90 transition-none" style={{ transform: `scaleX(${duration > 0 ? progress / duration : 0})` }} />
      </div>
      <span className="text-white/70 text-sm font-medium w-12">{formatTime(duration)}</span>
    </div>
  );
};

export function VideoPlayerOverlay() {
  const { 
    songs, currentSongId, isPlaying, setIsPlaying, 
    progress,
    duration, setProgress,
    setIsVideoUIOpen, videoAspectRatio, setVideoAspectRatio,
    playbackSpeed, setPlaybackSpeed,
    volume, setVolume, subtitleUrl, setSubtitleUrl,
    isLandscape, toggleOrientation, seekTo,
    brightness, setBrightness, nextSong
  } = usePlayerStore(useShallow(state => ({
    songs: state.songs, currentSongId: state.currentSongId, isPlaying: state.isPlaying, setIsPlaying: state.setIsPlaying,
    progress: state.progress,
    duration: state.duration, setProgress: state.setProgress,
    setIsVideoUIOpen: state.setIsVideoUIOpen, videoAspectRatio: state.videoAspectRatio, setVideoAspectRatio: state.setVideoAspectRatio,
    playbackSpeed: state.playbackSpeed, setPlaybackSpeed: state.setPlaybackSpeed,
    volume: state.volume, setVolume: state.setVolume, subtitleUrl: state.subtitleUrl, setSubtitleUrl: state.setSubtitleUrl,
    isLandscape: state.isLandscape, toggleOrientation: state.toggleOrientation, seekTo: state.seekTo,
    brightness: state.brightness, setBrightness: state.setBrightness, nextSong: state.nextSong
  })));
  
  const currentSong = songs.find(s => s.id === currentSongId);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [audioTracks, setAudioTracks] = useState<{id: string, label: string, language: string, enabled: boolean}[]>([]);
  const [gestureOverlay, setGestureOverlay] = useState<{ type: 'volume' | 'brightness' | 'seek', value: string } | null>(null);

  // Hook to pull audio tracks when opening settings
  useEffect(() => {
    if (showSettings) {
      const video = document.getElementById('main-media') as any;
      if (video && video.audioTracks && video.audioTracks.length > 0) {
        const tracks = [];
        for (let i = 0; i < video.audioTracks.length; i++) {
          const track = video.audioTracks[i];
          tracks.push({
            id: track.id || String(i),
            label: track.label || `Track ${i + 1}`,
            language: track.language,
            enabled: track.enabled
          });
        }
        setAudioTracks(tracks);
      } else {
        // Fallback for browsers that don't support the API or single track files
        setAudioTracks([{ id: 'default', label: 'Default Track', language: '', enabled: true }]);
      }
    }
  }, [showSettings]);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isPlaying) return; // Keep controls if paused
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, 3500);
  };

  const touchStartRef = useRef<{ x: number, y: number } | null>(null);
  const touchValueRef = useRef<{ type: 'left'|'right'|'horizontal', initialValue: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || showSettings || isLocked) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };

    const width = window.innerWidth;
    const isLeft = touch.clientX < width / 2;
    touchValueRef.current = { 
      type: isLeft ? 'left' : 'right',
      initialValue: isLeft ? brightness : volume 
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !touchValueRef.current || isLocked) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const height = window.innerHeight;
    const width = window.innerWidth;

    if (touchValueRef.current.type !== 'horizontal' && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      touchValueRef.current = { type: 'horizontal', initialValue: progress };
    }

    if (touchValueRef.current.type === 'horizontal') {
       const ratio = dx / width; 
       const seekDelta = ratio * 120; // 2 min full swipe
       const newTime = Math.max(0, Math.min(touchValueRef.current.initialValue + seekDelta, duration));
       seekTo(newTime);
       setGestureOverlay({ type: 'seek', value: Math.round(seekDelta) > 0 ? `+${Math.round(seekDelta)}s` : `${Math.round(seekDelta)}s` });
    } else {
       const ratio = -dy / height; 
       const newValue = Math.max(0, Math.min(1, touchValueRef.current.initialValue + ratio));
       
       if (touchValueRef.current.type === 'left') {
         setBrightness(newValue);
         setGestureOverlay({ type: 'brightness', value: Math.round(newValue * 100) + '%' });
       } else {
         setVolume(newValue);
         setGestureOverlay({ type: 'volume', value: Math.round(newValue * 100) + '%' });
       }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    touchValueRef.current = null;
    setTimeout(() => setGestureOverlay(null), 800);
  };


  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showControls]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    triggerHaptic('medium');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSubtitleUrl(url);
    }
  };

  const handleDoubleTap = (side: 'left' | 'right') => {
    triggerHaptic('medium');
    const step = 10;
    const media = document.getElementById('main-media') as HTMLVideoElement;
    if (media) {
      const newValue = side === 'left' ? media.currentTime - step : media.currentTime + step;
      const finalTime = Math.max(0, Math.min(newValue, duration));
      seekTo(finalTime);
      
      setGestureOverlay({ 
        type: 'seek', 
        value: side === 'left' ? `-${step}s` : `+${step}s` 
      });
      setTimeout(() => setGestureOverlay(null), 600);
    }
  };

  const handleScreenTap = (e: React.MouseEvent) => {
    if (showSettings) {
      setShowSettings(false);
      return;
    }

    if (isLocked) {
      // Just briefly show the lock button if it was hidden
      if (!showControls) {
        setShowControls(true);
        resetControlsTimeout();
      }
      return;
    }

    setShowControls(!showControls);
    resetControlsTimeout();
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 flex flex-col justify-between transition-all duration-500 overflow-hidden select-none pointer-events-none",
        !showControls && !isLocked && "cursor-none"
      )}
    >
      {/* Brightness Simulating Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-[-1] bg-black transition-opacity"
        style={{ opacity: 1 - brightness }}
      />

      {/* Tap Listener Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-auto touch-none"
        onClick={handleScreenTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={(e) => {
          const x = e.clientX;
          const width = window.innerWidth;
          if (x < width / 3) handleDoubleTap('left');
          else if (x > (width * 2) / 3) handleDoubleTap('right');
        }}
      />

      {/* Lock Button - moved to the bottom bar */}

      {/* Gesture / Action Overlay */}
      <AnimatePresence>
        {gestureOverlay && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 px-6 py-5 rounded-[24px] flex flex-col items-center gap-3 pointer-events-none z-[110] border border-white/10 min-w-[100px]"
          >
            {gestureOverlay.type === 'seek' && (
              gestureOverlay.value.startsWith('+') 
                ? <FastForward className="w-8 h-8 text-primary" />
                : <Rewind className="w-8 h-8 text-primary" />
            )}
            {gestureOverlay.type === 'volume' && <Volume2 className="w-8 h-8 text-primary" />}
            {gestureOverlay.type === 'brightness' && <Sun className="w-8 h-8 text-primary" />}
            <span className="text-white font-bold text-xl tracking-tight">{gestureOverlay.value}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className={cn(
        "relative p-4 sm:p-8 bg-gradient-to-b from-black/95 via-black/40 to-transparent flex items-center justify-between transition-transform duration-500 z-[90] pointer-events-auto",
        (!showControls || isLocked) && "-translate-y-full"
      )}>
        <div className="flex items-center gap-5">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsVideoUIOpen(false); }}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white backdrop-blur-md transition-all active:scale-90"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="max-w-[200px] sm:max-w-md">
            <h2 className="text-white font-black text-lg sm:text-2xl truncate tracking-tight">{currentSong?.title}</h2>
            <p className="text-white/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">{currentSong?.artist}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); triggerHaptic('light'); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white backdrop-blur-md transition-all active:scale-95">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Playback Controls (Center) */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-8 sm:gap-16 z-[80] pointer-events-none"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); handleDoubleTap('left'); }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white backdrop-blur-xl border border-white/5 pointer-events-auto transition-all active:scale-90"
            >
              <Rewind className="w-5 h-5 fill-current" />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('heavy');
                setIsPlaying(!isPlaying);
              }}
              className="p-6 sm:p-8 bg-white text-black rounded-full flex items-center justify-center pointer-events-auto shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); handleDoubleTap('right'); }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white backdrop-blur-xl border border-white/5 pointer-events-auto transition-all active:scale-90"
            >
              <FastForward className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextSong(); triggerHaptic('medium'); }}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white backdrop-blur-xl border border-white/5 pointer-events-auto transition-all active:scale-90 hidden sm:block"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      <div className={cn(
        "relative p-6 sm:p-12 bg-gradient-to-t from-black/95 via-black/40 to-transparent transition-transform duration-500 z-[90] mt-auto pointer-events-auto flex flex-col gap-4",
        !showControls && "translate-y-full"
      )}>
        {/* Quick Tools */}
        <div className="flex justify-between items-end px-2">
            <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); triggerHaptic('medium'); setIsLocked(!isLocked); }}
                  className={cn("p-3 rounded-full backdrop-blur-xl border transition-all pointer-events-auto active:scale-90 flex items-center justify-center",
                    isLocked ? "bg-primary border-primary text-white shadow-[0_0_20px_rgba(255,100,50,0.5)]" : "bg-white/10 hover:bg-white/20 border-white/5 text-white"
                  )}
                >
                  {isLocked ? <Lock className="w-5 h-5 fill-current" /> : <Unlock className="w-5 h-5" />}
                </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleOrientation(); triggerHaptic('medium'); }}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl border border-white/5 pointer-events-auto transition-all active:scale-90"
              >
                <RotateCw className="w-5 h-5 transition-transform duration-500" />
              </button>
            </div>
            
        </div>

        {/* Progress System */}
        <VideoProgressBar />

      </div>

      {/* Settings Modal (Simplified as a 3-dot Menu) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-6 top-24 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-3xl w-72 max-w-[90vw] max-h-[70vh] overflow-y-auto no-scrollbar p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[100] pointer-events-auto text-white"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="space-y-6">
                {/* Visual Settings */}
                <div>
                   <label className="text-white/40 text-[10px] font-black uppercase mb-3 block tracking-widest">Screen Fit</label>
                   <div className="grid grid-cols-3 gap-2">
                      {['fit', 'stretch', 'zoom'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => { triggerHaptic('light'); setVideoAspectRatio(mode as any); }}
                          className={cn(
                            "py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1",
                            videoAspectRatio === mode ? "bg-primary text-white" : "bg-white/5 text-white/50"
                          )}
                        >
                          {mode} {videoAspectRatio === mode && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Speed Settings */}
                <div>
                   <label className="text-white/40 text-[10px] font-black uppercase mb-3 block tracking-widest">Speed</label>
                   <div className="grid grid-cols-4 gap-2">
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => { triggerHaptic('medium'); setPlaybackSpeed(speed); }}
                          className={cn(
                            "py-2 rounded-xl text-xs font-black transition-all",
                            playbackSpeed === speed ? "bg-primary text-white" : "bg-white/5 text-white/50"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                   </div>
                </div>

                {/* Media Settings */}
                <div>
                   <label className="text-white/40 text-[10px] font-black uppercase mb-3 block tracking-widest">Media Options</label>
                   <div className="space-y-2">
                       {/* Audio Track Selector */}
                       {audioTracks.length > 0 && (
                         <div className="bg-white/5 rounded-2xl p-3 space-y-3 mb-2 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                              <Radio className="w-5 h-5 text-primary" />
                              <span className="text-xs font-bold text-white/80">Audio Track</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {audioTracks.map((track, idx) => (
                                <button
                                  key={track.id}
                                  onClick={() => {
                                    triggerHaptic('light');
                                    // Fallback early exit
                                    if (track.id === 'default') return;
                                    
                                    const video = document.getElementById('main-media') as any;
                                    if (video && video.audioTracks) {
                                      for (let i = 0; i < video.audioTracks.length; i++) {
                                        video.audioTracks[i].enabled = (video.audioTracks[i].id === track.id);
                                      }
                                      setAudioTracks(audioTracks.map(t => ({...t, enabled: t.id === track.id})));
                                    }
                                  }}
                                  className={cn(
                                    "py-2 px-3 rounded-xl text-xs font-bold transition-all text-left truncate",
                                    track.enabled ? "bg-primary text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                                  )}
                                >
                                  {track.label || track.language || `Track ${idx + 1}`}
                                </button>
                              ))}
                            </div>
                         </div>
                       )}

                       <button 
                         onClick={async () => {
                           triggerHaptic('medium');
                           const video = document.getElementById('main-media') as HTMLVideoElement;
                           if (video) {
                             try {
                               if (document.pictureInPictureElement) {
                                 await document.exitPictureInPicture();
                               } else if (document.pictureInPictureEnabled) {
                                 await video.requestPictureInPicture();
                                 setShowSettings(false);
                               }
                             } catch (err) {
                               console.error('PiP failed', err);
                             }
                           }
                         }}
                         className="w-full bg-white/5 hover:bg-white/10 text-white font-medium text-sm py-3 px-4 rounded-xl transition-colors text-left flex justify-between items-center"
                       >
                         Picture in Picture
                       </button>

                      <button 
                        onClick={() => {
                          const video = document.getElementById('main-media') as HTMLVideoElement;
                          let isShowing = false;
                          if (video && video.textTracks.length > 0) {
                            const newMode = video.textTracks[0].mode === 'showing' ? 'hidden' : 'showing';
                            video.textTracks[0].mode = newMode;
                            isShowing = newMode === 'showing';
                          }
                          setSubtitleUrl(isShowing ? 'on' : ''); // Dummy state to mimic toggle
                          triggerHaptic('light');
                        }}
                        className="w-full flex items-center justify-between p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white/80"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-xs font-bold">Subtitles</span>
                        </div>
                        <div className="w-10 h-5 bg-white/10 rounded-full relative pointer-events-none">
                           <div className={cn("absolute top-1 left-1 w-3 h-3 rounded-full transition-all", subtitleUrl ? "translate-x-5 bg-primary" : "bg-white/20")} />
                        </div>
                      </button>

                      <label className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-white/5">
                        <Maximize className="w-5 h-5 text-primary" />
                        <span className="text-xs font-bold text-white/80" onClick={toggleFullscreen}>Toggle Fullscreen</span>
                      </label>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
