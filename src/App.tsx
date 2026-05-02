import { useState, useEffect } from 'react';
import { Loader2, MoonStar } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { VideoPlayerOverlay } from './components/VideoPlayerOverlay';
import { AudioEngine } from './components/AudioEngine';
import { Home } from './views/Home';
import { Library } from './views/Library';
import { Settings } from './views/Settings';
import { usePlayerStore } from './store/usePlayerStore';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const currentSongId = usePlayerStore((s) => s.currentSongId);
  const songs = usePlayerStore((s) => s.songs);
  const initStore = usePlayerStore((s) => s.initStore);
  const isInitialized = usePlayerStore((s) => s.isInitialized);
  const isVideoUIOpen = usePlayerStore((s) => s.isVideoUIOpen);
  const setIsVideoUIOpen = usePlayerStore((s) => s.setIsVideoUIOpen);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isSwitchingMode = usePlayerStore((s) => s.isSwitchingMode);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const sleepTimerEndTime = usePlayerStore((s) => s.sleepTimerEndTime);
  const triggerShutdown = usePlayerStore((s) => s.triggerShutdown);
  
  const currentSong = songs.find((s) => s.id === currentSongId);

  // Sleep Timer Check
  useEffect(() => {
    if (!sleepTimerEndTime) return;
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimerEndTime) {
        triggerShutdown();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime, triggerShutdown]);

  useEffect(() => {
    initStore();
    
    // Initialize history state on first load
    if (!window.history.state) {
      window.history.replaceState({ page: 'home' }, '');
    }

    // Block right click globally
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [initStore]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = usePlayerStore.getState();
      
      // If Video Player is open, close it instead of going back a page
      if (state.isVideoUIOpen) {
        state.setIsVideoUIOpen(false);
        // Restore history so user doesn't exit app next time
        window.history.pushState({ page: currentTab }, '');
        return;
      }

      // If Audio Player is open, close it
      if (isFullPlayerOpen) {
        setIsFullPlayerOpen(false);
        window.history.pushState({ page: currentTab }, '');
        return;
      }

      // Handle correct tab back navigation
      if (e.state && e.state.page) {
        setCurrentTab(e.state.page);
      } else {
        // If no state, we are at the very beginning. Exit app or fallback to home.
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentTab, isFullPlayerOpen]);

  // Tab change handler wrapping state pushing
  const handleTabChange = (tab: string) => {
    if (tab !== currentTab) {
      window.history.pushState({ page: tab }, '');
      setCurrentTab(tab);
    }
  };

  if (!isInitialized) {
    return (
      <div className="h-[100dvh] w-full bg-background flex items-center justify-center">
        <div className="text-primary font-bold animate-pulse">Loading Aura...</div>
      </div>
    );
  }

  const isVideo = currentSong?.mediaType === 'video';

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground overflow-hidden relative font-sans selection:bg-primary/30">
      {/* Switching Mode Progress Bar Overlay */}
      <AnimatePresence>
        {isSwitchingMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-background backdrop-blur-3xl"
          >
            <div className="w-64 flex flex-col items-center gap-6 text-center px-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <div className="space-y-4 w-full">
                <div className="h-1.5 w-full bg-surface-foreground/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.2, ease: "linear" }}
                    className="h-full bg-primary shadow-[0_0_15px_rgba(255,100,50,0.5)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                    {isVideoEnabled ? 'Audio Mode' : 'Video Mode'}
                  </p>
                  <p className="text-[10px] font-bold text-surface-foreground/40 uppercase tracking-widest">
                    Aura Syncing Engine...
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Main Content Area */}
      <main className="h-full w-full relative bg-background overflow-hidden font-sans">
        {currentTab === 'home' && <Home />}
        {currentTab === 'library' && <Library />}
        {currentTab === 'settings' && <Settings />}

        {/* Mini Player */}
        <AnimatePresence>
          {currentSongId && !isFullPlayerOpen && !isVideoUIOpen && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="contents"
            >
              <MiniPlayer 
                onClick={() => {
                  if (isVideo && isVideoEnabled) setIsVideoUIOpen(true);
                  else setIsFullPlayerOpen(true);
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <BottomNav currentTab={currentTab} onChangeTab={handleTabChange} />
      </main>

      {/* Audio/Video Engine */}
      <AudioEngine />

      {/* Player Overlays */}
      <AnimatePresence mode="wait">
        {isFullPlayerOpen && (!isVideo || !isVideoEnabled) && (
          <motion.div
            key="audio-player"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-[150] overflow-hidden bg-background"
          >
            <FullPlayer onClose={() => setIsFullPlayerOpen(false)} />
          </motion.div>
        )}
        
        {isVideoUIOpen && isVideo && isVideoEnabled && (
          <motion.div
            key="video-player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] overflow-hidden pointer-events-none"
          >
            <VideoPlayerOverlay />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
