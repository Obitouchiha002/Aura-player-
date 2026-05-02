import { create } from 'zustand';
import { Song, Playlist, Mood } from '../types';
import { saveSongsToDB, loadSongsFromDB, clearDB } from '../lib/db';

interface PlayerState {
  songs: Song[];
  playlists: Playlist[];
  currentSongId: string | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isDarkMode: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: 'light' | 'medium' | 'heavy';
  favorites: string[];
  isInitialized: boolean;
  currentMood: Mood | null;
  
  // Video Player settings
  isVideoEnabled: boolean;
  isVideoUIOpen: boolean;
  videoAspectRatio: 'fit' | 'stretch' | 'zoom' | '16:9' | '4:3';
  playbackSpeed: number;
  subtitleUrl: string | null;
  isLoading: boolean;
  isSwitchingMode: boolean;
  isLandscape: boolean;
  brightness: number;
  
  sleepTimerEndTime: number | null;
  isShutdown: boolean;
  
  // Actions
  initStore: () => Promise<void>;
  setSongs: (songs: Song[]) => void;
  addSongs: (songs: Song[]) => void;
  playSong: (song: Song) => void;                
  setCurrentSong: (id: string) => void;
  seekTo: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleDarkMode: () => void;
  toggleHaptics: () => void;
  setHapticIntensity: (intensity: 'light' | 'medium' | 'heavy') => void;
  togglePlay: () => void;
  toggleFavorite: (id: string) => void;
  setMood: (mood: Mood | null) => void;
  
  // Video Actions
  toggleVideoMode: () => void;
  switchVideoMode: () => Promise<void>;
  setIsVideoUIOpen: (isOpen: boolean) => void;
  setVideoAspectRatio: (ratio: 'fit' | 'stretch' | 'zoom' | '16:9' | '4:3') => void;
  setPlaybackSpeed: (speed: number) => void;
  setSubtitleUrl: (url: string | null) => void;
  setBrightness: (brightness: number) => void;
  toggleOrientation: () => void;
  
  setSleepTimer: (minutes: number | null) => void;
  setExactSleepTimer: (timestamp: number) => void;
  triggerShutdown: () => void;
  resetShutdown: () => void;
  
  clearData: () => void;
  nextSong: () => void;
  prevSong: () => void;
  updateSongData: (id: string, data: Partial<Song>) => void;
  createPlaylist: (name: string) => void;
  addSongToPlaylist: (playlistId: string, songId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  deleteSong: (songId: string) => void;
  deleteSongs: (songIds: string[]) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  songs: [],
  playlists: [],
  currentSongId: null,
  isPlaying: false,
  volume: Number(localStorage.getItem('aura_volume')) || 1,
  progress: 0,
  duration: 0,
  isShuffle: false,
  repeatMode: 'off',
  isDarkMode: localStorage.getItem('aura_theme') === 'dark',
  hapticsEnabled: localStorage.getItem('aura_haptics') !== 'false',
  hapticIntensity: (localStorage.getItem('aura_haptic_intensity') as any) || 'medium',
  favorites: JSON.parse(localStorage.getItem('aura_favorites') || '[]'),
  isInitialized: false,
  currentMood: null,
  
  isVideoEnabled: localStorage.getItem('aura_video_mode') === 'true',
  isVideoUIOpen: false,
  videoAspectRatio: (localStorage.getItem('aura_video_aspect') as any) || 'fit',
  playbackSpeed: 1,
  subtitleUrl: null,
  isLoading: false,
  isSwitchingMode: false,
  isLandscape: false,
  brightness: 1,
  sleepTimerEndTime: null,
  isShutdown: false,

  initStore: async () => {
    const songs = await loadSongsFromDB();
    const isDark = localStorage.getItem('aura_theme') === 'dark';
    if (isDark) document.documentElement.classList.add('dark');
    set({ songs, isInitialized: true });
  },
  setSongs: (songs) => {
    saveSongsToDB(songs);
    set({ songs });
  },
  addSongs: (newSongs) => set((state) => {
    const updated = [...state.songs, ...newSongs];
    saveSongsToDB(updated);
    return { songs: updated };
  }),
  playSong: (song) => {
    const { songs, addSongs, setCurrentSong, setIsPlaying } = get();
    if (!songs.find(s => s.id === song.id)) {
      addSongs([song]);
    }
    setCurrentSong(song.id);
    setIsPlaying(true);
  },
  setCurrentSong: (id) => {
    const state = get();
    const currentSong = state.songs.find(s => s.id === state.currentSongId);
    const nextSong = state.songs.find(s => s.id === id);
    
    // Trigger switching animation if media type changes
    if (currentSong && nextSong && (currentSong.mediaType !== nextSong.mediaType)) {
      set({ isSwitchingMode: true });
      setTimeout(() => set({ isSwitchingMode: false }), 1200);
    }
    
    set({ currentSongId: id, progress: 0, subtitleUrl: null });
  },
  seekTo: (time) => {
    const media = document.getElementById('main-media') as HTMLMediaElement;
    if (media) {
      media.currentTime = time;
    }
    set({ progress: time });
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setVolume: (volume) => {
    localStorage.setItem('aura_volume', volume.toString());
    set({ volume });
  },
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
    return { repeatMode: modes[nextIndex] };
  }),
  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode;
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aura_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aura_theme', 'light');
    }
    return { isDarkMode: newMode };
  }),
  toggleHaptics: () => set((state) => {
    const newEnabled = !state.hapticsEnabled;
    localStorage.setItem('aura_haptics', newEnabled.toString());
    return { hapticsEnabled: newEnabled };
  }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setHapticIntensity: (intensity) => {
    localStorage.setItem('aura_haptic_intensity', intensity);
    set({ hapticIntensity: intensity });
  },
  toggleFavorite: (id) => set((state) => {
    const favorites = state.favorites.includes(id) 
      ? state.favorites.filter(fId => fId !== id)
      : [...state.favorites, id];
    localStorage.setItem('aura_favorites', JSON.stringify(favorites));
    return { favorites };
  }),
  setMood: (mood) => set({ currentMood: mood }),
  
  toggleVideoMode: () => set((state) => {
    const newVal = !state.isVideoEnabled;
    localStorage.setItem('aura_video_mode', newVal.toString());
    return { isVideoEnabled: newVal };
  }),
  switchVideoMode: async () => {
    set({ isSwitchingMode: true });
    // Keep overlay visible for a bit to show animation
    await new Promise(resolve => setTimeout(resolve, 1200));
    set((state) => {
      const newVal = !state.isVideoEnabled;
      localStorage.setItem('aura_video_mode', newVal.toString());
      return { 
        isVideoEnabled: newVal,
        isSwitchingMode: false 
      };
    });
    // Automatic reload after switching mode
    window.location.reload();
  },
  setIsVideoUIOpen: (isOpen) => set({ isVideoUIOpen: isOpen }),
  setVideoAspectRatio: (ratio) => {
    localStorage.setItem('aura_video_aspect', ratio);
    set({ videoAspectRatio: ratio });
  },
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setSubtitleUrl: (url) => set({ subtitleUrl: url }),
  setBrightness: (brightness) => set({ brightness }),
  toggleOrientation: async () => {
    // Determine the target state based on the current state.
    // If we're landscape, we want portrait, and vice-versa.
    const isCurrentlyLandscape = get().isLandscape;
    const targetLandscape = !isCurrentlyLandscape;

    try {
      if (targetLandscape && !document.fullscreenElement) {
         await document.documentElement.requestFullscreen().catch(e => console.warn("Fullscreen request failed:", e));
      } else if (!targetLandscape && document.fullscreenElement) {
         await document.exitFullscreen().catch(e => console.warn("Fullscreen exit failed:", e));
      }
      
      // Wait for rendering transition to settle
      await new Promise(r => setTimeout(r, 100));

      if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
         if (targetLandscape) {
           await (screen.orientation as any).lock('landscape').catch((e: any) => {
              throw new Error("Lock failed: " + e.message);
           });
         } else {
           (screen.orientation as any).unlock();
         }
      } else {
        throw new Error("Screen orientation API not supported");
      }
      
      // If we got here, native API worked. We set the state explicitly.
      set({ isLandscape: targetLandscape });
      
    } catch (err) {
      console.warn('Orientation lock failed, applying visual fallback CSS:', err);
      // Fallback: If APIs blocked, forcefully apply the CSS transform map by toggling the layout state variable manually
      set({ isLandscape: targetLandscape });
    }
  },
  
  setSleepTimer: (minutes) => {
    if (minutes === null) {
      set({ sleepTimerEndTime: null });
    } else {
      set({ sleepTimerEndTime: Date.now() + minutes * 60 * 1000 });
    }
  },
  setExactSleepTimer: (timestamp) => {
    set({ sleepTimerEndTime: timestamp });
  },
  triggerShutdown: () => {
    set({ isShutdown: true, isVideoUIOpen: false, sleepTimerEndTime: null });
    
    const media = document.getElementById('main-media') as HTMLMediaElement;
    if (media) {
      // Fade out volume over 3 seconds
      const startVolume = media.volume;
      const fadeInterval = setInterval(() => {
        if (media.volume > 0.05) {
          media.volume -= 0.05;
        } else {
          media.volume = 0;
          clearInterval(fadeInterval);
        }
      }, 150); // 150ms * 20 steps = 3000ms
    }

    setTimeout(() => {
      set({ isPlaying: false, currentSongId: null });
      if (media) {
         media.pause();
         media.removeAttribute('src');
      }
      setTimeout(() => {
        try {
          window.close();
        } catch(e) {}
      }, 1000);
    }, 3000);
  },
  resetShutdown: () => set({ isShutdown: false }),
  
  clearData: () => {
    clearDB();
    set({ songs: [], playlists: [], currentSongId: null, isPlaying: false, favorites: [] });
  },
  nextSong: () => {
    const { songs, currentSongId, isShuffle, repeatMode } = get();
    if (!songs.length) return;
    
    if (repeatMode === 'one') {
      set({ progress: 0, isPlaying: true });
      return;
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      set({ currentSongId: songs[randomIndex].id, progress: 0, isPlaying: true });
      return;
    }

    const currentIndex = songs.findIndex(s => s.id === currentSongId);
    if (currentIndex === -1) return;
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < songs.length) {
      set({ currentSongId: songs[nextIndex].id, progress: 0, isPlaying: true });
    } else if (repeatMode === 'all') {
      set({ currentSongId: songs[0].id, progress: 0, isPlaying: true });
    } else {
      set({ isPlaying: false, progress: 0 });
    }
  },
  prevSong: () => {
    const { songs, currentSongId, progress } = get();
    if (!songs.length) return;
    
    // If we're more than 3 seconds in, just restart the song
    if (progress > 3) {
      set({ progress: 0, isPlaying: true });
      return;
    }

    const currentIndex = songs.findIndex(s => s.id === currentSongId);
    if (currentIndex > 0) {
      set({ currentSongId: songs[currentIndex - 1].id, progress: 0, isPlaying: true });
    } else {
      set({ currentSongId: songs[songs.length - 1].id, progress: 0, isPlaying: true });
    }
  },
  updateSongData: (id, data) => set((state) => {
    const updatedSongs = state.songs.map(song => song.id === id ? { ...song, ...data } : song);
    saveSongsToDB(updatedSongs);
    return { songs: updatedSongs };
  }),
  createPlaylist: (name: string) => {
    set(state => ({
      playlists: [...state.playlists, { id: Date.now().toString(), name, songIds: [] }]
    }));
  },
  addSongToPlaylist: (playlistId: string, songId: string) => {
    set(state => ({
      playlists: state.playlists.map(p => 
        p.id === playlistId && !p.songIds.includes(songId) 
          ? { ...p, songIds: [...p.songIds, songId] } 
          : p
      )
    }));
  },
  removeSongFromPlaylist: (playlistId: string, songId: string) => {
    set(state => ({
      playlists: state.playlists.map(p => 
        p.id === playlistId 
          ? { ...p, songIds: p.songIds.filter(id => id !== songId) } 
          : p
      )
    }));
  },
  deletePlaylist: (playlistId: string) => {
    set(state => ({
      playlists: state.playlists.filter(p => p.id !== playlistId)
    }));
  },
  deleteSong: (songId: string) => {
    set(state => {
      const updatedSongs = state.songs.filter(s => s.id !== songId);
      const updatedPlaylists = state.playlists.map(p => ({
        ...p,
        songIds: p.songIds.filter(id => id !== songId)
      }));
      saveSongsToDB(updatedSongs);
      return { songs: updatedSongs, playlists: updatedPlaylists };
    });
  },
  deleteSongs: (songIds: string[]) => {
    set(state => {
      const updatedSongs = state.songs.filter(s => !songIds.includes(s.id));
      const updatedPlaylists = state.playlists.map(p => ({
        ...p,
        songIds: p.songIds.filter(id => !songIds.includes(id))
      }));
      saveSongsToDB(updatedSongs);
      return { songs: updatedSongs, playlists: updatedPlaylists };
    });
  }
}));
