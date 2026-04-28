export const SPOTIFY_CLIENT_ID = '7aa34241b265d8614ffeb7ca6f0dc78c';
export const REDIRECT_URI = window.location.origin + '/';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'user-top-read',
  'user-read-recently-played'
];

export const getAuthUrl = () => {
  return `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(' '))}&response_type=token&show_dialog=true`;
};

export const getTokenFromUrl = () => {
  return window.location.hash
    .substring(1)
    .split('&')
    .reduce((initial: any, item) => {
      let parts = item.split('=');
      initial[parts[0]] = decodeURIComponent(parts[1]);
      return initial;
    }, {});
};

class SpotifyService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  get isReady() {
    return !!this.token;
  }

  async fetchApi(endpoint: string, options: RequestInit = {}) {
    if (!this.token) throw new Error('Spotify token not set');
    
    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token expired
        window.location.hash = '';
        window.location.reload();
      }
      throw new Error('Spotify API Error');
    }
    return res.json();
  }

  async getNewReleases() {
    return this.fetchApi('/browse/new-releases?limit=10');
  }

  async getFeaturedPlaylists() {
    return this.fetchApi('/browse/featured-playlists?limit=10');
  }

  async getRecommendations(seed_genres: string = 'chill,study') {
    return this.fetchApi(`/recommendations?seed_genres=${seed_genres}&limit=10`);
  }

  async search(query: string, type: string = 'track,artist,playlist', limit: number = 10) {
    if (!query) return null;
    return this.fetchApi(`/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
  }

  async getCategories() {
    return this.fetchApi('/browse/categories?limit=20');
  }
}

export const spotifyApi = new SpotifyService();
