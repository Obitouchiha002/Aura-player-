import React, { useState, useEffect } from 'react';
import { Moon, Sun, Shield, Database, Info, Vibrate, Play, MoonStar, Clock, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

export function Settings() {
  const { 
    isDarkMode, toggleDarkMode, 
    hapticsEnabled, toggleHaptics, 
    hapticIntensity, setHapticIntensity,
    isVideoEnabled, switchVideoMode,
    clearData,
    sleepTimerEndTime, setSleepTimer
  } = usePlayerStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      if (Math.floor(scrollPos / 300) !== Math.floor((window as any).lastScrollPosSet / 300)) {
        triggerHaptic('light');
      }
      (window as any).lastScrollPosSet = scrollPos;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!sleepTimerEndTime) return;
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  const handleToggleDarkMode = () => {
    triggerHaptic('light');
    toggleDarkMode();
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    if (!hapticsEnabled) {
      setTimeout(() => triggerHaptic('medium'), 50);
    }
  };

  const handleSetIntensity = (intensity: 'light' | 'medium' | 'heavy') => {
    setHapticIntensity(intensity);
    triggerHaptic(intensity);
  };

  return (
    <div className="px-6 pt-12 pb-32 h-full overflow-y-auto no-scrollbar">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-surface-foreground tracking-tight">Settings</h1>
        </header>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-surface-foreground/50 uppercase tracking-wider mb-3 ml-2">Appearance</h2>
          <div className="bg-surface rounded-3xl p-2 shadow-sm border border-surface-foreground/5">
            <div className="flex items-center justify-between p-4 border-b border-surface-foreground/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <span className="font-medium text-surface-foreground">Dark Mode</span>
              </div>
              <button 
                onClick={handleToggleDarkMode}
                className={`w-12 h-7 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary' : 'bg-surface-foreground/20'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border-b border-surface-foreground/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                  <Play className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-foreground">Enable Video Player Mode</span>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  switchVideoMode();
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${isVideoEnabled ? 'bg-primary' : 'bg-surface-foreground/20'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${isVideoEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            
            <div className="flex flex-col p-4 border-b border-surface-foreground/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                    <MoonStar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-surface-foreground block">Sleep Timer</span>
                    <span className="text-xs text-surface-foreground/50">Stop music automatically</span>
                  </div>
                </div>
                <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                  {sleepTimerEndTime && sleepTimerEndTime > now ? `${Math.ceil((sleepTimerEndTime - now)/60000)}m left` : "Off"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {[15, 30, 45, 60].map((mins) => {
                  const isActive = sleepTimerEndTime && Math.abs(sleepTimerEndTime - now - mins * 60000) < 60000;
                  return (
                    <button
                      key={mins}
                      onClick={() => { triggerHaptic('medium'); setSleepTimer(mins); }}
                      className={cn(
                        "flex-1 min-w-[60px] py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95",
                        isActive
                          ? "bg-primary text-white shadow-md scale-105" 
                          : "bg-accent text-surface-foreground hover:bg-surface-foreground/10"
                      )}
                    >
                      {mins}m
                    </button>
                  );
                })}
                <button
                  onClick={() => { triggerHaptic('medium'); setSleepTimer(null); }}
                  className={cn(
                    "flex-1 min-w-[60px] py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95",
                    !sleepTimerEndTime
                      ? "bg-red-500 text-white shadow-md scale-105" 
                      : "bg-accent text-red-500 hover:bg-red-500/10"
                  )}
                >
                  Off
                </button>
              </div>
              <div className="mt-3 relative group overflow-hidden rounded-xl border border-surface-foreground/5 bg-accent hover:bg-surface-foreground/5 transition-all duration-300">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 text-surface-foreground/70 group-hover:text-primary transition-colors">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Set Exact Time</span>
                  </div>
                  <div className="flex items-center gap-1 relative z-10 w-24 justify-end">
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
                        const diffMinutes = Math.ceil((targetTime.getTime() - Date.now()) / 60000);
                        setSleepTimer(diffMinutes);
                      }}
                      className="bg-transparent text-sm font-bold text-surface-foreground group-hover:text-primary transition-colors outline-none border-none cursor-pointer w-full text-right p-0 relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <ChevronRight className="w-4 h-4 text-surface-foreground/40 group-hover:text-primary transition-colors pointer-events-none" />
                  </div>
                </div>
                {/* Background glow effect on hover */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>
            
            <div className="flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                    <Vibrate className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-surface-foreground">Haptics & Vibration</span>
                </div>
                <button 
                  onClick={handleToggleHaptics}
                  className={`w-12 h-7 rounded-full transition-colors relative ${hapticsEnabled ? 'bg-primary' : 'bg-surface-foreground/20'}`}
                >
                  <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${hapticsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {hapticsEnabled && (
                <div className="flex gap-2 mt-2">
                  {(['light', 'medium', 'heavy'] as const).map((intensity) => (
                    <button
                      key={intensity}
                      onClick={() => handleSetIntensity(intensity)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                        hapticIntensity === intensity 
                          ? "bg-primary text-white shadow-md scale-105" 
                          : "bg-accent text-surface-foreground hover:bg-surface-foreground/10"
                      )}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-surface-foreground/50 uppercase tracking-wider mb-3 ml-2">Privacy & Data</h2>
          <div className="bg-surface rounded-3xl p-2 shadow-sm border border-surface-foreground/5">
            <div 
              onClick={() => {
                triggerHaptic('light');
              }}
              className="flex items-center justify-between p-4 hover:bg-surface-foreground/5 rounded-2xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-foreground">Private Mode</span>
              </div>
            </div>
            <div 
              onClick={() => {
                triggerHaptic('heavy');
                clearData();
              }}
              className="flex items-center justify-between p-4 hover:bg-surface-foreground/5 rounded-2xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                  <Database className="w-5 h-5" />
                </div>
                <span className="font-medium text-surface-foreground">Clear Local Data</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-surface-foreground/50 uppercase tracking-wider mb-3 ml-2">About</h2>
          <div className="bg-surface rounded-3xl p-2 shadow-sm border border-surface-foreground/5">
            <div 
              onClick={() => triggerHaptic('light')}
              className="flex items-center justify-between p-4 hover:bg-surface-foreground/5 rounded-2xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-xl text-surface-foreground">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium text-surface-foreground block">Aura Music Player</span>
                  <span className="text-xs text-surface-foreground/50">Version 1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
