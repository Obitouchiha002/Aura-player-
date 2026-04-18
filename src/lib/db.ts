import { get, set, clear } from 'idb-keyval';
import { Song } from '../types';

const SONGS_KEY = 'aura_songs';

export async function saveSongsToDB(songs: Song[]) {
  try {
    // Strip transient URLs before saving to prevent bugs and save space
    const storableSongs = songs.map(s => ({
      ...s,
      url: '',
      coverArt: '' 
    }));
    await set(SONGS_KEY, storableSongs);
  } catch (e) {
    console.error("Failed to save songs to DB", e);
  }
}

export async function loadSongsFromDB(): Promise<Song[]> {
  try {
    const stored = await get<Song[]>(SONGS_KEY);
    if (!stored) return [];
    
    // Recreate Object URLs for playback and cover art from the stored Blobs
    return stored.map(s => {
      let url = s.url || '';
      let coverArt = s.coverArt || '';

      if (s.file) {
        try {
          url = URL.createObjectURL(s.file);
        } catch (err) {
          console.error("Failed to create object URL for file", err);
        }
      }

      if (s.coverArtBlob) {
        try {
          coverArt = URL.createObjectURL(s.coverArtBlob);
        } catch (err) {
          console.error("Failed to create object URL for cover art", err);
        }
      }

      return {
        ...s,
        url,
        coverArt
      };
    });
  } catch (e) {
    console.error("Failed to load songs from DB", e);
    return [];
  }
}

export async function clearDB() {
  try {
    await clear();
  } catch (e) {
    console.error("Failed to clear DB", e);
  }
}
