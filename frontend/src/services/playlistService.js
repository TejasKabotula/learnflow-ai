import apiClient from './api';

export const playlistService = {
  getAllPlaylists: async () => {
    const response = await apiClient.get('/playlists/');
    return response.data;
  },

  getPlaylistById: async (playlistId) => {
    const response = await apiClient.get(`/playlists/${playlistId}`);
    return response.data;
  },

  importPlaylist: async (youtubeUrl, customTitle = undefined, category = undefined) => {
    const response = await apiClient.post('/playlists/import', {
      youtube_url: youtubeUrl,
      custom_title: customTitle,
      category: category,
    });
    return response.data;
  },

  addVideoToPlaylist: async (playlistId, youtubeUrl) => {
    const response = await apiClient.post(`/playlists/${playlistId}/add-video`, {
      youtube_url: youtubeUrl
    });
    return response.data;
  },

  deletePlaylist: async (playlistId) => {
    const response = await apiClient.delete(`/playlists/${playlistId}`);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await apiClient.get('/playlists/stats/summary');
    return response.data;
  },

  toggleVideoCompletion: async (playlistId, videoId) => {
    const response = await apiClient.post(`/playlists/${playlistId}/toggle-video/${videoId}`);
    return response.data;
  }
};
