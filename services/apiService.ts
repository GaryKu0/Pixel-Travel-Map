import authService from './authService';

// Auto-detect API URL - same domain/port as frontend
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = authService.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('API Request:', `${API_URL}${endpoint}`, options.method || 'GET');

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    console.log('API Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      const error = JSON.parse(errorText).catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Maps API
  async getMaps() {
    return this.request('/api/maps');
  }

  async getMap(mapId: number) {
    return this.request(`/api/maps/${mapId}`);
  }

  async createMap(name: string, isPublic = false) {
    return this.request('/api/maps', {
      method: 'POST',
      body: JSON.stringify({ name, is_public: isPublic })
    });
  }

  async updateMap(mapId: number, data: { name?: string; is_public?: boolean }) {
    return this.request(`/api/maps/${mapId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteMap(mapId: number) {
    return this.request(`/api/maps/${mapId}`, {
      method: 'DELETE'
    });
  }

  async exportMap(mapId: number) {
    return this.request(`/api/maps/${mapId}/export`);
  }

  async importMap(mapId: number, memories: any[], clearExisting = false) {
    return this.request(`/api/maps/${mapId}/import`, {
      method: 'POST',
      body: JSON.stringify({ memories, clearExisting })
    });
  }

  // Memories API
  async addMemory(data: {
    map_id: number;
    source_type: 'file' | 'text';
    source_data?: string;
    processed_image: string;
    lat: number;
    lng: number;
    width?: number;
    height?: number;
    content_bounds?: any;
    flipped_horizontally?: boolean;
    is_locked?: boolean;
    log_location?: string;
    log_date?: string;
    log_musings?: string;
    photos?: any[];
  }) {
    return this.request('/api/memories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateMemory(memoryId: number, data: any) {
    return this.request(`/api/memories/${memoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteMemory(memoryId: number) {
    return this.request(`/api/memories/${memoryId}`, {
      method: 'DELETE'
    });
  }

  async addPhotoToMemory(memoryId: number, photoData: string, filename?: string) {
    return this.request(`/api/memories/${memoryId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ photo_data: photoData, filename })
    });
  }

  async deletePhoto(photoId: number) {
    return this.request(`/api/memories/photos/${photoId}`, {
      method: 'DELETE'
    });
  }

  // Health check
  async checkHealth() {
    return this.request('/api/health');
  }
}

export const apiService = new ApiService();
export default apiService;