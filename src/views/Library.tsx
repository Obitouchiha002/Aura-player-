import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, Search, Filter, MoreVertical, Plus, ListMusic, Trash2, Music, Cloud, CloudOff, WifiOff, Loader2, CheckCircle2, Film } from 'lucide-react';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';

const SyncIndicator = ({ status }: { status?: Song['syncStatus'] }) => {
  switch (status) {
    case 'synced':
      return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    case 'syncing':
      return <Loader2 className="w-3 h-3 text-primary animate-spin" />;
    case 'offline':
      return <WifiOff className="w-3 h-3 text-muted" />;
    default:
      return <Cloud className="w-3 h-3 text-muted/40" />;
  }
};

const AVAILABLE_TAGS = ['Happy 😊', 'Sad 😢', 'Nostalgic 🕰️', 'Energetic 🔥', 'Chill 🍃', 'Focus 🧠'];

export function Library() {
  const { songs, playlists, setCurrentSong, setIsPlaying, currentSongId, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, deleteSong, deleteSongs, setIsVideoUIOpen, isVideoEnabled } = usePlayerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [songMenuOpen, setSongMenuOpen] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedSongIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSongIds(newSelected);
    if (newSelected.size === 0) setIsSelectionMode(false);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedSongIds(new Set());
  };

  const deleteSelected = () => {
    deleteSongs(Array.from(selectedSongIds));
    exitSelectionMode();
  };

  const deleteDuplicates = () => {
    const seenTitles = new Set<string>();
    const toDelete: string[] = [];
    
    [...songs].forEach(song => {
      const isCorrectType = isVideoEnabled ? song.mediaType === 'video' : song.mediaType === 'audio';
      if (!isCorrectType) return;
      
      const titleKey = song.title.toLowerCase().trim();
      if (seenTitles.has(titleKey)) {
        toDelete.push(song.id);
      } else {
        seenTitles.add(titleKey);
      }
    });
    
    if (toDelete.length > 0) {
      deleteSongs(toDelete);
      triggerHaptic('heavy');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      if (Math.floor(scrollPos / 300) !== Math.floor((window as any).lastScrollPosLib / 300)) {
        triggerHaptic('light');
      }
      (window as any).lastScrollPosLib = scrollPos;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredSongs = songs.filter(song => {
    // Immersive mode: strictly show only matching media type
    if (isVideoEnabled) {
      if (song.mediaType !== 'video') return false;
    } else {
      if (song.mediaType !== 'audio') return false;
    }

    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          song.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? (song.tags || []).includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const playSong = (id: string) => {
    triggerHaptic('medium');
    setCurrentSong(id);
    setIsPlaying(true);
    const song = songs.find(s => s.id === id);
    if (song?.mediaType === 'video') {
      setIsVideoUIOpen(true);
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewPlaylistInput(false);
    }
  };

  const activePlaylistData = playlists.find(p => p.id === activePlaylist);
  const displaySongs = activePlaylistData 
    ? songs.filter(s => activePlaylistData.songIds.includes(s.id))
    : filteredSongs;

  return (
    <div className="px-6 pt-12 pb-32 h-full flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col h-full">
        <header className="mb-6 flex-shrink-0 flex justify-between items-end">
          {isSelectionMode ? (
            <div className="flex items-center gap-4">
              <button onClick={exitSelectionMode} className="text-sm font-bold text-surface-foreground">Cancel</button>
              <span className="text-sm font-bold text-primary">{selectedSongIds.size} Selected</span>
              <button onClick={deleteSelected} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-surface-foreground tracking-tight">Library</h1>
              <div className="flex gap-4 border-b border-surface-foreground/10 pb-1">
                <button 
                  onClick={() => { 
                    triggerHaptic('light');
                    setActiveTab('songs'); 
                    setActivePlaylist(null); 
                  }}
                  className={cn("text-sm font-bold transition-colors pb-1 border-b-2", activeTab === 'songs' && !activePlaylist ? "text-primary border-primary" : "text-surface-foreground/50 border-transparent hover:text-surface-foreground")}
                >
                  Songs
                </button>
                <button 
                  onClick={() => { 
                    triggerHaptic('light');
                    setActiveTab('playlists'); 
                    setActivePlaylist(null); 
                  }}
                  className={cn("text-sm font-bold transition-colors pb-1 border-b-2", activeTab === 'playlists' || activePlaylist ? "text-primary border-primary" : "text-surface-foreground/50 border-transparent hover:text-surface-foreground")}
                >
                  Playlists
                </button>
                <button 
                  onClick={() => {
                    triggerHaptic('heavy');
                    deleteDuplicates();
                  }}
                  className="text-sm font-bold text-surface-foreground/50 border-b-2 border-transparent hover:text-red-500 transition-colors pb-1"
                >
                  Duplicates
                </button>
              </div>
            </>
          )}
        </header>

        {activeTab === 'songs' && !activePlaylist && (
          <>
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-foreground/40" />
              <input 
                type="text"
                placeholder="Find in library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-surface-foreground/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow shadow-sm"
              />
            </div>

            {/* Tag Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2 flex-shrink-0">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedTag(null);
                }}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
                  selectedTag === null ? "bg-primary text-white" : "bg-surface-foreground/5 text-surface-foreground hover:bg-surface-foreground/10"
                )}
              >
                All
              </button>
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedTag(tag === selectedTag ? null : tag);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
                    selectedTag === tag ? "bg-primary text-white" : "bg-surface-foreground/5 text-surface-foreground hover:bg-surface-foreground/10"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Playlists View */}
        {activeTab === 'playlists' && !activePlaylist && (
          <div className="flex-1 overflow-y-auto no-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
            <div className="mb-6">
              {!showNewPlaylistInput ? (
                <button 
                  onClick={() => {
                    triggerHaptic('light');
                    setShowNewPlaylistInput(true);
                  }}
                  className="flex items-center gap-3 text-primary font-bold hover:opacity-80 transition-opacity p-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  Create Playlist
                </button>
              ) : (
                <form onSubmit={(e) => {
                  triggerHaptic('medium');
                  handleCreatePlaylist(e);
                }} className="flex gap-2 items-center p-2">
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    className="flex-1 bg-surface border border-surface-foreground/10 rounded-xl py-2 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">Save</button>
                  <button type="button" onClick={() => {
                    triggerHaptic('light');
                    setShowNewPlaylistInput(false);
                  }} className="px-4 py-2 bg-surface-foreground/5 text-surface-foreground rounded-xl text-sm font-bold">Cancel</button>
                </form>
              )}
            </div>

            {playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-surface-foreground/50 py-12">
                <ListMusic className="w-12 h-12 mb-4 opacity-50" />
                <p>No playlists yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {playlists.map(playlist => (
                  <div 
                    key={playlist.id} 
                    className="group cursor-pointer"
                    onClick={() => {
                      triggerHaptic('medium');
                      setActivePlaylist(playlist.id);
                    }}
                  >
                    <div className="aspect-square rounded-2xl bg-surface border border-surface-foreground/10 flex items-center justify-center mb-3 group-hover:border-primary/50 transition-colors relative overflow-hidden shadow-sm">
                      {playlist.songIds.length > 0 ? (
                        <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                          {playlist.songIds.slice(0, 4).map((id, i) => {
                            const song = songs.find(s => s.id === id);
                            return (
                              <div key={i} className="w-full h-full bg-accent flex items-center justify-center text-surface-foreground/30">
                                <Music className="w-4 h-4" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <ListMusic className="w-10 h-10 text-surface-foreground/20" />
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                    </div>
                    <h3 className="font-bold text-surface-foreground truncate">{playlist.name}</h3>
                    <p className="text-xs text-surface-foreground/60">{playlist.songIds.length} songs</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Songs List (for both All Songs and Active Playlist) */}
        {(activeTab === 'songs' || activePlaylist) && (
          <div className="flex-1 overflow-y-auto no-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
            {activePlaylist && activePlaylistData && (
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-surface-foreground">{activePlaylistData.name}</h2>
                  <p className="text-sm text-surface-foreground/60">{activePlaylistData.songIds.length} songs</p>
                </div>
                <button 
                  onClick={() => {
                    triggerHaptic('heavy');
                    if (confirm('Are you sure you want to delete this playlist?')) {
                      deletePlaylist(activePlaylist);
                      setActivePlaylist(null);
                      setActiveTab('playlists');
                    }
                  }}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}

            {displaySongs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-surface-foreground/50 py-12">
                <p>{activePlaylist ? "This playlist is empty." : "No songs found."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {displaySongs.map((song) => (
                    <motion.div 
                      key={song.id}
                      initial={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex items-center p-2 rounded-2xl hover:bg-surface-foreground/5 transition-colors group relative select-none", 
                        isSelectionMode && selectedSongIds.has(song.id) && "bg-primary/10"
                      )}
                    style={{ 
                      WebkitTouchCallout: 'none', 
                      WebkitUserSelect: 'none', 
                      userSelect: 'none',
                      zIndex: songMenuOpen === song.id ? 50 : 1
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setIsSelectionMode(true);
                      toggleSelection(song.id);
                    }}
                    onTouchStart={() => {
                      const timer = setTimeout(() => {
                        setIsSelectionMode(true);
                        toggleSelection(song.id);
                        triggerHaptic('heavy');
                      }, 1000); // Changed to 1000ms (1 second) for better UX
                      (window as any).longPressTimer = timer;
                    }}
                    onTouchMove={() => clearTimeout((window as any).longPressTimer)}
                    onTouchEnd={() => clearTimeout((window as any).longPressTimer)}
                    onTouchCancel={() => clearTimeout((window as any).longPressTimer)}
                  >
                    {isSelectionMode && (
                      <input 
                        type="checkbox" 
                        checked={selectedSongIds.has(song.id)}
                        onChange={() => toggleSelection(song.id)}
                        className="mr-4 w-5 h-5 accent-primary"
                      />
                    )}
                    <div 
                      className="w-12 h-12 rounded-xl bg-accent overflow-hidden relative flex-shrink-0 cursor-pointer shadow-sm"
                      onClick={() => isSelectionMode ? toggleSelection(song.id) : playSong(song.id)}
                    >
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
                    
                    <div 
                      className="ml-4 flex-1 min-w-0 cursor-pointer"
                      onClick={() => playSong(song.id)}
                    >
                      <h3 className={cn("text-sm font-semibold truncate", currentSongId === song.id ? "text-primary" : "text-surface-foreground")}>
                        {song.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-surface-foreground/60 truncate">{song.artist}</p>
                        <SyncIndicator status={song.syncStatus} />
                      </div>
                      {song.tags && song.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 overflow-hidden">
                          {song.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                              {tag}
                            </span>
                          ))}
                          {song.tags.length > 3 && <span className="text-[9px] px-1.5 py-0.5 bg-surface-foreground/5 rounded-full">+{song.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        triggerHaptic('light');
                        setSongMenuOpen(songMenuOpen === song.id ? null : song.id);
                      }}
                      className="p-2 text-surface-foreground/40 hover:text-surface-foreground transition-colors relative z-20"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Song Context Menu */}
                    {songMenuOpen === song.id && (
                      <div className="absolute right-2 top-0 mt-2 w-48 bg-surface border border-surface-foreground/10 rounded-xl shadow-2xl z-[100] py-1 animate-in fade-in zoom-in-95 slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                        <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setSongMenuOpen(null); }} />
                        {activePlaylist ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('medium');
                              removeSongFromPlaylist(activePlaylist, song.id);
                              setSongMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-surface-foreground/5"
                          >
                            Remove from Playlist
                          </button>
                        ) : (
                          <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('heavy');
                              deleteSong(song.id);
                              setSongMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-surface-foreground/5"
                          >
                            Delete Song
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('heavy');
                              const targetTitle = song.title.toLowerCase().trim();
                              const sameNameSongs = songs.filter(s => s.title.toLowerCase().trim() === targetTitle);
                              if (sameNameSongs.length > 1) {
                                // Keep the first one, delete the rest
                                const toDelete = sameNameSongs.slice(1).map(s => s.id);
                                deleteSongs(toDelete);
                              }
                              setSongMenuOpen(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-surface-foreground/5"
                          >
                            Delete Duplicates
                          </button>
                          </>
                        )}
                        {!activePlaylist && (
                          <>
                            <div className="px-4 py-1 text-xs font-bold text-surface-foreground/50 uppercase tracking-wider">Add to Playlist</div>
                            {playlists.length === 0 ? (
                              <div className="px-4 py-2 text-sm text-surface-foreground/50">No playlists</div>
                            ) : (
                              playlists.map(p => (
                                <button 
                                  key={p.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic('medium');
                                    addSongToPlaylist(p.id, song.id);
                                    setSongMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-surface-foreground hover:bg-surface-foreground/5 truncate"
                                >
                                  {p.name}
                                </button>
                              ))
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
