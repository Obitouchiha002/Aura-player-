import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Plus, Music, Loader2, ChevronDown, Film, Clock } from 'lucide-react';
import * as jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { Mood, Song } from '../types';

const MOODS: Mood[] = ["Focus Mode ⚡", "Chill 🍃", "Energetic 🔥", "Night Vibes 🌙", "Alone Mode 💭"];
const VIDEO_GENRES: Mood[] = ["Action 🔫", "Comedy 😂", "Sci-Fi 👽", "Drama 🎭", "Horror 👻"];

export function Home() {
  const { songs, addSongs, setCurrentSong, setIsPlaying, currentSongId, currentMood, setMood, updateSongData, isVideoEnabled } = usePlayerStore();
  
  // Immersive filtering: only show items matching the current mode
  const displaySongs = songs.filter(s => isVideoEnabled ? s.mediaType === 'video' : s.mediaType === 'audio');
  
  const [greeting, setGreeting] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in Asia/Kolkata timezone
      const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      setCurrentTime(timeStr);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 60000); // Update once a minute

    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(isVideoEnabled ? 'Good Morning Cinema' : 'Good Morning');
      if (!currentMood) setMood(isVideoEnabled ? 'Action 🔫' : 'Focus Mode ⚡');
    } else if (hour < 18) {
      setGreeting(isVideoEnabled ? 'Matinee Selection' : 'Good Afternoon');
      if (!currentMood) setMood(isVideoEnabled ? 'Comedy 😂' : 'Chill 🍃');
    } else {
      setGreeting(isVideoEnabled ? 'Late Night Show' : 'Good Evening');
      if (!currentMood) setMood(isVideoEnabled ? 'Horror 👻' : 'Night Vibes 🌙');
    }
    
    return () => clearInterval(clockInterval);
  }, [isVideoEnabled, currentMood, setMood]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    const newSongs: Song[] = [];
    
    const readTags = (file: File): Promise<any> => {
      return new Promise((resolve) => {
        jsmediatags.read(file, {
          onSuccess: (tag) => resolve(tag),
          onError: (error) => {
            console.error('jsmediatags error:', error);
            resolve(null);
          }
        });
      });
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isMassImport = files.length > 5;
      
      if (isAudio || isVideo) {
        // Check for duplicates based on name and size
        const isDuplicate = songs.some(s => s.title === file.name.replace(/\.[^/.]+$/, "") && s.file?.size === file.size);
        if (isDuplicate) continue;

        if (isVideo) {
          newSongs.push({
            id: crypto.randomUUID(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Local Video',
            album: 'Videos',
            duration: 0,
            url: URL.createObjectURL(file), // Generate later
            file,
            tags: [],
            playCount: 0,
            mediaType: 'video'
          });
          continue;
        }

        if (isAudio) {
          let title = file.name.replace(/\.[^/.]+$/, "");
          let artist = 'Local Music';
          let album = 'Local Collection';
          let coverArt;
          let coverArtBlob;

          // Skip heavy ID3 parsing for mass imports to prevent freezing low memory devices
          if (!isMassImport) {
            try {
              const tag = await readTags(file);
              if (tag && tag.tags) {
                title = tag.tags.title || title;
                artist = tag.tags.artist || artist;
                album = tag.tags.album || album;

                const picture = tag.tags.picture;
                if (picture) {
                  const { data, format } = picture;
                  const byteArray = new Uint8Array(data);
                  
                  let mimeType = format;
                  if (format === 'JPG' || format === 'JPEG') mimeType = 'image/jpeg';
                  else if (format === 'PNG') mimeType = 'image/png';
                  else if (mimeType && !mimeType.includes('/')) mimeType = `image/${mimeType.toLowerCase()}`;
                  else if (!mimeType) mimeType = 'image/jpeg';

                  coverArtBlob = new Blob([byteArray], { type: mimeType });
                  coverArt = URL.createObjectURL(coverArtBlob);
                }
              }
            } catch (error) {
              console.error("Error parsing metadata for", file.name, error);
            }
          }

          newSongs.push({
            id: crypto.randomUUID(),
            title,
            artist,
            album,
            duration: 0,
            url: URL.createObjectURL(file),
            coverArt,
            coverArtBlob,
            file,
            tags: [],
            playCount: 0,
            mediaType: 'audio'
          });
        }
      }
    }
    
    addSongs(newSongs);
    setIsScanning(false);
  };

  const playSong = (id: string) => {
    triggerHaptic('medium');
    setCurrentSong(id);
    setIsPlaying(true);
    const song = songs.find(s => s.id === id);
    if (song?.mediaType === 'video' && isVideoEnabled) {
      usePlayerStore.getState().setIsVideoUIOpen(true);
    }
  };

  const recentlyPlayed = displaySongs.slice(0, 4); 

  return (
    <div className="px-6 pt-12 pb-32 h-full overflow-y-auto no-scrollbar">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center relative gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-bold tracking-widest">{currentTime}</span>
          </div>
          <h1 className="text-[32px] font-extrabold text-surface-foreground tracking-tight leading-none">{greeting}</h1>
          <p className="text-muted mt-2 font-medium text-sm">
            {isVideoEnabled ? "Which film to watch today?" : "Ready for some music?"}
          </p>
        </div>
        <div className="relative">
          <button 
            onClick={() => {
              triggerHaptic('light');
              setShowMoodSelector(!showMoodSelector);
            }}
            className="bg-primary/15 hover:bg-primary/25 transition-colors text-primary px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5"
          >
            {(currentMood || (isVideoEnabled ? "GENRE" : "MOOD")).toUpperCase()} <ChevronDown className="w-4 h-4 ml-1" />
          </button>
          
          {showMoodSelector && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface/95 backdrop-blur-xl border border-surface-foreground/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              {(isVideoEnabled ? VIDEO_GENRES : MOODS).map(m => (
                <button
                  key={m}
                  onClick={() => { 
                    triggerHaptic('medium');
                    setMood(m); 
                    setShowMoodSelector(false); 
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-foreground/5",
                    currentMood === m ? "text-primary bg-primary/5" : "text-surface-foreground"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        {isScanning ? (
          <div className="col-span-2 bg-surface rounded-[24px] p-6 flex flex-col items-center justify-center text-primary shadow-soft text-center border border-surface-foreground/5">
            <Loader2 className="w-8 h-8 mb-2 animate-spin" />
            <span className="font-semibold text-sm tracking-wide">Scanning Media...</span>
          </div>
        ) : (
          <>
            <label 
              onClick={() => triggerHaptic('medium')}
              className="bg-primary/10 hover:bg-primary/20 transition-colors rounded-[24px] p-6 flex flex-col items-center justify-center cursor-pointer text-primary shadow-soft text-center"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-semibold text-sm tracking-wide">Scan Entire Device</span>
              <span className="text-[10px] opacity-70 mt-1 font-medium">Auto-Load Folders</span>
              <input 
                type="file" 
                multiple 
                accept={isVideoEnabled ? "audio/*,video/*" : "audio/*"}
                className="hidden" 
                onChange={handleFileUpload}
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
              />
            </label>
            
            <label 
              onClick={() => triggerHaptic('medium')}
              className="bg-accent rounded-[24px] p-6 flex flex-col items-center justify-center text-surface-foreground cursor-pointer hover:bg-surface-foreground/5 transition-colors shadow-soft text-center"
            >
              <Music className="w-8 h-8 mb-2 opacity-80" />
              <span className="font-semibold text-sm tracking-wide">Select Files</span>
              <input 
                type="file" 
                multiple 
                accept={isVideoEnabled ? "audio/*,video/*" : "audio/*"}
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </>
        )}
      </div>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section>
          <h2 className="text-[14px] font-bold text-surface-foreground mb-4 uppercase tracking-[1px]">Recently Played</h2>
          <div className="space-y-3">
            {recentlyPlayed.map(song => (
              <div 
                key={song.id}
                className="flex items-center p-3 rounded-[20px] bg-surface shadow-soft hover:bg-surface-foreground/5 transition-colors cursor-pointer group border border-surface-foreground/5"
                onClick={() => playSong(song.id)}
              >
                <div className="w-12 h-12 rounded-xl bg-accent overflow-hidden relative flex-shrink-0">
                  {song.coverArt && !brokenImages[song.id] ? (
                    <div className="w-full h-full bg-black">
                      <img 
                        src={song.coverArt} 
                        alt={song.title} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenImages(prev => ({ ...prev, [song.id]: true }))}
                      />
                    </div>
                  ) : song.mediaType === 'video' ? (
                    <div className="w-full h-full bg-black relative">
                      <video src={`${song.url}#t=1`} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                       <Music className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                  </div>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <h3 className={cn("text-sm font-bold truncate tracking-tight", currentSongId === song.id ? "text-primary" : "text-surface-foreground")}>
                    {song.title}
                  </h3>
                  <p className="text-xs text-muted truncate mt-0.5">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
