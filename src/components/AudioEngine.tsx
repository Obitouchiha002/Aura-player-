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
    currentSongId, isPlaying, volume, duration, playbackSpeed, isVideoUIOpen, 
    videoAspectRatio, subtitleUrl, isLandscape, isDarkMode, currentMood,
    currentSongUrl, currentSongFile, currentSongTitle, currentSongArtist, currentSongAlbum, currentSongCoverArt, currentSongMediaType
  } = usePlayerStore(useShallow(mediaSelector));

  const { setProgress, setDuration, setIsLoading, nextSong, prevSong, setIsPlaying } = usePlayerStore.getState();
  const lastSavedProgress = useRef(0);
  const lastMediaSessionUpdate = useRef(0);

  // Media Session Setup
  useEffect(() => {
    let active = true;

    const setupMediaSession = async () => {
      if (!currentSongId || (!currentSongUrl && !currentSongFile) || !('mediaSession' in navigator)) return;

      // Create a plain Orange and White fallback background
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF8C42'; // Plain Orange
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#FFFFFF'; // White text
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fallbackText = currentSongMediaType === 'video' ? 'VIDEO' : 'MUSIC';
        ctx.fillText(fallbackText, 256, 256);
      }
      const defaultArtBase64 = canvas.toDataURL('image/jpeg', 0.8);

      let finalArtworkSrc = defaultArtBase64;

      // Mobile OSs (like Android) block or fail to read blob: URIs in MediaSession.
      // Additionally, Base64 strings that are too large (e.g. from high-res embedded MP3 art)
      // will fail Android's 1MB Binder transaction limit.
      // To fix this, we load the image, resize it to 512x512, and then convert to Base64.
      if (currentSongCoverArt) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Help prevent canvas tainting just in case
          img.src = currentSongCoverArt;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          // Resize to safe limits for MediaSession Base64 IPC
          const size = 512;
          const rescaleCanvas = document.createElement('canvas');
          rescaleCanvas.width = size;
          rescaleCanvas.height = size;
          const resCtx = rescaleCanvas.getContext('2d');
          
          if (resCtx && active) {
            // Draw image covering the canvas
            resCtx.drawImage(img, 0, 0, size, size);
            finalArtworkSrc = rescaleCanvas.toDataURL('image/jpeg', 0.8);
          }
        } catch (e) {
          console.error('Failed to resize and prepare active artwork for MediaSession', e);
          if (active) finalArtworkSrc = defaultArtBase64;
        }
      }

      if (!active) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSongTitle,
        artist: currentSongArtist,
        album: currentSongAlbum || (currentMood ? `Aura • ${currentMood}` : 'Aura Music'),
        artwork: [
          { src: finalArtworkSrc, sizes: '512x512', type: 'image/jpeg' },
          { src: finalArtworkSrc, sizes: '192x192', type: 'image/jpeg' }
        ]
      });

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
    };

    setupMediaSession();

    return () => {
      active = false;
    };
  }, [currentSongId, currentSongUrl, currentSongFile, currentSongTitle, currentSongArtist, currentSongAlbum, currentSongCoverArt, nextSong, prevSong, setIsPlaying, setProgress, isDarkMode, currentMood, currentSongMediaType]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Volume & Speed Sync
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
      mediaRef.current.playbackRate = playbackSpeed;
    }
  }, [volume, playbackSpeed]);

  // Manual playback control to handle race conditions with React rendering
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || (!currentSongUrl && !currentSongFile)) return;

    const playMedia = async () => {
      try {
        if (isPlaying) {
          // Check if readyState is sufficient before playing
          if (media.readyState >= 2) {
            await media.play();
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

  if (!currentSongId || (!currentSongUrl && !currentSongFile)) return null;

  const isVideo = currentSongMediaType === 'video';
  const objectFitClass = 
    videoAspectRatio === 'stretch' ? 'object-fill' : 
    videoAspectRatio === 'zoom' ? 'object-cover' : 'object-contain';

  const aspectRatioStyle = 
    videoAspectRatio === '16:9' ? { aspectRatio: '16/9', objectFit: 'cover' as any } :
    videoAspectRatio === '4:3' ? { aspectRatio: '4/3', objectFit: 'cover' as any } : {};

  return (
    <video
      key={currentSongId} // KEY is critical to prevent "No supported source" errors when swapping media
      id="main-media"
      ref={mediaRef}
      src={currentSongUrl}
      playsInline
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
      onPause={() => setIsPlaying(false)}
      onWaiting={() => {
        console.log("Media waiting/buffering...");
        setIsLoading(true);
      }}
      onCanPlay={() => {
        console.log("Media can play now");
        setIsLoading(false);
        if (isPlaying) {
          mediaRef.current?.play().catch(err => console.warn("Auto-play blocked or failed:", err));
        }
      }}
      onLoadStart={() => {
        console.log("Media load start:", currentSongUrl.substring(0, 30) + "...");
        setIsLoading(true);
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
        const song = usePlayerStore.getState().songs.find(s => s.id === currentSongId);
        if (song?.lastPosition && song.lastPosition > 0) {
          e.currentTarget.currentTime = song.lastPosition;
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
