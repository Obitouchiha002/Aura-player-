import React, { useState, useEffect } from 'react';
import { Moon, Sun, Shield, Database, Info, Vibrate, Play } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { triggerHaptic } from '../lib/haptics';
import { cn } from '../lib/utils';

export function Settings() {
  const { 
    isDarkMode, toggleDarkMode, 
    hapticsEnabled, toggleHaptics, 
    hapticIntensity, setHapticIntensity,
    isVideoEnabled, switchVideoMode,
    clearData 
  } = usePlayerStore();

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
