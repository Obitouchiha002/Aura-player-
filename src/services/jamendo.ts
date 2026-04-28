const CLIENT_ID = '7193b0c8';
const BASE_URL = 'https://api.jamendo.com/v3.0';

export class JamendoService {
  async fetchApi(endpoint: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams({
      client_id: CLIENT_ID,
      format: 'json',
      ...params
    });
    
    // Add fuzzy parameter for search to make it more tolerant
    if (params.namesearch) {
      query.set('fuzzyterms', 'true');
    }
    
    const res = await fetch(`${BASE_URL}${endpoint}?${query.toString()}`);
    if (!res.ok) throw new Error('Jamendo API request failed');
    return res.json();
  }

  async getTrendingTracks(limit = 10) {
    return this.fetchApi('/tracks/', {
      limit: limit.toString(),
      boost: 'popularity_week',
      include: 'musicinfo'
    });
  }

  async getRecommendations(tags: string = 'chill', limit = 10) {
    return this.fetchApi('/tracks/', {
      limit: limit.toString(),
      tags: tags,
      boost: 'popularity_month',
      include: 'musicinfo'
    });
  }

  async getFeaturedPlaylists(limit = 4) {
    return this.fetchApi('/playlists/', {
      limit: limit.toString()
    });
  }

  async getPlaylistTracks(playlistId: string | number, limit = 10) {
    return this.fetchApi('/playlists/tracks/', {
      id: playlistId.toString(),
      limit: limit.toString()
    });
  }

  async searchTracks(query: string, limit = 20) {
    return this.fetchApi('/tracks/', {
      limit: limit.toString(),
      namesearch: query,
      include: 'musicinfo'
    });
  }
}

// Ensure same export
export const jamendoApi = new JamendoService();
