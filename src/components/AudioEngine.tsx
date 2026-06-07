import { useEffect, useRef, memo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { useShallow } from 'zustand/react/shallow';

// Define selector outside to stay stable
const mediaSelector = (state: any) => {
  const currentSong = state.songs.find((s: any) => s.id === state.currentSongId);
  return {
    currentSongId: state.currentSongId,
    isPlaying: state.isPlaying,
    volume: state.volume,
    volumeBoost: state.volumeBoost,
    duration: state.duration,
    playbackSpeed: state.playbackSpeed,
    isVideoUIOpen: state.isVideoUIOpen,
    videoAspectRatio: state.videoAspectRatio,
    subtitleUrl: state.subtitleUrl,
    isLandscape: state.isLandscape,
    isDarkMode: state.isDarkMode,
    currentMood: state.currentMood,
    currentSongUrl: currentSong?.url || '',
    currentSongFile: currentSong?.file || null,
    currentSongTitle: currentSong?.title || '',
    currentSongArtist: currentSong?.artist || '',
    currentSongAlbum: currentSong?.album || '',
    currentSongCoverArt: currentSong?.coverArt || '',
    currentSongMediaType: currentSong?.mediaType || 'audio'
  };
};

export const AudioEngine = memo(() => {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const { 
    currentSongId, isPlaying, volume, volumeBoost, duration, playbackSpeed, isVideoUIOpen, 
    videoAspectRatio, subtitleUrl, isLandscape, isDarkMode, currentMood,
    currentSongUrl, currentSongFile, currentSongTitle, currentSongArtist, currentSongAlbum, currentSongCoverArt, currentSongMediaType
  } = usePlayerStore(useShallow(mediaSelector));

  const { setProgress, setDuration, setIsLoading, nextSong, prevSong, setIsPlaying } = usePlayerStore.getState();
  const lastSavedProgress = useRef(0);
  const lastMediaSessionUpdate = useRef(0);

  // Media Session Setup
  // The latest song id that had a drawn media session
  const activeMediaSessionSongId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const handleBeforeUnload = () => {
      const state = usePlayerStore.getState();
      if (mediaRef.current && state.currentSongId) {
        state.updateSongData(state.currentSongId, { lastPosition: mediaRef.current.currentTime });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const setupMediaSession = async () => {
      // Don't rerun heavy canvas operations if we are already showing this song
      if (!currentSongId || (!currentSongUrl && !currentSongFile) || !('mediaSession' in navigator)) return;
      
      // Update action handlers first as they change based on playback
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          if (mediaRef.current) mediaRef.current.currentTime = details.seekTime;
          setProgress(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (mediaRef.current) mediaRef.current.currentTime = Math.max(mediaRef.current.currentTime - skipTime, 0);
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (mediaRef.current) mediaRef.current.currentTime = Math.min(mediaRef.current.currentTime + skipTime, mediaRef.current.duration);
      });

      if (activeMediaSessionSongId.current === currentSongId) {
         return; // Skip artwork computation if song didn't change
      }
      activeMediaSessionSongId.current = currentSongId;

      // Mobile OSs block blob: URIs and large Base64 in MediaSession.
      // Setup default artwork
      let finalArtworkSrc = '';
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FF8C42';
          ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 80px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(currentSongMediaType === 'video' ? 'VIDEO' : 'MUSIC', 256, 256);
        }
        finalArtworkSrc = canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) {
        console.error(e);
      }

      if (currentSongCoverArt) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = currentSongCoverArt;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const size = 512;
          const rescaleCanvas = document.createElement('canvas');
          rescaleCanvas.width = size;
          rescaleCanvas.height = size;
          const resCtx = rescaleCanvas.getContext('2d');
          
          if (resCtx && active) {
            resCtx.drawImage(img, 0, 0, size, size);
            finalArtworkSrc = rescaleCanvas.toDataURL('image/jpeg', 0.8);
          }
        } catch (e) {
          console.error('Failed to resize active artwork for MediaSession', e);
        }
      }

      if (!active) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSongTitle,
        artist: currentSongArtist,
        album: currentSongAlbum || (currentMood ? `Aura • ${currentMood}` : 'Aura Music'),
        artwork: finalArtworkSrc ? [
          { src: finalArtworkSrc, sizes: '512x512', type: 'image/jpeg' },
          { src: finalArtworkSrc, sizes: '192x192', type: 'image/jpeg' }
        ] : []
      });
    };

    setupMediaSession();

    return () => {
      active = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSongId, currentSongUrl, currentSongFile, currentSongTitle, currentSongArtist, currentSongAlbum, currentSongCoverArt, nextSong, prevSong, setIsPlaying, setProgress, currentMood, currentSongMediaType]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (mediaRef.current) {
         mediaRef.current.pause();
         mediaRef.current.removeAttribute('src');
         mediaRef.current.load();
      }
    };
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize Web Audio API ONLY when volumeBoost > 1 to avoid severe performance issues / stuttering on mobile
  useEffect(() => {
    if (isPlaying && volumeBoost > 1.0 && mediaRef.current && !audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNodeRef.current = gainNode;

        const source = ctx.createMediaElementSource(mediaRef.current);
        source.connect(gainNode);
        sourceNodeRef.current = source;
      } catch (err) {
        console.warn("Failed to initialize AudioContext for volume boost:", err);
      }
    }
    
    if (isPlaying && volumeBoost > 1.0 && audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(e => console.warn(e));
    }
  }, [isPlaying, volumeBoost]);

  // Volume, Boost & Speed Sync
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
      mediaRef.current.playbackRate = playbackSpeed;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      // Apply extra volume multiplier
      gainNodeRef.current.gain.setTargetAtTime(volumeBoost || 1, audioCtxRef.current.currentTime, 0.1);
    }
  }, [volume, volumeBoost, playbackSpeed]);

  // Manual playback control to handle race conditions with React rendering
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (!currentSongUrl && !currentSongFile) {
        media.pause();
        media.removeAttribute('src');
        return;
    }

    const playMedia = async () => {
      try {
        if (isPlaying) {
          const playPromise = media.play();
          if (playPromise !== undefined) {
             playPromise.catch(err => {
                console.warn("Auto-play blocked or failed:", err);
                // Usually this happens if user hasn't interacted with the document yet.
             });
          }
        } else {
          media.pause();
        }
      } catch (err) {
        console.error("Playback control error:", err);
      }
    };

    playMedia();
  }, [isPlaying, currentSongId, currentSongUrl, currentSongFile]);

  // Important: Always render the media element to ensure clean control, just hide it if no song or unsupported
  const isVideo = currentSongMediaType === 'video';
  const objectFitClass = 
    videoAspectRatio === 'stretch' ? 'object-fill' : 
    videoAspectRatio === 'zoom' ? 'object-cover' : 'object-contain';

  const aspectRatioStyle = 
    videoAspectRatio === '16:9' ? { aspectRatio: '16/9', objectFit: 'cover' as any } :
    videoAspectRatio === '4:3' ? { aspectRatio: '4/3', objectFit: 'cover' as any } : {};

  // If no song is loaded, we still render an empty disabled video element
  if (!currentSongId || (!currentSongUrl && !currentSongFile)) {
    return <video id="main-media" ref={mediaRef} className="hidden" />;
  }

  return (
    <video
      id="main-media"
      ref={mediaRef}
      src={currentSongUrl}
      playsInline
      autoPlay={isPlaying}
      style={{
        ...aspectRatioStyle,
        transform: isLandscape && isVideo && isVideoUIOpen && window.innerWidth < window.innerHeight 
                     ? 'translate(-50%, -50%) rotate(90deg)' 
                     : 'none',
        width: isLandscape && isVideo && isVideoUIOpen && window.innerWidth < window.innerHeight ? `${window.innerHeight}px` : '100%',
        height: isLandscape && isVideo && isVideoUIOpen && window.innerWidth < window.innerHeight ? `${window.innerWidth}px` : '100%',
        left: isLandscape && isVideo && isVideoUIOpen && window.innerWidth < window.innerHeight ? '50%' : '0',
        top: isLandscape && isVideo && isVideoUIOpen && window.innerWidth < window.innerHeight ? '50%' : '0',
        objectFit: (aspectRatioStyle as any).objectFit || (objectFitClass.replace('object-', '') as any) || 'contain'
      }}
      className={cn(
        "fixed transition-all duration-300 bg-black",
        isVideo && isVideoUIOpen
          ? `z-[50] pointer-events-auto opacity-100 ${objectFitClass}`
          : "opacity-0 pointer-events-none z-0"
      )}
      onPlay={() => setIsPlaying(true)}
      onPause={(e) => {
        // Save current progress aggressively for memory
        if (currentSongId && e.currentTarget.currentTime > 0) {
           usePlayerStore.getState().updateSongData(currentSongId, { lastPosition: e.currentTarget.currentTime });
        }
        
        if (e.currentTarget.readyState >= 2 && !e.currentTarget.ended) {
          // Ignore transient pauses caused by source changes
          setTimeout(() => {
            if (mediaRef.current?.paused && usePlayerStore.getState().isPlaying) {
              const currentSrc = mediaRef.current.src;
              // Only pause state if the src hasn't changed or isn't changing
              if (currentSrc && !currentSrc.startsWith('blob:')) {
                 usePlayerStore.getState().setIsPlaying(false);
              } else if (mediaRef.current?.readyState >= 2) {
                 usePlayerStore.getState().setIsPlaying(false);
              }
            }
          }, 150);
        }
      }}
      onWaiting={() => {
        console.log("Media waiting/buffering...");
        // Removed aggressive setIsLoading(true) to avoid UI flicker
      }}
      onCanPlay={() => {
        console.log("Media can play now");
        setIsLoading(false);
        if (isPlaying) {
          mediaRef.current?.play().catch(err => console.warn("Auto-play blocked or failed:", err));
        }
      }}
      onLoadStart={() => {
        console.log("Media load start:", currentSongUrl?.substring(0, 30) + "...");
        // Removed aggressive setIsLoading(true) to avoid UI flicker
      }}
      onError={(e) => {
        const error = e.currentTarget.error;
        console.error("Media element error:", error?.code, error?.message);
        setIsLoading(false);
        
        // If it's a source error, maybe the Object URL is dead?
        if (error?.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED often happens for expired URLs
           console.warn("Source not supported/URL might be expired. Trying to refresh store...");
        }
      }}
      onTimeUpdate={(e) => {
        const currentTime = e.currentTarget.currentTime;
        setProgress(currentTime);
        if (currentTime - lastSavedProgress.current > 10 || currentTime < lastSavedProgress.current) {
          lastSavedProgress.current = currentTime;
          usePlayerStore.getState().updateSongData(currentSongId, { lastPosition: currentTime });
        }
        
        // Throttled MediaSession sync without causing React re-renders
        if ('mediaSession' in navigator && Math.abs(currentTime - lastMediaSessionUpdate.current) > 1) {
          lastMediaSessionUpdate.current = currentTime;
          try {
            navigator.mediaSession.setPositionState({
              duration: duration || 0,
              playbackRate: playbackSpeed || 1,
              position: currentTime,
            });
          } catch (e) {
            // Ignore errors if duration isn't set yet
          }
        }
      }}
      onLoadedMetadata={(e) => {
        const duration = e.currentTarget.duration;
        setDuration(duration);
        const store = usePlayerStore.getState();
        const song = store.songs.find(s => s.id === currentSongId);
        
        let shouldResume = false;
        if (song?.lastPosition && song.lastPosition > 0) {
          if (song.mediaType === 'audio' && duration <= 1800) {
            shouldResume = false;
          } else {
            shouldResume = true;
          }
        }
        
        if (shouldResume) {
          e.currentTarget.currentTime = song.lastPosition || 0;
        } else {
          e.currentTarget.currentTime = 0;
          if (currentSongId) {
            store.updateSongData(currentSongId, { lastPosition: 0 });
          }
        }
        setIsLoading(false);
      }}
      onEnded={() => {
        const store = usePlayerStore.getState();
        store.updateSongData(currentSongId, { lastPosition: 0 });
        store.nextSong();
      }}
    />
  );
});
