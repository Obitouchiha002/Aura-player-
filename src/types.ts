export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string; // Object URL for playback
  coverArt?: string; // Object URL
  coverArtBlob?: Blob; // Persistent blob
  file?: File; // Optional for online songs
  tags: string[]; // Love, Sad, Motivation, etc.
  playCount: number;
  lastPlayed?: number;
  lastPosition?: number; // Smart memory play
  lyrics?: string;
  isOnline?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'offline';
  mediaType?: 'audio' | 'video'; // To differentiate media
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  isSmart?: boolean;
}

export type Mood = "Night Vibes 🌙" | "Focus Mode ⚡" | "Alone Mode 💭" | "Energetic 🔥" | "Chill 🍃" | "Action 🔫" | "Comedy 😂" | "Sci-Fi 👽" | "Drama 🎭" | "Horror 👻";
